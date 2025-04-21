const webStreamsPolyfill = require('web-streams-polyfill');

if (typeof global.ReadableStream === 'undefined') {
  global.ReadableStream = webStreamsPolyfill.ReadableStream;
}

console.log(global.ReadableStream); // Should now log the class/function