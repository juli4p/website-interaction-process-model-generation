export const EventType = Object.freeze({
  CLICK: "click",
  INPUT: "input",
  SELECT: "select",
  SPECIAL_KEY: "special_key",
  COPY: "copy",
  CUT: "cut",
  PASTE: "paste",
  NAVIGATE: "navigate",
  PAUSE: "pause",
  // manual events
  SCREENSHOT: "screenshot",
  ELEMENT_OUTER_HTML: "element_outer_html",
});

const EVENT_TYPE_VALUES = new Set(Object.values(EventType));

export function isEventType(value) {
  return EVENT_TYPE_VALUES.has(value);
}
