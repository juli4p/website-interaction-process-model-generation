import { createEvent } from "../../shared/events/event-factory.js";
import { EventType } from "../../shared/events/event-types.js";
import { buildElementSelector } from "../helpers/element-selector.js";
import { getOriginalEventTarget } from "../helpers/event-target.js";
import { buildLocators } from "../helpers/locators.js";
import { sendEvent } from "../send-event.js";

export function registerSelectListener() {
  document.addEventListener("input", handleSelectInput, true);
}

function handleSelectInput(event) {
  const target = getOriginalEventTarget(event);

  if (!(target instanceof HTMLSelectElement)) {
    return;
  }

  const selectedOption = target.selectedOptions[0] ?? null;
  const locators = buildLocators(event, target);
  const selectorResult = buildElementSelector(target, locators);

  void sendEvent(
    createEvent({
      type: EventType.SELECT,

      context: {
        url: window.location.href,
      },

      locators,

      data: {
        value: target.value,
        selectedIndex: target.selectedIndex,
        selectedText: selectedOption?.textContent?.trim() ?? null,

        selector: {
          type: selectorResult?.type ?? null,
          segments: selectorResult?.segments ?? [],
          indexes: selectorResult?.indexes ?? [],
          matchCounts: selectorResult?.matchCounts ?? [],
        },
      },

      meta: {
        source: "content-script",
      },
    }),
  );
}
