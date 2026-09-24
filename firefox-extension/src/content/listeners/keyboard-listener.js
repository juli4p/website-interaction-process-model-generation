import { createEvent } from "../../shared/events/event-factory.js";
import { EventType } from "../../shared/events/event-types.js";
import { buildLocators } from "../helpers/locators.js";
import { getModifiers } from "../helpers/modifiers.js";
import { sendEvent } from "../send-event.js";
import { getOriginalEventTarget } from "../helpers/event-target.js";

const SPECIAL_KEYS = new Set([
  "Enter",
  "Escape",
  "Tab",
  "Backspace",
  "Delete",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Home",
  "End",
  "PageUp",
  "PageDown",
]);

export function registerKeyboardListener() {
  document.addEventListener("keydown", handleKeydown, true);
}

function handleKeydown(event) {
  // only log special keys (input handles other keys)
  if (!SPECIAL_KEYS.has(event.key)) {
    return;
  }

  const target = getOriginalEventTarget(event);

  const payload = createEvent({
    type: EventType.SPECIAL_KEY,
    context: {
      url: location.href,
    },
    locators: target ? buildLocators(event, target) : [],
    data: {
      key: event.key,
      code: event.code,
      repeat: event.repeat,
      modifiers: getModifiers(event),
    },
    meta: {
      source: "content-script",
    },
  });

  void sendEvent(payload);
}
