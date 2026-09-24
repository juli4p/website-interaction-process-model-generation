import { EventType } from "../../shared/events/event-types.js";
import {
  getEditableEventField,
  validateEditableEventField,
} from "../../shared/events/editable-event-fields.js";

export function createCompactEventDetails({
  event,
  onChange,
  onSelectorSegmentChange,
  onSelectorHighlight,
  onSelectorHighlightClear,
}) {
  const container = document.createElement("div");
  container.className = "compact-event-details";

  const selectorHighlightOptions = {
    onSelectorSegmentChange,
    onSelectorHighlight,
    onSelectorHighlightClear,
  };

  switch (event.type) {
    case EventType.NAVIGATE:
      renderNavigateDetails(container, event, onChange);
      break;

    case EventType.CLICK:
      renderClickDetails(container, event, onChange, selectorHighlightOptions);
      break;

    case EventType.INPUT:
      renderInputDetails(container, event, onChange, selectorHighlightOptions);
      break;

    case EventType.SELECT:
      renderSelectDetails(container, event, onChange, selectorHighlightOptions);
      break;

    case EventType.SPECIAL_KEY:
      renderSpecialKeyDetails(container, event, onChange);
      break;

    case EventType.PASTE:
      renderPasteDetails(container, event, onChange, selectorHighlightOptions);
      break;

    case EventType.COPY:
    case EventType.CUT:
      renderCopyOrCutDetails(
        container,
        event,
        onChange,
        selectorHighlightOptions,
      );
      break;

    case EventType.PAUSE:
      renderPauseDetails(container, event, onChange);
      break;

    case EventType.SCREENSHOT:
      renderScreenshotDetails(container, event, onChange);
      break;

    case EventType.ELEMENT_OUTER_HTML:
      renderElementOuterHtmlDetails(
        container,
        event,
        onChange,
        selectorHighlightOptions,
      );
      break;

    default:
      renderFallbackDetails(container, event, onChange);
  }

  container.append(createRawJsonView(event));

  return container;
}

function renderNavigateDetails(container, event, onChange) {
  container.append(
    createField({
      label: "Type",
      value: event.type,
    }),

    createLinkField({
      label: "URL",
      url: event.context?.url,
    }),
  );
}

function renderClickDetails(
  container,
  event,
  onChange,
  selectorHighlightOptions,
) {
  const strategy = event.data?.strategy ?? "css_fallback_xy";

  const coordinateReference = event.data?.coordinateReference ?? "element";

  container.append(
    createField({
      label: "Type",
      value: event.type,
    }),

    createLinkField({
      label: "URL",
      url: event.context?.url,
    }),

    createField({
      label: "Strategy",
      value: strategy,
      path: "data.strategy",
      onChange,
    }),

    createField({
      label: "Draw Debug Marker",
      value: event.data?.debugMarker ?? false,
      path: "data.debugMarker",
      onChange,
    }),
  );

  if (strategy === "xy") {
    container.append(
      createField({
        label: "Coordinate Reference",
        value: coordinateReference,
        path: "data.coordinateReference",
        onChange,
      }),
    );
  }

  if (strategy !== "xy" || coordinateReference === "element") {
    container.append(
      createSelectorView(
        event.data?.selector,
        onChange,
        true,
        selectorHighlightOptions,
      ),
    );
  } else {
    container.append(
      createPositionView(
        event.data?.viewportPosition,
        onChange,
        "data.viewportPosition",
      ),
    );
  }

  container.append(
    createModifiersView(event.data?.modifiers, onChange),
    createLocatorsView(event.locators),
  );
}

function renderInputDetails(
  container,
  event,
  onChange,
  selectorHighlightOptions,
) {
  container.append(
    createField({
      label: "Type",
      value: event.type,
    }),

    createLinkField({
      label: "URL",
      url: event.context?.url,
    }),

    createField({
      label: "Strategy",
      value: event.data?.typeTextStrategy ?? "selector",
      path: "data.typeTextStrategy",
      onChange,
    }),

    createField({
      label: "Added",
      value: event.data?.added,
      path: "data.added",
      onChange,
    }),

    createField({
      label: "Input Type",
      value: event.data?.inputType,
    }),

    createField({
      label: "Length",
      value: event.data?.valueLength,
    }),
    createSelectorView(
      event.data?.selector,
      onChange,
      false,
      selectorHighlightOptions,
    ),
    createLocatorsView(event.locators),
  );
}

function renderSelectDetails(
  container,
  event,
  onChange,
  selectorHighlightOptions,
) {
  container.append(
    createField({
      label: "Type",
      value: event.type,
    }),

    createLinkField({
      label: "URL",
      url: event.context?.url,
    }),

    createField({
      label: "Selected",
      value: event.data?.selectedText,
    }),

    createField({
      label: "Value",
      value: event.data?.value,
    }),

    createField({
      label: "Index",
      value: event.data?.selectedIndex,
    }),

    createSelectorView(
      event.data?.selector,
      onChange,
      false,
      selectorHighlightOptions,
    ),

    createLocatorsView(event.locators),
  );
}

function renderSpecialKeyDetails(container, event, onChange) {
  container.append(
    createField({
      label: "Type",
      value: event.type,
    }),

    createLinkField({
      label: "URL",
      url: event.context?.url,
    }),

    createField({
      label: "Key",
      value: event.data?.key,
      path: "data.key",
      onChange,
    }),

    createField({
      label: "Code",
      value: event.data?.code,
    }),

    createField({
      label: "Repeat",
      value: event.data?.repeat,
    }),

    createModifiersView(event.data?.modifiers, onChange),
    createLocatorsView(event.locators),
  );
}

function renderPasteDetails(
  container,
  event,
  onChange,
  selectorHighlightOptions,
) {
  container.append(
    createField({
      label: "Type",
      value: event.type,
    }),

    createLinkField({
      label: "URL",
      url: event.context?.url,
    }),

    createField({
      label: "Text",
      value: event.data?.text,
      path: "data.text",
      onChange,
    }),

    createField({
      label: "Length",
      value: event.data?.length,
    }),
    createSelectorView(
      event.data?.selector,
      onChange,
      false,
      selectorHighlightOptions,
    ),
    createLocatorsView(event.locators),
  );
}

function renderCopyOrCutDetails(
  container,
  event,
  onChange,
  selectorHighlightOptions,
) {
  container.append(
    createField({
      label: "Type",
      value: event.type,
    }),

    createLinkField({
      label: "URL",
      url: event.context?.url,
    }),

    createSelectorView(
      event.data?.selector,
      onChange,
      false,
      selectorHighlightOptions,
    ),

    createField({
      label: "Selected Text",
      value: event.data?.selectedText,
    }),

    createField({
      label: "Selection Start",
      value: event.data?.selectionStart,
      path: "data.selectionStart",
      onChange,
    }),

    createField({
      label: "Selection End",
      value: event.data?.selectionEnd,
      path: "data.selectionEnd",
      onChange,
    }),

    createLocatorsView(event.locators),
  );
}

function renderPauseDetails(container, event, onChange) {
  container.append(
    createField({
      label: "Type",
      value: event.type,
    }),

    createField({
      label: "Note",
      value: event.data?.note,
      path: "data.note",
      onChange,
    }),
  );
}

function renderScreenshotDetails(container, event, onChange) {
  container.append(
    createField({
      label: "Type",
      value: event.type,
    }),

    createLinkField({
      label: "URL",
      url: event.context?.url,
    }),

    createField({
      label: "Full Page",
      value: event.data?.full,
      path: "data.full",
      onChange,
    }),
  );
}

function renderElementOuterHtmlDetails(
  container,
  event,
  onChange,
  selectorHighlightOptions,
) {
  container.append(
    createField({
      label: "Type",
      value: event.type,
    }),

    createLinkField({
      label: "URL",
      url: event.context?.url,
    }),

    createSelectorView(
      event.data?.selector,
      onChange,
      false,
      selectorHighlightOptions,
    ),

    createLocatorsView(event.locators),
  );
}

function renderFallbackDetails(container, event, onChange) {
  container.append(
    createField({
      label: "Type",
      value: event.type,
    }),
  );
}

function createField({
  label,
  value,
  path,
  onChange,
  onInput,
  onFocus,
  onBlur,
}) {
  const fieldDefinition = path ? getEditableEventField(path) : null;

  if (!fieldDefinition) {
    return createReadonlyField({
      label,
      value,
    });
  }

  return createEditableField({
    label,
    value,
    path,
    onChange,
    onInput,
    onFocus,
    onBlur,
    fieldDefinition,
  });
}

function createLinkField({ label, url }) {
  const row = document.createElement("div");
  row.className = "compact-event-row";

  const name = document.createElement("span");
  name.className = "compact-event-row__name";
  name.textContent = label;

  const displayedValue = document.createElement("a");
  displayedValue.className = "compact-event-row__value compact-event-row__link";

  if (typeof url === "string" && url.trim() !== "") {
    displayedValue.href = url;
    displayedValue.textContent = url;
    displayedValue.target = "_blank";
    displayedValue.rel = "noopener noreferrer";
    displayedValue.title = url;
  } else {
    displayedValue.textContent = "—";
  }

  row.append(name, displayedValue);

  return row;
}

function createReadonlyField({ label, value }) {
  const row = document.createElement("div");
  row.className = "compact-event-row";

  const name = document.createElement("span");
  name.className = "compact-event-row__name";
  name.textContent = label;

  const displayedValue = document.createElement("span");
  displayedValue.className = "compact-event-row__value";
  displayedValue.textContent = formatValue(value);

  row.append(name, displayedValue);

  return row;
}

function createDynamicReadonlyField({ label, value }) {
  const row = document.createElement("div");
  row.className = "compact-event-row";

  const name = document.createElement("span");
  name.className = "compact-event-row__name";
  name.textContent = label;

  const displayedValue = document.createElement("span");
  displayedValue.className = "compact-event-row__value";
  displayedValue.textContent = formatValue(value);

  row.append(name, displayedValue);

  return {
    element: row,

    setValue(newValue) {
      displayedValue.textContent = formatValue(newValue);
    },
  };
}

function createEditableField({
  label,
  value,
  path,
  onChange,
  onInput,
  onFocus,
  onBlur,
  fieldDefinition,
}) {
  const row = document.createElement("label");
  row.className = "compact-event-row";

  const name = document.createElement("span");
  name.className = "compact-event-row__name";
  name.textContent = label;

  const input = createInput(value, fieldDefinition);
  input.className = "compact-event-row__input";

  input.addEventListener("focus", () => {
    onFocus?.();
  });

  input.addEventListener("input", () => {
    try {
      const newValue = parseInputValue(input, fieldDefinition);
      onInput?.(newValue);
    } catch {
      // input value may be empty or invalid during typing
    }
  });

  input.addEventListener("blur", () => {
    onBlur?.();
  });

  input.addEventListener("change", async () => {
    const previousValue = value;
    input.disabled = true;

    try {
      const newValue = parseInputValue(input, fieldDefinition);

      validateEditableEventField(path, newValue);
      await onChange(path, newValue);

      value = newValue;
    } catch (error) {
      setInputValue(input, previousValue, fieldDefinition);
      console.error(`Could not update ${path}:`, error);
    } finally {
      input.disabled = false;
    }
  });

  row.append(name, input);

  return row;
}

function createSelectorView(
  selector = {},
  onChange,
  showPosition = false,
  {
    onSelectorSegmentChange,
    onSelectorHighlight,
    onSelectorHighlightClear,
  } = {},
) {
  const section = document.createElement("section");
  section.className = "compact-event-group";

  const heading = document.createElement("span");
  heading.className = "compact-event-group__heading";
  heading.textContent = "Selector";

  const fields = document.createElement("div");
  fields.className = "compact-event-group__content";

  fields.append(
    createField({
      label: "Type",
      value: selector.type,
    }),
  );

  const segments = Array.isArray(selector.segments)
    ? [...selector.segments]
    : [];

  const indexes = Array.isArray(selector.indexes)
    ? [...selector.indexes]
    : segments.map(() => 0);

  const matchCounts = Array.isArray(selector.matchCounts)
    ? [...selector.matchCounts]
    : [];

  const matchCountViews = [];

  const createCurrentSelector = () => ({
    ...selector,
    segments: [...segments],
    indexes: [...indexes],
  });

  const showHighlight = async () => {
    try {
      const currentSelector = createCurrentSelector();

      const result = await onSelectorHighlight?.(currentSelector);

      if (!result) {
        return null;
      }

      const currentMatchCounts =
        Array.isArray(result.matchCounts) && result.matchCounts.length > 0
          ? result.matchCounts
          : [result.matchCount ?? 0];

      for (let index = 0; index < matchCountViews.length; index += 1) {
        const matchCount = currentMatchCounts[index] ?? 0;

        matchCounts[index] = matchCount;
        matchCountViews[index].setValue(matchCount);
      }

      return result;
    } catch (error) {
      for (let index = 0; index < matchCountViews.length; index += 1) {
        matchCounts[index] = 0;
        matchCountViews[index].setValue(0);
      }

      await onSelectorHighlightClear?.();
      console.debug("Could not highlight selector:", error);

      return null;
    }
  };

  if (segments.length === 0) {
    fields.append(
      createReadonlyField({
        label: "Segments",
        value: "No selector segments",
      }),
    );
  } else {
    segments.forEach((segment, index) => {
      const segmentGroup = document.createElement("div");
      segmentGroup.className = "compact-selector-segment";

      const segmentHeading = document.createElement("span");
      segmentHeading.className = "compact-selector-segment__heading";
      segmentHeading.textContent = getSelectorSegmentLabel(
        selector.type,
        index,
        segments.length,
      );

      const segmentFields = document.createElement("div");
      segmentFields.className = "compact-selector-segment__fields";

      const selectorField = createField({
        label: "Selector",
        value: segment,
        path: `data.selector.segments.${index}`,

        onChange: async (_path, newValue) => {
          segments[index] = newValue;

          const result = await onSelectorHighlight?.(createCurrentSelector());
          const newMatchCount = result?.matchCounts?.[index] ?? 0;

          matchCounts[index] = newMatchCount;
          matchCountViews[index]?.setValue(newMatchCount);

          await onSelectorSegmentChange(index, {
            segment: newValue,
            index: indexes[index] ?? 0,
            matchCount: newMatchCount,
          });
        },

        onInput: (newValue) => {
          segments[index] = newValue;
          void showHighlight();
        },

        onFocus: showHighlight,
      });

      const indexField = createField({
        label: "Index",
        value: indexes[index] ?? 0,
        path: `data.selector.indexes.${index}`,

        onChange: async (_path, newValue) => {
          indexes[index] = newValue;

          const result = await onSelectorHighlight?.(createCurrentSelector());
          const newMatchCount = result?.matchCounts?.[index] ?? 0;

          matchCounts[index] = newMatchCount;
          matchCountViews[index]?.setValue(newMatchCount);

          await onSelectorSegmentChange(index, {
            segment: segments[index],
            index: newValue,
            matchCount: newMatchCount,
          });
        },

        onInput: (newValue) => {
          if (Number.isInteger(newValue) && newValue >= 0) {
            indexes[index] = newValue;
            void showHighlight();
          }
        },

        onFocus: showHighlight,
      });

      const matchCountView = createDynamicReadonlyField({
        label: "Matches",
        value: matchCounts[index] ?? "?",
      });

      matchCountViews[index] = matchCountView;
      segmentFields.append(selectorField, indexField, matchCountView.element);

      segmentGroup.append(segmentHeading, segmentFields);
      fields.append(segmentGroup);
    });
  }

  if (showPosition) {
    fields.append(
      createField({
        label: "RX",
        value: selector.rx,
        path: "data.selector.rx",
        onChange,
      }),

      createField({
        label: "RY",
        value: selector.ry,
        path: "data.selector.ry",
        onChange,
      }),
    );
  }

  section.append(heading, fields);

  return section;
}

function createPositionView(
  position = {},
  onChange,
  pathPrefix = "data.selector",
) {
  const section = document.createElement("section");
  section.className = "compact-event-group";

  const heading = document.createElement("span");
  heading.className = "compact-event-group__heading";
  heading.textContent = "Position";

  const fields = document.createElement("div");
  fields.className = "compact-event-group__content";

  fields.append(
    createField({
      label: "RX",
      value: position.rx,
      path: `${pathPrefix}.rx`,
      onChange,
    }),

    createField({
      label: "RY",
      value: position.ry,
      path: `${pathPrefix}.ry`,
      onChange,
    }),
  );

  section.append(heading, fields);

  return section;
}

function getSelectorSegmentLabel(selectorType, index, segmentCount) {
  if (selectorType !== "shadow_css") {
    return "CSS selector";
  }

  if (index === segmentCount - 1) {
    return "Target selector";
  }

  if (segmentCount === 2) {
    return "Shadow host";
  }

  return `Shadow host ${index + 1}`;
}

function createModifiersView(modifiers = {}, onChange) {
  const section = document.createElement("section");
  section.className = "compact-event-group";

  const heading = document.createElement("span");
  heading.className = "compact-event-group__heading";
  heading.textContent = "Modifiers";

  const fields = document.createElement("div");
  fields.className = "compact-event-group__content";

  fields.append(
    createField({
      label: "Ctrl",
      value: modifiers.ctrl ?? false,
      path: "data.modifiers.ctrl",
      onChange,
    }),

    createField({
      label: "Shift",
      value: modifiers.shift ?? false,
      path: "data.modifiers.shift",
      onChange,
    }),

    createField({
      label: "Alt",
      value: modifiers.alt ?? false,
      path: "data.modifiers.alt",
      onChange,
    }),

    createField({
      label: "Meta",
      value: modifiers.meta ?? false,
      path: "data.modifiers.meta",
      onChange,
    }),
  );

  section.append(heading, fields);

  return section;
}

function createLocatorsView(locators) {
  const section = document.createElement("section");
  section.className = "compact-event-group";

  const locatorList = Array.isArray(locators) ? locators : [];

  const heading = document.createElement("span");
  heading.className = "compact-event-group__heading";
  heading.textContent = `Recorded locators (${locatorList.length})`;

  const list = document.createElement("div");
  list.className = "compact-event-group__content";

  if (locatorList.length === 0) {
    list.append(
      createReadonlyField({
        label: "Locators",
        value: "No locators",
      }),
    );
  } else {
    locatorList.forEach((locator, index) => {
      list.append(createLocatorDetails(locator, index));
    });
  }

  section.append(heading, list);

  return section;
}

function createLocatorDetails(locator, index) {
  const details = document.createElement("details");
  details.className = "compact-event-locator";

  const summary = document.createElement("summary");
  summary.textContent = getLocatorTitle(locator, index);

  const content = document.createElement("div");
  content.className = "compact-event-locator__content";

  const tag = locator.value?.tag;
  const attributes = locator.value?.attributes;
  const position = locator.position;

  content.append(
    createReadonlyField({
      label: "Kind",
      value: formatLocatorKind(locator.kind),
    }),

    createReadonlyField({
      label: "Tag",
      value: tag,
    }),
  );

  content.append(createAttributesView(attributes));

  if (position) {
    content.append(
      createReadonlyField({
        label: "RX",
        value: position.rx,
      }),

      createReadonlyField({
        label: "RY",
        value: position.ry,
      }),
    );
  }

  details.append(summary, content);

  return details;
}

function createAttributesView(attributes) {
  const container = document.createElement("div");
  container.className = "compact-event-locator__attributes";

  const entries =
    attributes && typeof attributes === "object"
      ? Object.entries(attributes)
      : [];

  if (entries.length === 0) {
    container.append(
      createReadonlyField({
        label: "Attributes",
        value: "No attributes",
      }),
    );

    return container;
  }

  for (const [name, value] of entries) {
    container.append(
      createReadonlyField({
        label: `@${name}`,
        value,
      }),
    );
  }

  return container;
}

function formatLocatorKind(kind) {
  switch (kind) {
    case "attributes":
      return "Target element";

    case "parent_attributes":
      return "Parent element";

    case "parent_parent_attributes":
      return "Grandparent element";

    default:
      return kind ?? "Unknown";
  }
}

function getLocatorTitle(locator, index) {
  const label = formatLocatorKind(locator.kind);
  const tag = locator.value?.tag;

  return tag ? `${index + 1}. ${label} <${tag}>` : `${index + 1}. ${label}`;
}

function createRawJsonView(event) {
  const details = document.createElement("details");
  details.className = "activity-event__raw";

  const summary = document.createElement("summary");
  summary.textContent = "Raw JSON";

  const json = document.createElement("pre");
  json.className = "activity-event__json";
  json.textContent = JSON.stringify(event, null, 2);

  details.append(summary, json);

  return details;
}

function createInput(value, fieldDefinition) {
  if (fieldDefinition.inputType === "select") {
    const select = document.createElement("select");

    for (const optionValue of fieldDefinition.options ?? []) {
      const option = document.createElement("option");
      option.value = optionValue;
      option.textContent = optionValue;
      option.selected = optionValue === value;

      select.append(option);
    }

    return select;
  }

  const input = document.createElement("input");
  input.type = fieldDefinition.inputType;

  setNumberAttribute(input, "min", fieldDefinition.min);
  setNumberAttribute(input, "max", fieldDefinition.max);
  setNumberAttribute(input, "step", fieldDefinition.step);

  setInputValue(input, value, fieldDefinition);

  return input;
}

function parseInputValue(input, fieldDefinition) {
  if (fieldDefinition.inputType === "checkbox") {
    return input.checked;
  }

  if (fieldDefinition.inputType === "number") {
    const number = Number(input.value);

    if (!Number.isFinite(number)) {
      throw new TypeError(`Invalid number: ${input.value}`);
    }

    return number;
  }

  return input.value;
}

function setInputValue(input, value, fieldDefinition) {
  if (fieldDefinition.inputType === "checkbox") {
    input.checked = Boolean(value);
    return;
  }

  input.value = value === null || value === undefined ? "" : String(value);
}

function setNumberAttribute(input, name, value) {
  if (typeof value === "number") {
    input[name] = String(value);
  }
}

function formatValue(value) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  return String(value);
}
