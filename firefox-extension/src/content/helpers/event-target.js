// events of shadow DOM elements often change target to the shadow root
// so we need to find the original target of the event

export function getOriginalEventTarget(event) {
  if (typeof event.composedPath === "function") {
    const target = event
      .composedPath()
      .find((entry) => entry instanceof Element);

    if (target) {
      return target;
    }
  }

  return event.target instanceof Element ? event.target : null;
}
