// cancelableClick.js

const cancelableClick = ({ tolerance = 5, timeout = 200 } = {}) => {
  const dispatcher = d3.dispatch('click', 'dblclick');

  const dist = (a, b) => {
    return Math.sqrt(Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2));
  }

  const rebindMethod = (target, source, method) => {
    return (...args) => {
      const value = method.apply(source, args);
      return value === source ? target : value;
    };
  }

  const rebind = (target, source, ...methods) => {
    for (let method of methods) {
      target[method] = rebindMethod(target, source, source[method]);
    }
    return target;
  }

  const cc = (selection) => {
    let downPt;
    let lastTs;
    let waitId;
    let eventArgs;

    selection.on('mousedown', (event, ...args) => {
      downPt = d3.pointer(event, document.body);
      lastTs = Date.now();
      eventArgs = [event, ...args];
    });

    selection.on('click', (e) => {
      if (dist(downPt, d3.pointer(e, document.body)) >= tolerance) {
        return;
      }

      if (waitId) {
        window.clearTimeout(waitId);
        waitId = null;
        dispatcher.apply("dblclick", selection, eventArgs);
      } else {
        waitId = window.setTimeout(
          () => {
            // console.log("single clicked",
            //   ("Current time:", new Date().toLocaleString())
            //   , e
            //   , selection
            //   , eventArgs);
            dispatcher.apply("click", selection, eventArgs);
            waitId = null;
          },
          timeout
        );
      }
    });
  };

  return rebind(cc, dispatcher, 'on');
}

// Export the function as the default export
export default cancelableClick;