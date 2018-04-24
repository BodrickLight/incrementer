import './style.css';

import safeEval from './eval';
import * as Save from './save';
import { Upgrade, UpgradeState } from './upgrades';

const pretty = require('js-object-pretty-print').pretty;

const ace = require('ace-builds');
require("ace-builds/src-min-noconflict/mode-javascript");

interface Game {
  state: State,
  logic: Logic,
}

interface State {
  faultCycles: number,
  resources: {
    [index: string]: Resource,
  },
  code: string,
  upgrades: {
    [index: string]: UpgradeState,
  },
  incrementers: {
    [index: string]: IncrementerState,
  }
}

interface Resource {
  value: number,
  max: number
}

interface IncrementerState {
  quantity: number,
}

interface Logic {
  upgrades: {
    [index: string]: Upgrade,
  }
}

let game: Game = {
  state: null,
  logic: {
    upgrades: {
      AXWidth: {
        id: "AXWidth",
        name: "AX Register Width",
        apply: (state: State) => {
          state.resources.AX.max *= 2;
        },
        increaseCost: (state: State) => {
          for (const resource in state.upgrades.AXWidth.cost) {
            state.upgrades.AXWidth.cost[resource] *= 2;
          }
        },
        shouldUnlock: (state: State) => true,
      },
      AXIncrementer: {
        id: "AXIncrementer",
        name: "AX Incrementer",
        apply: (state: State) => {
          state.incrementers.AX.quantity += 1;
        },
        increaseCost: (state: State) => {
          for (const resource in state.upgrades.AXIncrementer.cost) {
            state.upgrades.AXIncrementer.cost[resource] = state.incrementers.AX.quantity === 1 ? 4 : Math.ceil(state.upgrades.AXIncrementer.cost[resource] * (1.01 + Math.random() * 0.2));
          }
        },
        shouldUnlock: (state: State) => true,
      },
      BXWidth: {
        id: "BXWidth",
        name: "BX Register Width",
        apply: (state: State) => {
          state.resources.BX.max *= 2;
        },
        increaseCost: (state: State) => {
          for (const resource in state.upgrades.BXWidth.cost) {
            state.upgrades.BXWidth.cost[resource] *= 2;
          }
        },
        shouldUnlock: (state: State) => true,
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
setTimeout(onTimer, tickSpeed);

let lastTime = 0;

function onTimer() {
  const t = performance.now();
  const ticks = Math.round((t - lastTime) / tickSpeed);
  lastTime = t;
  tick(ticks);
}

function tick(cycles: number) {
  function end() {
    if (cycles > 1) {
      setTimeout(() => tick(cycles - 1), 0);
    } else {
      tickDone();
    }
  }

  if (game.state.faultCycles) {
    game.state.faultCycles -= 1;
    end();
    return;
  }

  incrementRegisters();
  const variables = getCodeVariables();
  const functions = getCodeFunctions();

  if (game.state.code) {
    try {
      const t1 = performance.now();
      safeEval(game.state.code, variables, pretty(functions, 2, null, true), (err: any, result: any) => {
        const t2 = performance.now();
        console.log(`Execution time: ${t2-t1}`);
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
          end();
        }
      });
    } catch (e) {
      log(e);
      game.state.code = null;
      end();
    }
  } else {
    end();
  }
}

function tickDone() {
  const variables = getCodeVariables();
  const functions = getCodeFunctions();
  document.getElementById("state").textContent = pretty(variables);
  document.getElementById("functions").textContent = pretty(functions);

  updateRegisters();
  setTimeout(onTimer, tickSpeed - (performance.now() - lastTime));
}

function getCodeVariables() {
  const obj = <any>{};
  obj.AX = game.state.resources.AX.value;
  obj.AXMax = game.state.resources.AX.max;
  obj.BX = game.state.resources.BX.value;
  obj.BXMax = game.state.resources.BX.max;
  obj.nextAXWidthCost = game.state.upgrades.AXWidth.cost;
  obj.nextAXIncrementerCost = game.state.upgrades.AXIncrementer.cost;
  return obj;
}

// This isn't actually used, it's just here to suppress
// the typescript errors raised by the functions.
declare const _hidden_return_value: string[];

function getCodeFunctions() {
  const obj = <any>{};
  // Newlines are important here for the pretty-printer to work properly!
  obj.log = function (object:object) {
    if (typeof (object) === "function") {
      console.log(`function ${(<any>object).name}()`);
      return;
    }
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
  const AXRate = game.state.incrementers.AX.quantity;

  const AXCapacity = game.state.resources.AX.max;
  const BXCapacity = game.state.resources.BX.max;

  game.state.resources.AX.value += AXRate;
  if (game.state.resources.AX.value >= AXCapacity + 1) {
    game.state.resources.BX.value = game.state.resources.BX.value + Math.floor(game.state.resources.AX.value / AXCapacity);
    game.state.resources.AX.value = game.state.resources.AX.value % (AXCapacity + 1);
  }

  if (game.state.resources.BX.value >= BXCapacity + 1) {
    game.state.resources.BX.value = game.state.resources.BX.value % (BXCapacity + 1);
  }
}

function increaseAXWidth() {
  tryPurchaseUpgrade(game.logic.upgrades.AXWidth);
}

function buyAXIncrementer() {
  tryPurchaseUpgrade(game.logic.upgrades.AXIncrementer);
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
  updateRegisters();

  const editor = ace.edit("editor");
  //editor.setTheme("ace/theme/twilight");
  editor.session.setMode("ace/mode/javascript");
}

function updateRegisters() {
  document.getElementById("ax").textContent = `${game.state.resources.AX.value} / ${game.state.resources.AX.max}`;
  document.getElementById("bx").textContent = `${game.state.resources.BX.value} / ${game.state.resources.BX.max}`;
  document.getElementById("ax-graph-inner").style.height = `${game.state.resources.AX.value / game.state.resources.AX.max * 100}%`
  document.getElementById("bx-graph-inner").style.height = `${game.state.resources.BX.value / game.state.resources.BX.max * 100}%`
  document.getElementById("html").classList.toggle("segfault", game.state.faultCycles > 0);
  document.getElementById("speed-a").textContent = `Purchase incrementer (${renderCost(game.state.upgrades.AXIncrementer.cost)})`;
  document.getElementById("build-a").textContent = `Increase register width (${renderCost(game.state.upgrades.AXWidth.cost)})`;
}

function tryPurchaseUpgrade(upgrade: Upgrade) {
  if (!canAfford(upgrade)) {
    segFault();
    updateRegisters();
    return;
  }

  for (const r in game.state.upgrades[upgrade.id].cost) {
    game.state.resources[r].value -= game.state.upgrades[upgrade.id].cost[r];
  }

  upgrade.apply(game.state);
  upgrade.increaseCost(game.state);
  updateRegisters();
}

function canAfford(upgrade: Upgrade) {
  return Object.keys(game.state.upgrades[upgrade.id].cost).every(r => game.state.resources[r].value >= game.state.upgrades[upgrade.id].cost[r]);
}

function segFault() {
  game.state.faultCycles = 3;
}

function doImport() {
  const data = prompt();
  try {
    const state = <any>Save.importSave(data);
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
    code: "",
    faultCycles: 0,
    resources: {
      AX: {
        value: 0,
        max: 4,
      },
      BX: {
        value: 0,
        max: 4,
      }
    },
    incrementers: {
      AX: {
        quantity: 0,
      },
      BX: {
        quantity: 0,
      },
    },
    upgrades: {
      AXWidth: {
        cost: {
          AX: 3,
        },
      },
      AXIncrementer: {
        cost: {
          AX: 0,
        }
      },
      BXWidth: {
        cost: {
          AX: 6,
          BX: 3,
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
