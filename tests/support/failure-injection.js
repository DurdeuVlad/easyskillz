'use strict';

function failOnCall(callNumber, code = 'E_INJECTED') {
  let calls = 0;
  return () => {
    calls += 1;
    if (calls === callNumber) {
      const error = new Error(`Injected failure at call ${callNumber}`);
      error.code = code;
      throw error;
    }
  };
}

module.exports = { failOnCall };
