const code = require('./eval.worker');
var blob = new Blob([code.toString()
  .replace(/^function\*?\s+\([^)]*\)\s*\{/, '')
  .replace(/\}$/, '')], {
    type: 'application/javascript'
  }),
  codeUrl = URL.createObjectURL(blob);

export default function (code: string, cb: Function, state: any) {
  var worker = new Worker(codeUrl);
  var timeout: number;

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
    arg: null,
  });

  function start() {
    if (timeout) {
      return;
    }

    timeout = setTimeout(function () {
      finish('Maximum execution time exceeded', undefined);
    }, 500);
  }

  function finish(err: any, result: any) {
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