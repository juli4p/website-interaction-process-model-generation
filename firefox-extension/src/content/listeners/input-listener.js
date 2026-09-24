import { createEvent } from "../../shared/events/event-factory.js";
import { EventType } from "../../shared/events/event-types.js";
import { buildElementSelector } from "../helpers/element-selector.js";
import { getOriginalEventTarget } from "../helpers/event-target.js";
import { buildLocators } from "../helpers/locators.js";
import { sendEvent } from "../send-event.js";

export function registerInputListener() {
  document.addEventListener("input", handleInput, true);
}

function handleInput(event) {
  const target = getOriginalEventTarget(event);
  const editableTarget = getEditableTarget(target);

  if (!editableTarget) {
    return;
  }

  // Only record text entered directly via keyboard.
  if (event.inputType !== "insertText") {
    return;
  }

  const added = event.data;

  if (!added) {
    return;
  }

  const locators = buildLocators(event, editableTarget);
  const selectorResult = buildElementSelector(editableTarget, locators);

  void sendEvent(
    createEvent({
      type: EventType.INPUT,

      context: {
        url: window.location.href,
      },

      locators,

      data: {
        inputType: event.inputType,
        added,
        valueLength: added.length,
        editableType: getEditableType(editableTarget),
        typeTextStrategy: "selector",

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

function getEditableTarget(target) {
  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement
  ) {
    return target;
  }

  if (target instanceof HTMLElement && target.isContentEditable) {
    return target;
  }

  return null;
}

function getEditableType(target) {
  if (target instanceof HTMLInputElement) {
    return "input";
  }

  if (target instanceof HTMLTextAreaElement) {
    return "textarea";
  }

  return "contenteditable";
}
