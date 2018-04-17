import './style.css';
const ace = require('ace-builds');
require("../node_modules/ace-builds/src-min-noconflict/mode-javascript")

interface IGame {
  resources: IResources,
  buildings: any,
  code: string,
  gatheringA: boolean,
  gatheringB: boolean,
  gatheringC: boolean,
}

interface IResources {
  [key:string]: number,
  a: number,
  b: number,
  c: number,
}

let game : IGame = {
  resources: {
    a: 0,
    b: 0,
    c: 0,
  },
  buildings: {
    a: 0,
    b: 0,
    c: 0,
  },
  code: <string> null,
  gatheringA: true,
  gatheringB: false,
  gatheringC: false,
};

setTimeout(tick, 100);

let num = 0;
let lastTime = 0;

function tick() {
  const t = performance.now();
  const dt = (t - lastTime) / 1000;
  updateResources(dt);
  updateDOM();

  if (game.code) {
    try {
      safeEval(game.code, null, (err: any, result: any) => {
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
}

function log (msg: string) {
  const div = document.createElement ("div");
  div.innerHTML = `${new Date().toString()}: ${msg}`;
  const log = document.getElementById("log");
  log.appendChild(div);
  log.scrollTo(100000, 100000);
}

function updateResources(dt: number) {
  if (game.gatheringA) {
    game.resources.a += (game.buildings.a + 1) * dt;
  } else if (game.gatheringB) {
    game.resources.b += (game.buildings.b + 1) * dt * 2;
  } else if (game.gatheringC) {
    game.resources.c += (game.buildings.c + 1) * dt * 4;
  }
}

function gatherA() {
  game.gatheringA = true;
  game.gatheringB = false;
  game.gatheringC = false;
}

function gatherB() {
  game.gatheringA = false;
  game.gatheringB = true;
  game.gatheringC = false;
}

function gatherC() {
  game.gatheringA = false;
  game.gatheringB = false;
  game.gatheringC = true;
}

function build(resource: string) {
  const cost = 10 * Math.pow(1.1, <number>game.buildings[resource]);
  if (game.resources[resource] < cost) {
    return;
  }

  game.buildings[resource] += 1;
  game.resources[resource] -= cost;
  const nextCost = cost * 1.1;

  document.getElementById("build-" + resource).innerHTML = `Build (${nextCost.toFixed(1)})`;
}

function initializeDOM() {
  document.getElementById("gather-a").onclick = gatherA;
  document.getElementById("gather-b").onclick = gatherB;
  document.getElementById("gather-c").onclick = gatherC;
  document.getElementById("build-a").onclick = () => build("a");
  document.getElementById("build-b").onclick = () => build("b");
  document.getElementById("build-c").onclick = () => build("c");
  document.getElementById("run").onclick = runCode;

  const editor = ace.edit("editor");
  //editor.setTheme("ace/theme/twilight");
  editor.session.setMode("ace/mode/javascript");
}

function updateDOM() {
  document.getElementById("a").innerHTML = game.resources.a.toFixed(1);
  document.getElementById("b").innerHTML = game.resources.b.toFixed(1);
  document.getElementById("c").innerHTML = game.resources.c.toFixed(1);
}

function runCode() {
  game.code = ace.edit("editor").getValue();
}

const safeEval = (function () {
  const code = require('./eval.worker');
  var blob = new Blob([code.toString()
    .replace(/^function\*?\s+\([^)]*\)\s*\{/, '')
    .replace(/\}$/, '')], {
    type: 'application/javascript'
  }),
    codeUrl = URL.createObjectURL(blob);

  return function (code, arg, cb, state) {
    if (arguments.length === 2) {
      cb = arg;
      arg = null;
    }

    var worker = new Worker(codeUrl),
      timeout;

    worker.onmessage = function (evt) {
      var type = evt.data.event;

      if (type === 'start') {
        start();
      }
      else {
        finish(null, evt.data);
      }
    };

    worker.onerror = function (error) {
      console.warn(error, 'eval worker.onerror');
      finish(error.message, undefined);
    };

    if (code.match(/return/)) {
      code = `(function(){${code}})()`
    }
    code = `state = ${JSON.stringify(state)};\n` + code;
    worker.postMessage({
      code: code,
      arg: arg
    });

    function start() {
      if (timeout) {
        return;
      }

      timeout = setTimeout(function () {
        finish('Maximum execution time exceeded', undefined);
      }, 500);
    }

    function finish(err, result) {
      clearTimeout(timeout);
      worker.terminate();

      if (cb && cb.call) {
        cb(err, result);
      }
      else {
        console.warn('eval did not get callback');
      }
    }
  };

}());

initializeDOM();