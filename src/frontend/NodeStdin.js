// Node.js: feeds stdin to the engine line by line through UciCommand() (see UCI.cpp), so no thread
// blocks on reading it. The end of the input quits, as it does for native builds; when the engine
// is done, the process exits rather than waiting on stdin.
Module['onRuntimeInitialized'] = () => {
    const lines = require('readline').createInterface({ input: process.stdin });
    lines.on('line', (line) => Module['ccall']('UciCommand', null, ['string'], [line]));
    lines.on('close', () => Module['ccall']('UciCommand', null, ['string'], ['quit']));
};
Module['onExit'] = (status) => process.exit(status);
