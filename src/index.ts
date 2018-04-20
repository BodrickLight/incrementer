import './style.css';

import safeEval from './eval';
const pretty = require('js-object-pretty-print').pretty;
import { Decimal } from 'decimal.js-light';
import './decimalEx';

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
    bx: new Decimal(2),
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

  updateRegisters();
}


function getCodeVariables() {
  const obj = <any>{};
  obj.ax = game.registers.ax.render();
  obj.axMax = getAXMaxValue().render();
  obj.bx = game.registers.bx.render();
  obj.bxMax = getBXMaxValue().render();
  obj.nextAXWidthCost = getNextAXRegisterWidthCost().render();
  obj.nextAXIncrementerCost = game.incrementers.ax.nextCost.ax.render();
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

  const axCapacity = getAXMaxValue();
  const bxCapacity = getBXMaxValue();

  game.registers.ax = game.registers.ax.add(axRate);
  if (game.registers.ax.greaterThanOrEqualTo(axCapacity.add(1))) {
    game.registers.bx = game.registers.bx.add(axCapacity.dividedToIntegerBy(axCapacity));
    game.registers.ax = game.registers.ax.modulo(axCapacity.add(1));
  }

  if (game.registers.bx.greaterThanOrEqualTo(bxCapacity.add(1))) {
    game.registers.bx = game.registers.bx.modulo(bxCapacity.add(1));
  }
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
  game.incrementers.ax.nextCost.ax = game.incrementers.ax.quantity.equals(1) ? new Decimal (4) : game.incrementers.ax.nextCost.ax.times(1.01 + Math.random() * 0.2).toDecimalPlaces(0, Decimal.ROUND_UP);
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
  document.getElementById("speed-a").textContent = `Purchase incrementer (${game.incrementers.ax.nextCost.ax})`;
}

function updateAXWidth () {
  document.getElementById("build-a").textContent = `Increase register width (${getNextAXRegisterWidthCost()})`;
}

function updateRegisters() {
  document.getElementById("ax").textContent = `${game.registers.ax.render()} / ${getAXMaxValue()}`;
  document.getElementById("bx").textContent = `${game.registers.bx.render()} / ${getBXMaxValue()}`;
}

function runCode() {
  game.code = ace.edit("editor").getValue();
}

function getAXMaxValue() {
  return new Decimal(2).toPower(game.registerWidthUpgrades.ax);
}

function getBXMaxValue() {
  return new Decimal(2).toPower(game.registerWidthUpgrades.bx);
}

function getNextAXRegisterWidthCost() {
  return new Decimal(2).toPower(game.registerWidthUpgrades.ax).times(0.75);
}

initializeDOM();