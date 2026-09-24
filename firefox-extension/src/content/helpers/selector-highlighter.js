import { MessageType } from "../../shared/messages/message-types.js";

const HIGHLIGHT_BORDER_WIDTH = 3;

let highlightedElement = null;
let overlay = null;
let clickMarker = null;
let highlightedClickPosition = null;
let highlightedViewportPosition = null;

export function registerSelectorHighlighter() {
  browser.runtime.onMessage.addListener((message) => {
    switch (message?.type) {
      case MessageType.HIGHLIGHT_SELECTOR:
        return Promise.resolve(
          highlightSelector(message.selector, message.clickPosition),
        );

      case MessageType.HIGHLIGHT_VIEWPORT_POSITION:
        return Promise.resolve(highlightViewportPosition(message.position));

      case MessageType.CLEAR_SELECTOR_HIGHLIGHT:
        clearSelectorHighlight();

        return Promise.resolve({
          cleared: true,
        });

      default:
        return undefined;
    }
  });

  window.addEventListener("scroll", updateHighlightPosition, true);
  window.addEventListener("resize", updateHighlightPosition);
}

function highlightSelector(selector, clickPosition = null) {
  clearSelectorHighlight();
  const resolution = resolveSelector(selector);

  if (!resolution.element) {
    return {
      highlighted: false,
      error: resolution.error,
      failedSegmentIndex: resolution.failedSegmentIndex ?? null,
      matchCount: resolution.matchCount ?? 0,
      matchCounts: resolution.matchCounts ?? [],
    };
  }

  highlightedElement = resolution.element;
  highlightedClickPosition = normalizeClickPosition(clickPosition);
  overlay = createOverlay();

  document.documentElement.appendChild(overlay);
  if (highlightedClickPosition) {
    clickMarker = createClickMarker();
    document.documentElement.appendChild(clickMarker);
  }

  updateOverlayPosition();

  return {
    highlighted: true,
    matchCount: resolution.matchCount,
    matchCounts: resolution.matchCounts,
  };
}

function highlightViewportPosition(position) {
  clearSelectorHighlight();

  const normalizedPosition = normalizeClickPosition(position);

  if (!normalizedPosition) {
    return {
      highlighted: false,
      error: "Invalid viewport position",
    };
  }

  highlightedViewportPosition = normalizedPosition;

  clickMarker = createClickMarker();
  document.documentElement.appendChild(clickMarker);

  updateViewportMarkerPosition();

  return {
    highlighted: true,
  };
}

function resolveSelector(selector = {}) {
  const segments = Array.isArray(selector.segments) ? selector.segments : [];
  const indexes = Array.isArray(selector.indexes) ? selector.indexes : [];

  if (segments.length === 0) {
    return {
      element: null,
      error: "No selector segments provided",
    };
  }

  let root = document;
  let currentElement = null;
  const matchCounts = [];

  for (
    let segmentIndex = 0;
    segmentIndex < segments.length;
    segmentIndex += 1
  ) {
    const segment = segments[segmentIndex];
    const selectedIndex = indexes[segmentIndex] ?? 0;

    if (typeof segment !== "string" || segment.trim() === "") {
      return {
        element: null,
        error: "Selector segment is invalid or empty",
        failedSegmentIndex: segmentIndex,
        matchCount: 0,
        matchCounts,
      };
    }

    if (!Number.isInteger(selectedIndex) || selectedIndex < 0) {
      return {
        element: null,
        error: `Invalid selector index: ${selectedIndex}`,
        failedSegmentIndex: segmentIndex,
        matchCount: 0,
        matchCounts,
      };
    }

    let matches;

    try {
      matches = root.querySelectorAll(segment);
    } catch (error) {
      return {
        element: null,
        error: `Invalid CSS selector: ${error.message}`,
        failedSegmentIndex: segmentIndex,
        matchCount: 0,
        matchCounts,
      };
    }

    matchCounts[segmentIndex] = matches.length;
    currentElement = matches[selectedIndex] ?? null;

    if (!currentElement) {
      return {
        element: null,
        error: `Index ${selectedIndex} is outside ${matches.length} matches`,
        failedSegmentIndex: segmentIndex,
        matchCount: matches.length,
        matchCounts,
      };
    }

    const isLastSegment = segmentIndex === segments.length - 1;

    if (!isLastSegment) {
      if (!currentElement.shadowRoot) {
        return {
          element: null,
          error: "Selected shadow host has no open shadow root",
          failedSegmentIndex: segmentIndex,
          matchCount: matches.length,
          matchCounts,
        };
      }

      root = currentElement.shadowRoot;
    }
  }

  return {
    element: currentElement,
    matchCount: matchCounts.at(-1) ?? 0,
    matchCounts,
  };
}

function createOverlay() {
  const element = document.createElement("div");

  Object.assign(element.style, {
    position: "fixed",
    zIndex: "2147483647",
    pointerEvents: "none",
    border: `${HIGHLIGHT_BORDER_WIDTH}px solid red`,
    boxSizing: "border-box",
    background: "rgba(255, 0, 0, 0.08)",
    borderRadius: "2px",
  });

  return element;
}

function createClickMarker() {
  const marker = document.createElement("div");

  Object.assign(marker.style, {
    position: "fixed",
    width: "12px",
    height: "12px",
    borderRadius: "50%",
    background: "red",
    border: "2px solid white",
    boxShadow: "0 0 4px rgba(0, 0, 0, 0.6)",
    zIndex: "2147483647",
    pointerEvents: "none",
    boxSizing: "border-box",
  });

  return marker;
}

function updateHighlightPosition() {
  if (highlightedViewportPosition) {
    updateViewportMarkerPosition();
    return;
  }

  updateOverlayPosition();
}

function updateOverlayPosition() {
  if (!overlay || !highlightedElement?.isConnected) {
    clearSelectorHighlight();
    return;
  }

  const rectangle = highlightedElement.getBoundingClientRect();

  const visible = rectangle.width > 0 && rectangle.height > 0;

  Object.assign(overlay.style, {
    left: `${rectangle.left}px`,
    top: `${rectangle.top}px`,
    width: `${rectangle.width}px`,
    height: `${rectangle.height}px`,
    display: visible ? "block" : "none",
  });

  if (clickMarker && highlightedClickPosition) {
    const x = rectangle.left + rectangle.width * highlightedClickPosition.rx;
    const y = rectangle.top + rectangle.height * highlightedClickPosition.ry;

    Object.assign(clickMarker.style, {
      left: `${x - 6}px`,
      top: `${y - 6}px`,
      display: visible ? "block" : "none",
    });
  }
}

function updateViewportMarkerPosition() {
  if (!clickMarker || !highlightedViewportPosition) {
    return;
  }

  const x = window.innerWidth * highlightedViewportPosition.rx;
  const y = window.innerHeight * highlightedViewportPosition.ry;

  Object.assign(clickMarker.style, {
    left: `${x - 6}px`,
    top: `${y - 6}px`,
    display: "block",
  });
}

function clearSelectorHighlight() {
  overlay?.remove();
  clickMarker?.remove();

  overlay = null;
  clickMarker = null;
  highlightedElement = null;
  highlightedClickPosition = null;
  highlightedViewportPosition = null;
}

function normalizeClickPosition(clickPosition) {
  const rx = clickPosition?.rx;
  const ry = clickPosition?.ry;

  if (
    typeof rx !== "number" ||
    typeof ry !== "number" ||
    !Number.isFinite(rx) ||
    !Number.isFinite(ry) ||
    rx < 0 ||
    rx > 1 ||
    ry < 0 ||
    ry > 1
  ) {
    return null;
  }

  return {
    rx,
    ry,
  };
}
