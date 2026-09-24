import { MessageType } from "../shared/messages/message-types.js";
import { EventType } from "../shared/events/event-types.js";

export function getRecorderData() {
  return sendMessage(MessageType.GET_RECORDER_DATA);
}

export function startRecording() {
  return sendMessage(MessageType.START_RECORDING);
}

export function pauseRecording() {
  return sendMessage(MessageType.PAUSE_RECORDING);
}

export function stopRecording() {
  return sendMessage(MessageType.STOP_RECORDING);
}

export function updateEvent(id, path, value) {
  return sendMessage(MessageType.UPDATE_EVENT, {
    id,
    path,
    value,
  });
}

export function addManualAction(actionType, data = {}, locators = []) {
  return sendMessage(MessageType.ADD_MANUAL_ACTION, {
    actionType,
    data,
    locators,
  });
}

export async function pickElement() {
  const activeTab = await getActiveTab();
  if (!activeTab?.id) {
    throw new Error("No active tab found");
  }
  const response = await browser.tabs.sendMessage(
    activeTab.id,
    {
      type: MessageType.PICK_ELEMENT,
    },
    // target main frame only
    { frameId: 0 },
  );

  if (!response) {
    throw new Error("No response from element picker");
  }

  return response;
}
export function updateSelectorSegment(
  id,
  segmentIndex,
  { segment, index, matchCount },
) {
  return sendMessage(MessageType.UPDATE_SELECTOR_SEGMENT, {
    id,
    segmentIndex,
    selectorSegment: {
      segment,
      index,
      matchCount,
    },
  });
}

export function importEvents(events) {
  return sendMessage(MessageType.IMPORT_EVENTS, {
    events,
  });
}

async function sendMessage(type, additionalData = {}) {
  const response = await browser.runtime.sendMessage({
    type,
    ...additionalData,
  });

  if (!response) {
    throw new Error(`No response for message ${type}`);
  }

  return response;
}

export async function highlightEventSelector(event, selector) {
  const activeTab = await getActiveTab();

  if (!Number.isInteger(activeTab?.id)) {
    return createEmptyHighlightResult(
      selector,
      "No active browser tab available",
    );
  }

  try {
    const response = await browser.tabs.sendMessage(
      activeTab.id,
      {
        type: MessageType.HIGHLIGHT_SELECTOR,
        selector,
        clickPosition:
          event?.type === EventType.CLICK
            ? {
                rx: event.data?.selector?.rx,
                ry: event.data?.selector?.ry,
              }
            : null,
      },
      {
        frameId: 0, // We are always using the main frame because the server only searches in the main frame
      },
    );

    return (
      response ??
      createEmptyHighlightResult(
        selector,
        "Content script returned no response",
      )
    );
  } catch (error) {
    return createEmptyHighlightResult(selector, error.message);
  }
}

export async function highlightEventViewportPosition(event, position) {
  const activeTab = await getActiveTab();

  if (!Number.isInteger(activeTab?.id)) {
    return {
      highlighted: false,
      error: "No active browser tab available",
    };
  }

  const frameId = Number.isInteger(event?.context?.frameId)
    ? event.context.frameId
    : 0;

  try {
    return await browser.tabs.sendMessage(
      activeTab.id,
      {
        type: MessageType.HIGHLIGHT_VIEWPORT_POSITION,
        position,
      },
      {
        frameId,
      },
    );
  } catch (error) {
    return {
      highlighted: false,
      error: error.message,
    };
  }
}

export async function clearEventSelectorHighlight(event) {
  const activeTab = await getActiveTab();

  if (!Number.isInteger(activeTab?.id)) {
    return {
      cleared: false,
      error: "No active browser tab available",
    };
  }

  const eventFrameId = Number.isInteger(event?.context?.frameId)
    ? event.context.frameId
    : 0;

  const frameIds = [...new Set([0, eventFrameId])]; // clear in main frame and potetially in the frame where the event occurred

  let cleared = false;

  for (const frameId of frameIds) {
    try {
      const response = await browser.tabs.sendMessage(
        activeTab.id,
        {
          type: MessageType.CLEAR_SELECTOR_HIGHLIGHT,
        },
        {
          frameId,
        },
      );

      cleared ||= response?.cleared === true;
    } catch {
      // frame may no longer exist
    }
  }

  return {
    cleared,
  };
}

async function getActiveTab() {
  const tabs = await browser.tabs.query({
    active: true,
    currentWindow: true,
  });

  return tabs[0] ?? null;
}

function createEmptyHighlightResult(selector, error) {
  const segmentCount = Array.isArray(selector?.segments)
    ? selector.segments.length
    : 0;

  return {
    highlighted: false,
    elementFound: false,
    error,
    matchCount: 0,
    matchCounts: Array(segmentCount).fill(0),
  };
}
