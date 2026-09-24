const RELATIVE_COORDINATE_FIELD = Object.freeze({
  inputType: "number",
  min: 0,
  max: 1,
  step: 0.01,

  validate(value) {
    if (
      typeof value !== "number" ||
      !Number.isFinite(value) ||
      value < 0 ||
      value > 1
    ) {
      throw new RangeError(
        "Relative coordinate must be a number between 0 and 1",
      );
    }
  },
});

export const EDITABLE_EVENT_FIELDS = Object.freeze({
  useCpee: Object.freeze({
    inputType: "checkbox",
  }),

  /* pause note */
  "data.note": Object.freeze({
    inputType: "text",
  }),

  "data.text": Object.freeze({
    inputType: "text",
  }),

  "data.added": Object.freeze({
    inputType: "text",
  }),

  "data.selectionStart": Object.freeze({
    inputType: "number",
    min: 0,
    step: 1,

    validate(value) {
      if (!Number.isInteger(value)) {
        throw new TypeError("Selection start must be an integer");
      }

      if (value < 0) {
        throw new RangeError("Selection start must be at least 0");
      }
    },
  }),

  "data.selectionEnd": Object.freeze({
    inputType: "number",
    min: 0,
    step: 1,

    validate(value) {
      if (!Number.isInteger(value)) {
        throw new TypeError("Selection end must be an integer");
      }

      if (value < 0) {
        throw new RangeError("Selection end must be at least 0");
      }
    },
  }),

  "data.key": Object.freeze({
    inputType: "select",
    options: Object.freeze([
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
    ]),
  }),

  /* click strategy */
  "data.strategy": Object.freeze({
    inputType: "select",
    options: Object.freeze(["css", "xy", "css_fallback_xy"]),

    validate(value) {
      if (!["css", "xy", "css_fallback_xy"].includes(value)) {
        throw new Error(`Invalid click strategy: ${value}`);
      }
    },
  }),

  "data.coordinateReference": Object.freeze({
    inputType: "select",
    options: Object.freeze(["element", "viewport"]),

    validate(value) {
      if (!["element", "viewport"].includes(value)) {
        throw new Error(`Invalid coordinate reference: ${value}`);
      }
    },
  }),

  /* draw markers for clicks */
  "data.debugMarker": Object.freeze({
    inputType: "checkbox",
  }),

  /* type text strategy */
  "data.typeTextStrategy": Object.freeze({
    inputType: "select",
    options: Object.freeze(["selector", "focused"]),

    validate(value) {
      if (!["selector", "focused"].includes(value)) {
        throw new Error(`Invalid type text strategy: ${value}`);
      }
    },
  }),

  /* rx ry of clicks */
  "data.selector.rx": RELATIVE_COORDINATE_FIELD,
  "data.selector.ry": RELATIVE_COORDINATE_FIELD,
  "data.viewportPosition.rx": RELATIVE_COORDINATE_FIELD,
  "data.viewportPosition.ry": RELATIVE_COORDINATE_FIELD,

  /* modifiers */
  "data.modifiers.alt": Object.freeze({
    inputType: "checkbox",
  }),

  "data.modifiers.ctrl": Object.freeze({
    inputType: "checkbox",
  }),

  "data.modifiers.meta": Object.freeze({
    inputType: "checkbox",
  }),

  "data.modifiers.shift": Object.freeze({
    inputType: "checkbox",
  }),

  // screenshot option
  "data.full": Object.freeze({
    inputType: "checkbox",
  }),
});

const SELECTOR_SEGMENT_FIELD = Object.freeze({
  inputType: "text",

  validate(value) {
    if (typeof value !== "string") {
      throw new TypeError("CSS selector must be a string");
    }

    if (value.trim() === "") {
      throw new Error("CSS selector must not be empty");
    }
  },
});

const SELECTOR_INDEX_FIELD = Object.freeze({
  inputType: "number",
  min: 0,
  step: 1,

  validate(value) {
    if (!Number.isInteger(value)) {
      throw new TypeError("Selector index must be an integer");
    }

    if (value < 0) {
      throw new RangeError("Selector index must be at least 0");
    }
  },
});

export function getEditableEventField(path) {
  const fixedField = EDITABLE_EVENT_FIELDS[path];

  if (fixedField) {
    return fixedField;
  }

  if (/^data\.selector\.segments\.\d+$/.test(path)) {
    return SELECTOR_SEGMENT_FIELD;
  }

  if (/^data\.selector\.indexes\.\d+$/.test(path)) {
    return SELECTOR_INDEX_FIELD;
  }

  return undefined;
}

export function validateEditableEventField(path, value) {
  const fieldDefinition = getEditableEventField(path);

  if (!fieldDefinition) {
    throw new Error(`Event field is not editable: ${path}`);
  }

  fieldDefinition.validate?.(value);
}
