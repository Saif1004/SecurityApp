const webStreamsPolyfill = require('web-streams-polyfill');

if (typeof global.ReadableStream === 'undefined') {
  global.ReadableStream = webStreamsPolyfill.ReadableStream;
}

// Now run the app
require('expo-router/entry');
