import { MessageType } from "../../shared/messages/message-types.js";
import { buildElementSelector } from "./element-selector.js";
import { getOriginalEventTarget } from "./event-target.js";
import { buildLocators } from "./locators.js";

let active = false;
let hoveredElement = null;
let resolvePick = null;

let previousOutline = "";
let previousOutlineOffset = "";

export function registerElementPicker() {
  // register before the normal click listener
  // this allows picker clicks to be consumed without recording or triggering them
  document.addEventListener("mouseover", handleMouseOver, true);
  document.addEventListener("click", handleClick, true);
  document.addEventListener("keydown", handleKeyDown, true);

  browser.runtime.onMessage.addListener((message) => {
    if (message?.type !== MessageType.PICK_ELEMENT) {
      return undefined;
    }

    return startPicking();
  });
}

function startPicking() {
  if (active) {
    throw new Error("Element picker is already active");
  }

  active = true;

  return new Promise((resolve) => {
    resolvePick = resolve;
  });
}

function handleMouseOver(event) {
  if (!active) {
    return;
  }

  const target = getOriginalEventTarget(event);

  if (!target || target === hoveredElement) {
    return;
  }

  clearHighlight();

  hoveredElement = target;
  previousOutline = target.style.outline;
  previousOutlineOffset = target.style.outlineOffset;

  target.style.outline = "2px solid #3b82f6";
  target.style.outlineOffset = "2px";
}

function handleClick(event) {
  if (!active) {
    return;
  }

  // picker click must neither trigger the page nor be recorded
  event.preventDefault();
  event.stopImmediatePropagation();

  const target = getOriginalEventTarget(event);

  if (!target) {
    return;
  }

  const locators = buildLocators(null, target);
  const selector = buildElementSelector(target, locators);

  if (!selector) {
    finish({
      selected: false,
      error: "Could not build selector for selected element",
    });

    return;
  }

  finish({
    selected: true,
    selector,
    locators,
    url: location.href,
  });
}

function handleKeyDown(event) {
  if (!active || event.key !== "Escape") {
    return;
  }

  event.preventDefault();
  event.stopImmediatePropagation();

  finish({
    selected: false,
    cancelled: true,
  });
}

function finish(result) {
  clearHighlight();

  active = false;

  const resolve = resolvePick;
  resolvePick = null;

  resolve?.(result);
}

function clearHighlight() {
  if (!hoveredElement) {
    return;
  }

  hoveredElement.style.outline = previousOutline;
  hoveredElement.style.outlineOffset = previousOutlineOffset;

  hoveredElement = null;
  previousOutline = "";
  previousOutlineOffset = "";
}
