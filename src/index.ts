import './style.css';

import safeEval from './eval';
const ace = require('ace-builds');
require("ace-builds/src-min-noconflict/mode-javascript")

export interface IGame {
  resources: IResources,
  upgrades: any,
  code: string,
}

interface IResources {
  a: IResource,
  b: IResource,
  c: IResource,
}

export interface Cost {
  resource: string,
  amount: number,
}

interface IUpgrade {
  id: string,
  cost: Cost[],
}

export interface IResource {
  currentAmount: number,
  capacity: number,
  unlocked: boolean,
}

let game : IGame = {
  resources: {
    a: {
      currentAmount: 0,
      capacity: 4,
      unlocked: true,
    },
    b: {
      currentAmount: 0,
      capacity: 4,
      unlocked: false,
    },
    c: {
      currentAmount: 0,
      capacity: 4,
      unlocked: false,
    }
  },
  upgrades: {
    maxA: 0,
    rateA: 0,
    maxB: 0,
    rateB: 0,
    maxC: 0,
    rateC: 0,
  },
  code: <string> "",
};

setTimeout(tick, 100);

let num = 0;
let lastTime = 0;

function tick() {
  const t = performance.now();
  const dt = (t - lastTime) / 1000;
  updateResources(dt);

  if (game.code) {
    try {
      safeEval(game.code, (err: any, result: any) => {
        if (err) {
          throw err;
        } else {
          log(result.answer);
        }
        setTimeout(tick, 100);
      }, game);
    } catch (e) {
      log(e);
    }
  } else {
    setTimeout(tick, 100);
  }

  lastTime = t;

  updateDOM();
}

function log (msg: string) {
  const div = document.createElement("div");
  div.innerHTML = `${new Date().toString()}: ${msg}`;
  const log = document.getElementById("log");
  log.appendChild(div);
  log.scrollTo(100000, 100000);
}

function updateResources(dt: number) {
  game.resources.a.currentAmount += game.upgrades.rateA * dt;
  if (game.resources.a.currentAmount >= game.resources.a.capacity + 1) {
    game.resources.a.currentAmount = 0;
  }
}

function build() {
  const cost = 2 * Math.pow(2, game.upgrades.maxA);
  if (game.resources.a.currentAmount < cost) {
    return;
  }

  game.upgrades.maxA += 1;
  game.resources.a.capacity *= 2;
  game.resources.a.currentAmount -= cost;
  const nextCost = cost * 2;

  document.getElementById("build-a").innerHTML = `Build (${nextCost.toFixed(1)})`;
}

function speed() {
  const cost = game.upgrades.rateA === 0 ? 0 : Math.ceil(10 * Math.pow(1.1, game.upgrades.rateA));
  if (game.resources.a.currentAmount < cost) {
    return;
  }

  game.upgrades.rateA += 1;
  game.resources.a.currentAmount -= cost;
  updateSpeedA();
}

function initializeDOM() {
  document.getElementById("build-a").onclick = () => build();
  document.getElementById("speed-a").onclick = () => speed();
  document.getElementById("run").onclick = runCode;
  updateSpeedA();

  const editor = ace.edit("editor");
  //editor.setTheme("ace/theme/twilight");
  editor.session.setMode("ace/mode/javascript");
}

function updateSpeedA () {
  const nextCost = game.upgrades.rateA === 0 ? 0 : Math.ceil(10 * Math.pow(1.1, game.upgrades.rateA));
  document.getElementById("speed-a").innerHTML = `Purchase incrementer (${nextCost.toFixed(1)})`;
}

function updateDOM() {
  document.getElementById("a").innerHTML = `${game.resources.a.currentAmount} / ${game.resources.a.capacity}`;
}

function runCode() {
  game.code = ace.edit("editor").getValue();
}

initializeDOM();