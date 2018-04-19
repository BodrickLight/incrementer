import './style.css';

import safeEval from './eval';
const pretty = require('js-object-pretty-print').pretty;
import { Decimal } from 'decimal.js-light';

const ace = require('ace-builds');
require("ace-builds/src-min-noconflict/mode-javascript")

let game = {
  registers: {
    ax: new Decimal(0),
    bx: new Decimal(0),
  },
  incrementers: {
    ax: {
      quantity: new Decimal(0),
      nextCost: {
        ax: new Decimal(0),
      }
    },
    bx: {
      quantity: new Decimal(0),
      nextCost: {
        ax: new Decimal(0),
        bx: new Decimal(0),
      }
    },
  },
  registerWidthUpgrades: {
    ax: new Decimal(2),
    bx: new Decimal(0),
  },
  code: <string> "",
  computerPurchased: false,
};

const tickSpeed = 200;
setTimeout(tick, tickSpeed);

let lastTime = 0;

function tick() {
  const t = performance.now();
  const cycles = (t - lastTime) / 200;

  incrementAX(cycles);

  const axCapacity = getAXMaxValue();
  if (game.registers.ax.greaterThanOrEqualTo(axCapacity.add(1))) {
    game.registers.ax = game.registers.ax.modulo(axCapacity.add(1));
  }

  const variables = getCodeVariables();
  const functions = getCodeFunctions();
  document.getElementById("state").innerHTML = pretty(variables);
  document.getElementById("functions").innerHTML = pretty(functions);
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
          console.log(actions);
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

  updateAXRegister();
}


function getCodeVariables() {
  const obj = <any>{};
  obj.ax = game.registers.ax.toDecimalPlaces(0, Decimal.ROUND_DOWN).toNumber();
  obj.axMax = getAXMaxValue().toDecimalPlaces(0, Decimal.ROUND_DOWN).toNumber();
  obj.nextAXWidthCost = getNextAXRegisterWidthCost().toDecimalPlaces(0, Decimal.ROUND_DOWN).toNumber();
  obj.nextAXIncrementerCost = game.incrementers.ax.nextCost.ax.toDecimalPlaces(0, Decimal.ROUND_DOWN).toNumber();
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
  div.innerHTML = `${new Date().toString()}: ${msg}`;
  const log = document.getElementById("log");
  log.appendChild(div);
  log.scrollTo(100000, 100000);
}

function incrementAX(cycles: number) {
  const axRate = game.incrementers.ax.quantity;
  const delta = axRate.times(cycles);
  game.registers.ax = game.registers.ax.add(delta);
}


function increaseAXWidth() {
  const cost = getNextAXRegisterWidthCost();
  if (game.registers.ax.lessThan(cost)) {
    return;
  }

  game.registerWidthUpgrades.ax = game.registerWidthUpgrades.ax.add(1);
  game.registers.ax = game.registers.ax.minus(cost);

  updateAXWidth();
}

function buyAXIncrementer() {
  if (game.registers.ax.lessThan(game.incrementers.ax.nextCost.ax)) {
    return;
  }

  game.registers.ax = game.registers.ax.minus(game.incrementers.ax.nextCost.ax);
  game.incrementers.ax.quantity = game.incrementers.ax.quantity.add(1);
  game.incrementers.ax.nextCost.ax = game.incrementers.ax.quantity.equals(1) ? new Decimal (1) : game.incrementers.ax.nextCost.ax.times(1.01 + Math.random() * 0.2).toDecimalPlaces(0, Decimal.ROUND_UP);
  updateAXIncrementers();
}

function initializeDOM() {
  document.getElementById("build-a").onclick = () => increaseAXWidth();
  document.getElementById("speed-a").onclick = () => buyAXIncrementer();
  document.getElementById("run").onclick = runCode;
  updateAXWidth();
  updateAXIncrementers();
  updateAXRegister();

  const editor = ace.edit("editor");
  //editor.setTheme("ace/theme/twilight");
  editor.session.setMode("ace/mode/javascript");
}

function updateAXIncrementers () {
  document.getElementById("speed-a").innerHTML = `Purchase incrementer (${game.incrementers.ax.nextCost.ax})`;
}

function updateAXWidth () {
  document.getElementById("build-a").innerHTML = `Increase register width (${getNextAXRegisterWidthCost()})`;
}

function updateAXRegister() {
  document.getElementById("ax").innerHTML = `${game.registers.ax.toDecimalPlaces(0, Decimal.ROUND_DOWN)} / ${getAXMaxValue()}`;
}

function runCode() {
  game.code = ace.edit("editor").getValue();
}

function getAXMaxValue() {
  return new Decimal(2).toPower(game.registerWidthUpgrades.ax);
}

function getNextAXRegisterWidthCost() {
  return new Decimal(2).toPower(game.registerWidthUpgrades.ax).times(0.75);
}

initializeDOM();