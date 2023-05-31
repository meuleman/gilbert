let timeoutId = null;
let token = null;

function debounce(promise, callback, delay) {
  // If a timeout is already running, clear it
  if (timeoutId !== null) {
    clearTimeout(timeoutId);
  }

  // Create a new token for this invocation
  const thisToken = Symbol();

  // Assign the token to the outer scope variable for comparison later
  token = thisToken;

  timeoutId = setTimeout(() => {
    // Invoke the provided promise function
    promise
      .then(result => {
        // Only process the result if the token matches the current token (i.e., no later invocation has occurred)
        if (token === thisToken) {
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
export default debounce