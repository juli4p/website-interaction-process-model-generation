import { getAttributes } from "./attributes.js";

export function buildLocators(event, element) {
  if (!(element instanceof Element)) {
    return [];
  }

  const locators = [];

  addLocator({
    locators,
    event,
    element,
    kind: "attributes",
  });

  addLocator({
    locators,
    event,
    element: element.parentElement,
    kind: "parent_attributes",
  });

  addLocator({
    locators,
    event,
    element: element.parentElement?.parentElement,
    kind: "parent_parent_attributes",
  });

  return locators;
}

function addLocator({ locators, event, element, kind }) {
  if (!(element instanceof Element)) {
    return;
  }

  locators.push({
    kind,
    value: getAttributes(element),
    position: event ? getRelativePosition(event, element) : null,
  });
}

// calculate the relative position of a mouse event within an element
function getRelativePosition(event, element) {
  // only calculate relative position for mouse events
  if (
    typeof event?.clientX !== "number" ||
    typeof event?.clientY !== "number"
  ) {
    return null;
  }
  const rectangle = element.getBoundingClientRect();

  if (rectangle.width === 0 || rectangle.height === 0) {
    return null;
  }

  return {
    // rel x distance from left edge of element
    rx: +((event.clientX - rectangle.left) / rectangle.width).toFixed(2),
    // rel y distance from top edge of element
    ry: +((event.clientY - rectangle.top) / rectangle.height).toFixed(2),
  };
}
