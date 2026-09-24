import { createServiceCallWithScripts } from "./xml-templates/service-call-with-scripts.js";

export function createCreateSessionNode({
  id,
  headless = true,
  windowSize = [1440, 1000],
  timeout = 10,
}) {
  return createServiceCallWithScripts({
    id,
    endpoint: "sessions",
    label: "Create Session",
    method: ":post",

    arguments: {
      headless,
      windowSize: JSON.stringify(windowSize),
      timeout,
    },

    finalize: [
      '!data.id=result["sessionId"]',
      `!data.response_${id}=result`,
    ].join("\n"),
  });
}

export function createDeleteSessionNode({ id }) {
  return createServiceCallWithScripts({
    id,
    endpoint: "sessions",
    label: "Delete session",
    method: ":delete",

    arguments: {
      id: "!data.id",
    },

    finalize: `!data.response_${id}=result`,
  });
}

export function createPauseNode({ id, note }) {
  return createServiceCallWithScripts({
    id,
    endpoint: "",
    label: note || "Recording paused here. There might be stuff to do.",
    color: "#f8a8c6",
    arguments: {},
  });
}

export function createTypeTextNode({
  id,
  strategy = "selector",
  selectorType,
  selectorSegments,
  selectorIndexes,
  text,
  label = "Type text",
  skip = false,
  timeout = 5,
  interval = 0.1,
}) {
  return createServiceCallWithScripts({
    id,
    endpoint: "type_text",
    label,

    arguments: {
      id: "!data.id",
      skip,
      strategy,

      selectorType,
      selectorSegments: JSON.stringify(selectorSegments),
      selectorIndexes: JSON.stringify(selectorIndexes),

      text,
      timeout,
      interval,
    },

    finalize: `!data.response_${id}=result`,
  });
}

export function createPressSpecialKeyNode({
  id,
  key,
  modifiers = {},
  skip = false,
}) {
  return createServiceCallWithScripts({
    id,
    endpoint: "press_special_key",
    label: `Press ${key}`,

    arguments: {
      id: "!data.id",
      skip,
      key,
      shift: modifiers.shift ?? false,
      ctrl: modifiers.ctrl ?? false,
      alt: modifiers.alt ?? false,
      meta: modifiers.meta ?? false,
    },

    finalize: `!data.response_${id}=result`,
  });
}

export function createClickNode({
  id,
  selectorType,
  selectorSegments,
  selectorIndexes,
  strategy = "css_fallback_xy",
  rx = 0.5,
  ry = 0.5,
  timeout = 5,
  interval = 0.1,
  debugMarker = false,
  modifiers = {},
  skip = false,
}) {
  const hasSelector =
    selectorType != null &&
    Array.isArray(selectorSegments) &&
    Array.isArray(selectorIndexes);

  const argumentsData = {
    id: "!data.id",
    skip,
    strategy,

    ...(hasSelector
      ? {
          selectorType,
          selectorSegments: JSON.stringify(selectorSegments),
          selectorIndexes: JSON.stringify(selectorIndexes),
        }
      : {}),

    timeout,
    interval,
    rx,
    ry,
    debug_marker: debugMarker,
    shift: modifiers.shift ?? false,
    ctrl: modifiers.ctrl ?? false,
    alt: modifiers.alt ?? false,
    meta: modifiers.meta ?? false,
  };

  return createServiceCallWithScripts({
    id,
    endpoint: "click",
    label: "Click",
    arguments: argumentsData,
    finalize: `!data.response_${id}=result`,
  });
}

export function createSelectNode({
  id,
  selectorType,
  selectorSegments,
  selectorIndexes,
  selectedIndex,
  timeout = 5,
  interval = 0.1,
  skip = false,
}) {
  return createServiceCallWithScripts({
    id,
    endpoint: "select",
    label: "Select option",

    arguments: {
      id: "!data.id",
      skip,

      selectorType,
      selectorSegments: JSON.stringify(selectorSegments),
      selectorIndexes: JSON.stringify(selectorIndexes),

      selectedIndex,
      timeout,
      interval,
    },

    finalize: `!data.response_${id}=result`,
  });
}

export function createNavigateNode({ id, url, skip = false }) {
  return createServiceCallWithScripts({
    id,
    endpoint: "navigate",
    label: "Navigate",

    arguments: {
      id: "!data.id",
      skip,
      url,
    },

    finalize: `!data.response_${id}=result`,
  });
}

export function createCopyNode({
  id,
  selectorType,
  selectorSegments,
  selectorIndexes,
  selectionStart,
  selectionEnd,
  timeout = 5,
  interval = 0.1,
  skip = false,
}) {
  return createServiceCallWithScripts({
    id,
    endpoint: "copy",
    label: "Copy text",

    arguments: {
      id: "!data.id",
      skip,

      selectorType,
      selectorSegments: JSON.stringify(selectorSegments),
      selectorIndexes: JSON.stringify(selectorIndexes),

      selectionStart,
      selectionEnd,
      timeout,
      interval,
    },

    finalize: [
      `!data.response_${id}=result`,
      '!data.copied_text=result["copiedText"]',
    ].join("\n"),
  });
}

export function createPasteNode({
  id,
  selectorType,
  selectorSegments,
  selectorIndexes,
  fallbackText = "",
  skip = false,
  timeout = 5,
  interval = 0.1,
}) {
  const fallbackTextLiteral = JSON.stringify(fallbackText);

  return createServiceCallWithScripts({
    id,
    endpoint: "type_text",
    label: "Paste text",

    arguments: {
      id: "!data.id",
      skip,

      selectorType,
      selectorSegments: JSON.stringify(selectorSegments),
      selectorIndexes: JSON.stringify(selectorIndexes),

      text: "!data.copied_text",
      timeout,
      interval,
    },

    prepare: `!data.copied_text ||= ${fallbackTextLiteral}`,
    finalize: `!data.response_${id}=result`,
  });
}

export function createCutNode({
  id,
  selectorType,
  selectorSegments,
  selectorIndexes,
  selectionStart,
  selectionEnd,
  timeout = 5,
  interval = 0.1,
  skip = false,
}) {
  return createServiceCallWithScripts({
    id,
    endpoint: "cut",
    label: "Cut text",

    arguments: {
      id: "!data.id",
      skip,

      selectorType,
      selectorSegments: JSON.stringify(selectorSegments),
      selectorIndexes: JSON.stringify(selectorIndexes),

      selectionStart,
      selectionEnd,
      timeout,
      interval,
    },

    finalize: [
      `!data.response_${id}=result`,
      '!data.copied_text=result["copiedText"]',
    ].join("\n"),
  });
}

export function createScreenshotNode({ id, full = false, skip = false }) {
  return createServiceCallWithScripts({
    id,
    endpoint: "screenshot",
    label: "Screenshot",

    arguments: {
      id: "!data.id",
      skip,
      full,
    },

    finalize: [
      `!data.response_${id}=result`,
      `!data.screenshot_url_${id}=result["screenshotUrl"]`,
    ].join("\n"),
  });
}

export function createElementOuterHtmlNode({
  id,
  selectorType,
  selectorSegments,
  selectorIndexes,
  timeout = 5,
  interval = 0.1,
  skip = false,
}) {
  return createServiceCallWithScripts({
    id,
    endpoint: "element",
    label: "Get Element HTML",

    arguments: {
      id: "!data.id",
      skip,

      selectorType,
      selectorSegments: JSON.stringify(selectorSegments),
      selectorIndexes: JSON.stringify(selectorIndexes),

      timeout,
      interval,
    },

    finalize: [
      `!data.response_${id}=result`,
      `!data.element_html_${id}=result["element"]`,
    ].join("\n"),
  });
}
