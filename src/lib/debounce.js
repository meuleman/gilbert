// This version will only return the result of the last call to be made within the delay period
// This means that if many calls are made within the delay period, all will be invoked but only the last returned
function debouncer() {
  let timeoutId = null;
  let lastInvocationTimestamp = null;
  function debounce(promiseFn, callback, delay) {
    const currentTimestamp = Date.now();

    // If a timeout is already running, clear it
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      lastInvocationTimestamp = currentTimestamp;
      promiseFn()
        .then(result => {
          // Check if current invocation is the latest
          if (lastInvocationTimestamp === currentTimestamp) {
            callback(result);
          }
          // Otherwise, do nothing or you can call callback with null or some indication of being outdated
        })
        .catch(err => {
          console.error(err);
          // You could call callback with the error if needed
        });
    }, delay);
  }
  return debounce
}

// This version will only allow a call to be made after the delay period has passed
// So if many calls are made within the delay period, only the first one will be invoked
function debouncerTimed() {
  let allowCall = true
  function debounceTimed(promiseFn, callback, delay) {
    // If a call is allowed, proceed
    // console.log("allowCall: ", allowCall)
    if (allowCall) {
      allowCall = false; // Block further calls until after the delay
      promiseFn()
        .then(callback)
        .catch(console.error)
        .finally(function() {
          // Set a timeout to allow the next call after the delay period
          setTimeout(() => {
            allowCall = true;
          }, delay);
        });
    }
  }
  return debounceTimed
}

let timeoutIds = {};
let tokens = {};

// This version works the same as `debouncer` but allows you to specify a name for the timeout
// This way you can debounce the same function called with different parameters without blocking each other
function debounceNamed(promise, callback, delay, name) {
  // If a timeout is already running with the same name, clear it
  if (timeoutIds[name] !== undefined) {
    clearTimeout(timeoutIds[name]);
  }

  // Create a new token for this invocation
  const thisToken = Symbol();

  // Assign the token to the outer scope variable for comparison later
  tokens[name] = thisToken;

  timeoutIds[name] = setTimeout(() => {
    // Invoke the provided promise function
    promise
      .then(result => {
        // Only process the result if the token matches the current token for this name
        if (tokens[name] === thisToken) {
          callback(result);
        } else {
          callback(null);
        }
      })
      .catch(err => {
        console.error(err);
      });
  }, delay);
}

export {
  debouncer,
  debouncerTimed,
  debounceNamed 
}
