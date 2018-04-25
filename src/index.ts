import './style.css';

import safeEval from './eval';
import * as Save from './save';
import { Upgrade, UpgradeState, Costs } from './upgrades';

const pretty = require('js-object-pretty-print').pretty;

const ace = require('ace-builds');
require("ace-builds/src-min-noconflict/mode-javascript");
require("ace-builds/src-min-noconflict/theme-twilight");
require("./ace.css");

interface Game {
  state: State,
  logic: Logic,
}

interface State {
  faultCycles: number,
  permanentUpgrades: {
    computationEngine: boolean,
  },
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
  upgrades: Upgrade[],
  permanentUpgrades: Upgrade[],
}

let game: Game = {
  state: null,
  logic: {
    permanentUpgrades: [{
        id: "ComputationEngine",
        name: "Computation Engine",
        description: "???",
        elementId: "buy-computation-engine",
        apply: (state: State) => {
          state.permanentUpgrades.computationEngine = true;
        },
        increaseCost: () => null,
        shouldUnlock: (state: State) => state.resources.AX.max >= 64,
      }
    ],
    upgrades: [{
        id: "AXWidth",
        name: "AX Register Width",
        description: "Double capacity of AX",
        elementId: "buy-ax-width",
        apply: (state: State) => {
          state.resources.AX.max = state.resources.AX.max * 2 + 1;
        },
        increaseCost: (state: State) => {
          for (const resource in state.upgrades.AXWidth.cost) {
            state.upgrades.AXWidth.cost[resource] = state.upgrades.AXWidth.cost[resource] * 2 + 1;
          }
        },
        shouldUnlock: (state: State) => true,
      }, {
        id: "AXIncrementer",
        name: "AX Incrementer",
        description: "Increase AX by an additional 1 every tick",
        elementId: "buy-ax-incrementer",
        apply: (state: State) => {
          state.incrementers.AX.quantity += 1;
        },
        increaseCost: (state: State) => {
          for (const resource in state.upgrades.AXIncrementer.cost) {
            state.upgrades.AXIncrementer.cost[resource] = state.incrementers.AX.quantity === 1 ? 4 : Math.ceil(state.upgrades.AXIncrementer.cost[resource] * (1.01 + Math.random() * 0.2));
          }
        },
        shouldUnlock: (state: State) => true,
      }, {
        id: "BXWidth",
        name: "BX Register Width",
        description: "Double capacity of BX",
        elementId: "buy-bx-width",
        apply: (state: State) => {
          state.resources.BX.max = state.resources.AX.max * 2 + 1;
        },
        increaseCost: (state: State) => {
          for (const resource in state.upgrades.BXWidth.cost) {
            state.upgrades.BXWidth.cost[resource] = state.upgrades.BXWidth.cost[resource] * 2 + 1;
          }
        },
        shouldUnlock: (state: State) => true,
      }, {
        id: "BXIncrementer",
        name: "BX Incrementer",
        description: "Increase BX by an additional 1 every tick",
        elementId: "buy-bx-incrementer",
        apply: (state: State) => {
          state.incrementers.BX.quantity += 1;
        },
        increaseCost: (state: State) => {
          for (const resource in state.upgrades.BXIncrementer.cost) {
            state.upgrades.BXIncrementer.cost[resource] = state.upgrades.BXIncrementer.cost[resource] * 2 + 1;
          }
        },
        shouldUnlock: (state: State) => true,
      }, {
        id: "CXWidth",
        name: "CX Width",
        description: "Double capacity of CX",
        elementId: "buy-cx-width",
        apply: (state: State) => {
          state.resources.CX.max = !state.resources.CX.max ? 4 : state.resources.CX.max * 2 + 1;
        },
        increaseCost: (state: State) => {
          for (const resource in state.upgrades.CXWidth.cost) {
            state.upgrades.CXWidth.cost[resource] = state.upgrades.CXWidth.cost[resource] * 2 + 1;
          }
        },
        shouldUnlock: (state: State) => true,
      }
    ],
  }
};

game.state = <any>Save.load();
if (!game.state) {
  doHardReset();
}

initializeDOM();
const tickSpeed = 53;// 530;
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
              tryPurchaseUpgrade(game.logic.upgrades.filter(x => x.id == "AXWidth")[0]);
            }
            if (a === "buyAXIncrementer") {
              tryPurchaseUpgrade(game.logic.upgrades.filter(x => x.id == "AXIncrementer")[0]);
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
  const BXRate = game.state.incrementers.BX.quantity;

  const AXCapacity = game.state.resources.AX.max;
  const BXCapacity = game.state.resources.BX.max;
  const CXCapacity = game.state.resources.CX.max;

  game.state.resources.AX.value += AXRate;
  if (game.state.resources.AX.value >= AXCapacity + 1) {
    game.state.resources.BX.value = game.state.resources.BX.value + Math.floor(game.state.resources.AX.value / AXCapacity);
    game.state.resources.AX.value = game.state.resources.AX.value % (AXCapacity + 1);
  }

  game.state.resources.BX.value += BXRate;
  if (game.state.resources.BX.value >= BXCapacity + 1) {
    game.state.resources.CX.value = game.state.resources.CX.value + Math.floor(game.state.resources.BX.value / BXCapacity);
    game.state.resources.BX.value = game.state.resources.BX.value % (BXCapacity + 1);
  }

  if (game.state.resources.CX.value >= CXCapacity + 1) {
    game.state.resources.CX.value = game.state.resources.CX.value % (CXCapacity + 1);
  }
}

function initializeDOM() {
  document.getElementById("save").onclick = () => Save.save(game.state);
  document.getElementById("export").onclick = () => {
    const data = Save.exportSave(game.state);
    prompt("", data);
  };
  document.getElementById("import").onclick = doImport;
  document.getElementById("hard-reset").onclick = doHardReset;
  const upgradeContainer = document.getElementById("upgrades");
  for (const upgrade of game.logic.upgrades) {
    const div = document.createElement("div");
    const title = document.createElement("span");
    title.textContent = upgrade.name;
    const cost = document.createElement("span");
    cost.classList.add("light-green");
    div.appendChild(title);
    div.appendChild(cost);
    div.id = upgrade.elementId;
    div.onclick = () => tryPurchaseUpgrade(upgrade);
    upgradeContainer.appendChild(div);
  }

  const permanentUpgradeContainer = document.getElementById("permanent-upgrades");
  for (const upgrade of game.logic.permanentUpgrades) {
    const div = document.createElement("div");
    const title = document.createElement("span");
    title.textContent = upgrade.name;
    const cost = document.createElement("span");
    cost.classList.add("light-green");
    cost.textContent = "???";
    div.appendChild(title);
    div.appendChild(cost);
    div.id = upgrade.elementId;
    div.onclick = () => tryPurchaseUpgrade(upgrade);
    permanentUpgradeContainer.appendChild(div);
  }

  document.getElementById("run").onclick = runCode;
  updateRegisters();

  const editor = ace.edit("editor", {
    mode: "ace/mode/javascript",
    theme: "ace/theme/twilight",
    minLines: 20,
    maxLines: 9999,
  });
}

function updateRegisters() {
  document.getElementById("ax").textContent = `${game.state.resources.AX.value} / ${game.state.resources.AX.max}`;
  document.getElementById("bx").textContent = `${game.state.resources.BX.value} / ${game.state.resources.BX.max}`;
  document.getElementById("cx").textContent = `${game.state.resources.CX.value} / ${game.state.resources.CX.max}`;
  document.getElementById("ax-graph-inner").style.width = `${game.state.resources.AX.value / game.state.resources.AX.max * 100}%`
  document.getElementById("bx-graph-inner").style.width = `${game.state.resources.BX.value / game.state.resources.BX.max * 100}%`
  document.getElementById("cx-graph-inner").style.width = `${game.state.resources.CX.value / game.state.resources.CX.max * 100}%`
  document.getElementById("html").classList.toggle("segfault", game.state.faultCycles > 0);
//  document.getElementById("code-container").style.visibility = game.state.permanentUpgrades.computer ? "visible": "hidden";

  for (const upgrade of game.logic.upgrades) {
    const state = game.state.upgrades[upgrade.id];
    const div = document.getElementById(upgrade.elementId);
    div.children[1].textContent = renderCost(state.cost);
  }
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
    permanentUpgrades: {
      computationEngine: false,
    },
    resources: {
      AX: {
        value: 0,
        max: 3,
      },
      BX: {
        value: 0,
        max: 3,
      },
      CX: {
        value: 0,
        max: 0,
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
          BX: 3,
        },
      },
      AXIncrementer: {
        cost: {
          BX: 0,
        }
      },
      BXWidth: {
        cost: {
          AX: 6,
        }
      }, 
      BXIncrementer: {
        cost: {
          CX: 6,
        }
      },
      CXWidth: {
        cost: {
          AX: 64,
          BX: 64,
        }
      }
    }
  };
  Save.hardReset();
}

function runCode() {
  game.state.code = ace.edit("editor").getValue();
}

function renderCost(cost: Costs) {
  return Object.keys(cost).map(x => `${x}:${cost[x]}`).join(", ");
}
