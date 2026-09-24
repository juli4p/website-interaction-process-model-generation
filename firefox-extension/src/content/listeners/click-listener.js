import { createEvent } from "../../shared/events/event-factory.js";
import { EventType } from "../../shared/events/event-types.js";
import { buildLocators } from "../helpers/locators.js";
import { getModifiers } from "../helpers/modifiers.js";
import { sendEvent } from "../send-event.js";
import { buildElementSelector } from "../helpers/element-selector.js";
import { getOriginalEventTarget } from "../helpers/event-target.js";
import { getEffectiveClickTarget } from "../helpers/click-target.js";

export function registerClickListener() {
  document.addEventListener("click", handleClick, true);
}

function handleClick(event) {
  const originalTarget = getOriginalEventTarget(event);

  if (!originalTarget) {
    return;
  }

  const target = getEffectiveClickTarget(originalTarget);

  if (!target) {
    return;
  }

  // avoid double logging of select elements, as they are handled by the select listener
  if (
    target instanceof HTMLSelectElement ||
    target instanceof HTMLOptionElement
  ) {
    return;
  }

  const locators = buildLocators(event, target);
  const selectorResult = buildElementSelector(target, locators);

  const targetLocator = locators.find(
    (locator) => locator.kind === "attributes",
  );

  const payload = createEvent({
    type: EventType.CLICK,

    context: {
      url: location.href,
    },

    locators,

    data: {
      strategy: "css_fallback_xy",
      coordinateReference: "element",

      selector: {
        type: selectorResult?.type ?? null,
        segments: selectorResult?.segments ?? [],
        indexes: selectorResult?.indexes ?? [],
        matchCounts: selectorResult?.matchCounts ?? [],
        clickableAncestorUsed: target !== originalTarget,

        rx: targetLocator?.position?.rx ?? null,
        ry: targetLocator?.position?.ry ?? null,
      },

      viewportPosition: {
        rx: +(event.clientX / window.innerWidth).toFixed(2),
        ry: +(event.clientY / window.innerHeight).toFixed(2),
      },

      button: event.button,
      modifiers: getModifiers(event),
    },

    meta: {
      source: "content-script",
    },
  });

  void sendEvent(payload);
}
