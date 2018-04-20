import './style.css';

import safeEval from './eval';
const pretty = require('js-object-pretty-print').pretty;

const ace = require('ace-builds');
require("ace-builds/src-min-noconflict/mode-javascript")

let game = {
  saveVersion: 1,
  resources: <any>{
    ax: {
      value: 0,
      max: 4,
    },
    bx: {
      value: 0,
      max: 4,
    }
  },
  incrementers: {
    ax: {
      quantity: 0,
      nextCost: {
        ax: 0,
      }
    },
    bx: {
      quantity: 0,
      nextCost: {
        ax: 0,
        bx: 0,
      }
    },
  },
  upgrades: {
    axWidth: {
      name: "AX Register Width",
      cost: <any>{
        ax: 3,
      },
      apply: () => {
        game.resources.ax.max *= 2;
      },
      increaseCost: () => {
        for (const resource in game.upgrades.axWidth.cost) {
          game.upgrades.axWidth.cost[resource] *= 2;
        }
      }
    },
    bxWidth: {
      name: "BX Register Width",
      cost: <any>{
        ax: 6,
        bx: 3,
      },
      apply: () => {
        game.resources.bx.max *= 2;
      },
      increaseCost: () => {
        for (const resource in game.upgrades.bxWidth.cost) {
          game.upgrades.bxWidth.cost[resource] *= 2;
        }
      }
    }
  },
  code: <string> "",
  computerPurchased: false,
};

const tickSpeed = 200;
setTimeout(tick, tickSpeed);

let lastTime = 0;

function tick() {
  const t = performance.now();

  incrementRegisters();

  const variables = getCodeVariables();
  const functions = getCodeFunctions();
  document.getElementById("state").textContent = pretty(variables);
  document.getElementById("functions").textContent = pretty(functions);
  if (game.code) {
    try {
      const start = performance.now();
      safeEval(game.code, variables, pretty(functions, 2, null, true), (err: any, result: any) => {
        const end = performance.now();
        console.log(`Execution time: ${end-start}`);
        if (err) {
          log(err);
          game.code = null;
        } else {
          const actions = JSON.parse(result.answer);
          for(const a of actions) {
            if (a === "buyAXWidthUpgrade") {
              increaseAXWidth();
            }
            if (a === "buyAXIncrementer") {
              buyAXIncrementer();
            }
          }
          log(result.log);
        }
        setTimeout(tick, tickSpeed);
      });
    } catch (e) {
      log(e);
      game.code = null;
      setTimeout(tick, tickSpeed);
    }
  } else {
    setTimeout(tick, tickSpeed);
  }

  lastTime = t;

  updateRegisters();
}


function getCodeVariables() {
  const obj = <any>{};
  obj.ax = game.resources.ax.value;
  obj.axMax = game.resources.ax.max;
  obj.bx = game.resources.bx.value;
  obj.bxMax = game.resources.bx.max;
  obj.nextAXWidthCost = game.upgrades.axWidth.cost;
  obj.nextAXIncrementerCost = game.incrementers.ax.nextCost.ax;
  return obj;
}

// This isn't actually used, it's just here to suppress
// the typescript errors raised by the functions.
declare const _hidden_return_value: string[];

function getCodeFunctions() {
  const obj = <any>{};
  // Newlines are important here for the pretty-printer to work properly!
  obj.log = function (object:object) {
    console.log(object);
  };
  obj.buyAXWidthUpgrade = function () {
    _hidden_return_value.push("buyAXWidthUpgrade");
  };
  obj.buyAXIncrementer = function () {
    _hidden_return_value.push("buyAXIncrementer");
  };
  return obj;
}

function log (msg: string) {
  if (!msg) {
    return;
  }
  const div = document.createElement("div");
  div.textContent = `${new Date().toString()}: ${msg}`;
  const log = document.getElementById("log");
  log.appendChild(div);
  log.scrollTo(100000, 100000);
}

function incrementRegisters() {
  const axRate = game.incrementers.ax.quantity;

  const axCapacity = game.resources.ax.max;
  const bxCapacity = game.resources.bx.max;

  game.resources.ax.value += axRate;
  if (game.resources.ax.value >= axCapacity + 1) {
    game.resources.bx.value = game.resources.bx.value + Math.floor(game.resources.ax.value / axCapacity);
    game.resources.ax.value = game.resources.ax.value % (axCapacity + 1);
  }

  if (game.resources.bx.value >= bxCapacity + 1) {
    game.resources.bx.value = game.resources.bx.value % (bxCapacity + 1);
  }
}

function increaseAXWidth() {
  for (const resource in game.upgrades.axWidth.cost) {
    if ((<any>game.resources)[resource].value < game.upgrades.axWidth.cost[resource]) {
      return;
    }
  }

  for (const resource in game.upgrades.axWidth.cost) {
    (<any>game.resources)[resource].value -= game.upgrades.axWidth.cost[resource];
  }

  game.upgrades.axWidth.apply();
  game.upgrades.axWidth.increaseCost();
  updateAXWidth();
}

function buyAXIncrementer() {
  if (game.resources.ax.value < game.incrementers.ax.nextCost.ax) {
    return;
  }

  game.resources.ax.value -= game.incrementers.ax.nextCost.ax;
  game.incrementers.ax.quantity += 1;
  game.incrementers.ax.nextCost.ax = game.incrementers.ax.quantity === 1 ? 4 : game.incrementers.ax.nextCost.ax * Math.ceil(1.01 + Math.random() * 0.2);
  updateAXIncrementers();
}

function initializeDOM() {
  document.getElementById("build-a").onclick = () => increaseAXWidth();
  document.getElementById("speed-a").onclick = () => buyAXIncrementer();
  document.getElementById("run").onclick = runCode;
  updateAXWidth();
  updateAXIncrementers();
  updateRegisters();

  const editor = ace.edit("editor");
  //editor.setTheme("ace/theme/twilight");
  editor.session.setMode("ace/mode/javascript");
}

function updateAXIncrementers () {
  document.getElementById("speed-a").textContent = `Purchase incrementer (${renderCost(game.incrementers.ax.nextCost)})`;
}

function updateAXWidth () {
  document.getElementById("build-a").textContent = `Increase register width (${renderCost(game.upgrades.axWidth.cost)})`;
}

function updateRegisters() {
  document.getElementById("ax").textContent = `${game.resources.ax.value} / ${game.resources.ax.max}`;
  document.getElementById("bx").textContent = `${game.resources.bx.value} / ${game.resources.bx.max}`;
}

function runCode() {
  game.code = ace.edit("editor").getValue();
}

function renderCost(cost: any) {
  return Object.keys(cost).map(x => `${x}:${cost[x]}`).join(", ");
}

initializeDOM();