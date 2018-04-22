import './style.css';

import safeEval from './eval';
import * as Save from './save';

const pretty = require('js-object-pretty-print').pretty;

const ace = require('ace-builds');
require("ace-builds/src-min-noconflict/mode-javascript")

let game = {
  state: <any>null,
  logic: {
    upgrades: {
      axWidth: {
        name: "AX Register Width",
        cost: <any>{
          ax: 3,
        },
        apply: () => {
          game.state.resources.ax.max *= 2;
        },
        increaseCost: () => {
          for (const resource in game.state.upgrades.axWidth.cost) {
            game.state.upgrades.axWidth.cost[resource] *= 2;
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
          game.state.resources.bx.max *= 2;
        },
        increaseCost: () => {
          for (const resource in game.state.upgrades.bxWidth.cost) {
            game.state.upgrades.bxWidth.cost[resource] *= 2;
          }
        }
      }
    },
  }
};

game.state = <any>Save.load();
if (!game.state) {
  doHardReset();
}

initializeDOM();
const tickSpeed = 530;
setTimeout(tick, tickSpeed);

let lastTime = 0;

function tick() {
  const t = performance.now();

  incrementRegisters();

  const variables = getCodeVariables();
  const functions = getCodeFunctions();
  document.getElementById("state").textContent = pretty(variables);
  document.getElementById("functions").textContent = pretty(functions);
  if (game.state.code) {
    try {
      const start = performance.now();
      safeEval(game.state.code, variables, pretty(functions, 2, null, true), (err: any, result: any) => {
        const end = performance.now();
        console.log(`Execution time: ${end-start}`);
        if (err) {
          log(err);
          game.state.code = null;
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
      game.state.code = null;
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
  obj.ax = game.state.resources.ax.value;
  obj.axMax = game.state.resources.ax.max;
  obj.bx = game.state.resources.bx.value;
  obj.bxMax = game.state.resources.bx.max;
  obj.nextAXWidthCost = game.state.upgrades.axWidth.cost;
  obj.nextAXIncrementerCost = game.state.incrementers.ax.nextCost.ax;
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
  const axRate = game.state.incrementers.ax.quantity;

  const axCapacity = game.state.resources.ax.max;
  const bxCapacity = game.state.resources.bx.max;

  game.state.resources.ax.value += axRate;
  if (game.state.resources.ax.value >= axCapacity + 1) {
    game.state.resources.bx.value = game.state.resources.bx.value + Math.floor(game.state.resources.ax.value / axCapacity);
    game.state.resources.ax.value = game.state.resources.ax.value % (axCapacity + 1);
  }

  if (game.state.resources.bx.value >= bxCapacity + 1) {
    game.state.resources.bx.value = game.state.resources.bx.value % (bxCapacity + 1);
  }
}

function increaseAXWidth() {
  for (const resource in game.state.upgrades.axWidth.cost) {
    if ((<any>game.state.resources)[resource].value < game.state.upgrades.axWidth.cost[resource]) {
      return;
    }
  }

  for (const resource in game.state.upgrades.axWidth.cost) {
    (<any>game.state.resources)[resource].value -= game.state.upgrades.axWidth.cost[resource];
  }

  game.logic.upgrades.axWidth.apply();
  game.logic.upgrades.axWidth.increaseCost();
  updateAXWidth();
}

function buyAXIncrementer() {
  if (game.state.resources.ax.value < game.state.incrementers.ax.nextCost.ax) {
    return;
  }

  game.state.resources.ax.value -= game.state.incrementers.ax.nextCost.ax;
  game.state.incrementers.ax.quantity += 1;
  game.state.incrementers.ax.nextCost.ax = game.state.incrementers.ax.quantity === 1 ? 4 : Math.ceil(game.state.incrementers.ax.nextCost.ax * (1.01 + Math.random() * 0.2));
  updateAXIncrementers();
}

function initializeDOM() {
  document.getElementById("save").onclick = () => Save.save(game.state);
  document.getElementById("export").onclick = () => {
    const data = Save.exportSave(game.state);
    prompt("", data);
  };
  document.getElementById("import").onclick = doImport;
  document.getElementById("hard-reset").onclick = doHardReset;
  document.getElementById("build-a").onclick = increaseAXWidth;
  document.getElementById("speed-a").onclick = buyAXIncrementer;
  document.getElementById("run").onclick = runCode;
  updateAXWidth();
  updateAXIncrementers();
  updateRegisters();

  const editor = ace.edit("editor");
  //editor.setTheme("ace/theme/twilight");
  editor.session.setMode("ace/mode/javascript");
}

function updateAXIncrementers () {
  document.getElementById("speed-a").textContent = `Purchase incrementer (${renderCost(game.state.incrementers.ax.nextCost)})`;
}

function updateAXWidth () {
  document.getElementById("build-a").textContent = `Increase register width (${renderCost(game.state.upgrades.axWidth.cost)})`;
}

function updateRegisters() {
  document.getElementById("ax").textContent = `${game.state.resources.ax.value} / ${game.state.resources.ax.max}`;
  document.getElementById("bx").textContent = `${game.state.resources.bx.value} / ${game.state.resources.bx.max}`;
}

function doImport() {
  const data = prompt();
  try {
    const state = Save.importSave(data);
    if (state) {
      game.state = state;
      return;
    }
  } catch {
  }
  alert("Unable to import save data.");
}

function doHardReset() {
  game.state = {
    code: <string> "",
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
        cost: <any>{
          ax: 3,
        },
      },
      bxWidth: {
        cost: <any>{
          ax: 6,
          bx: 3,
        }
      }
    }
  };
  Save.hardReset();
}

function runCode() {
  game.state.code = ace.edit("editor").getValue();
}

function renderCost(cost: any) {
  return Object.keys(cost).map(x => `${x}:${cost[x]}`).join(", ");
}
