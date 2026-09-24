import { createEvent } from "../../shared/events/event-factory.js";
import { EventType } from "../../shared/events/event-types.js";
import { buildElementSelector } from "../helpers/element-selector.js";
import { getOriginalEventTarget } from "../helpers/event-target.js";
import { buildLocators } from "../helpers/locators.js";
import { sendEvent } from "../send-event.js";

const CLIPBOARD_EVENTS = [EventType.COPY, EventType.CUT, EventType.PASTE];

export function registerClipboardListeners() {
  for (const eventType of CLIPBOARD_EVENTS) {
    document.addEventListener(
      eventType,
      (event) => handleClipboardEvent(eventType, event),
      true,
    );
  }
}

function handleClipboardEvent(type, event) {
  if (type === EventType.PASTE) {
    sendPasteEvent(event);
    return;
  }

  sendCopyOrCutEvent(type, event);
}

function sendCopyOrCutEvent(type, event) {
  const selectionData = getCopyOrCutSelection(event);

  if (!selectionData) {
    return;
  }

  const { target, selectionStart, selectionEnd, selectedText } = selectionData;
  const targetData = buildTargetData(event, target);

  void sendEvent(
    createEvent({
      type,

      context: {
        url: location.href,
      },

      locators: targetData.locators,

      data: {
        selectionStart,
        selectionEnd,
        selectedText,
        selectionType: isTextControl(target) ? "text_control" : "dom",
        selector: targetData.selector,
      },

      meta: {
        source: "content-script",
      },
    }),
  );
}

function sendPasteEvent(event) {
  const target = getOriginalEventTarget(event);

  if (!target) {
    return;
  }

  const text = event.clipboardData?.getData("text") ?? null;
  const targetData = buildTargetData(event, target);

  void sendEvent(
    createEvent({
      type: EventType.PASTE,

      context: {
        url: location.href,
      },

      locators: targetData.locators,

      data: {
        text,
        length: text?.length ?? null,
        selector: targetData.selector,
      },

      meta: {
        source: "content-script",
      },
    }),
  );
}

function buildTargetData(event, target) {
  const locators = buildLocators(event, target);
  const selectorResult = buildElementSelector(target, locators);

  return {
    locators,

    selector: {
      type: selectorResult?.type ?? null,
      segments: selectorResult?.segments ?? [],
      indexes: selectorResult?.indexes ?? [],
      matchCounts: selectorResult?.matchCounts ?? [],
    },
  };
}

function getCopyOrCutSelection(event) {
  const eventTarget = getOriginalEventTarget(event);

  if (!eventTarget) {
    return null;
  }

  if (
    eventTarget instanceof HTMLInputElement ||
    eventTarget instanceof HTMLTextAreaElement
  ) {
    return getTextControlSelection(eventTarget);
  }

  return getDomSelection();
}

function getTextControlSelection(target) {
  const selectionStart = target.selectionStart;
  const selectionEnd = target.selectionEnd;

  if (
    selectionStart === null ||
    selectionEnd === null ||
    selectionEnd <= selectionStart
  ) {
    return null;
  }

  return {
    target,
    selectionStart,
    selectionEnd,
    selectedText: target.value.slice(selectionStart, selectionEnd),
  };
}

function getDomSelection() {
  const selection = window.getSelection();

  if (!selection || selection.rangeCount !== 1 || selection.isCollapsed) {
    return null;
  }

  const range = selection.getRangeAt(0);
  const target = getSelectionElement(range);

  if (!target) {
    return null;
  }

  if (
    !target.contains(range.startContainer) ||
    !target.contains(range.endContainer)
  ) {
    return null;
  }

  const selectionStart = getTextOffset(
    target,
    range.startContainer,
    range.startOffset,
  );

  const selectionEnd = getTextOffset(
    target,
    range.endContainer,
    range.endOffset,
  );

  if (selectionEnd <= selectionStart) {
    return null;
  }

  return {
    target,
    selectionStart,
    selectionEnd,
    selectedText: selection.toString(),
  };
}

function getSelectionElement(range) {
  const commonAncestor = range.commonAncestorContainer;

  if (commonAncestor instanceof Element) {
    return commonAncestor;
  }

  return commonAncestor.parentElement;
}

function getTextOffset(root, container, offset) {
  const range = document.createRange();

  range.selectNodeContents(root);
  range.setEnd(container, offset);

  return range.toString().length;
}

function isTextControl(element) {
  return (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement
  );
}
