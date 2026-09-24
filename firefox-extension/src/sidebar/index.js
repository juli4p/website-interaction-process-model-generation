import { MessageType } from "../shared/messages/message-types.js";
import { EventType } from "../shared/events/event-types.js";
import { RecorderState } from "../shared/recorder/recorder-states.js";
import { generateCpeeTestset } from "../cpee/generate-testset.js";
import {
  addManualAction,
  pickElement,
  getRecorderData,
  importEvents,
  pauseRecording,
  startRecording,
  stopRecording,
  updateEvent,
  updateSelectorSegment,
  highlightEventSelector,
  highlightEventViewportPosition,
  clearEventSelectorHighlight,
} from "./sidebar-api.js";

import { createActivityLogView } from "./activity-log/activity-log-view.js";
import { createStatusView } from "./status-view.js";

const elements = {
  // sidebar buttons
  startPauseButton: document.getElementById("startpause"),
  stopButton: document.getElementById("stop"),
  importLogButton: document.getElementById("importActivityLog"),
  importLogFileInput: document.getElementById("activityLogFileInput"),
  downloadLogButton: document.getElementById("downloadActivityLog"),
  downloadCpeeButton: document.getElementById("downloadCpeeTestset"),

  // other sidebar elements
  activityLogContainer: document.getElementById("activityLogContainer"),
  statusText: document.getElementById("statusText"),
  count: document.getElementById("count"),

  // add manual action elements
  addActionButton: document.getElementById("addActionButton"),
  addActionPanel: document.getElementById("addActionPanel"),
  manualActionType: document.getElementById("manualActionType"),
  screenshotOptions: document.getElementById("screenshotOptions"),
  screenshotFull: document.getElementById("screenshotFull"),
  elementOptions: document.getElementById("elementOptions"),
  pickElementButton: document.getElementById("pickElementButton"),
  pickedElementInfo: document.getElementById("pickedElementInfo"),
  confirmAddActionButton: document.getElementById("confirmAddActionButton"),
  cancelAddActionButton: document.getElementById("cancelAddActionButton"),
};

const statusView = createStatusView({
  body: document.body,
  statusText: elements.statusText,
  countElement: elements.count,
  startPauseButton: elements.startPauseButton,
  stopButton: elements.stopButton,
});

let highlightedEvent = null;

async function highlightSelector(event, selector) {
  highlightedEvent = event;
  return highlightEventSelector(event, selector);
}

async function highlightViewportPosition(event, position) {
  highlightedEvent = event;
  return highlightEventViewportPosition(event, position);
}

async function clearSelectorHighlight(event = highlightedEvent) {
  if (!event) {
    return {
      cleared: false,
    };
  }
  const result = await clearEventSelectorHighlight(event);

  if (highlightedEvent?.id === event.id) {
    highlightedEvent = null;
  }
  return result;
}

const activityLogView = createActivityLogView({
  container: elements.activityLogContainer,
  onEventChange: updateEvent,
  onSelectorSegmentChange: updateSelectorSegment,
  onSelectorHighlight: highlightSelector,
  onViewportPositionHighlight: highlightViewportPosition,
  onSelectorHighlightClear: clearSelectorHighlight,
});

let sidebarState = {
  state: RecorderState.IDLE,
  count: 0,
};

let pickedElement = null;

function initialize(recorderData) {
  sidebarState = {
    state: recorderData.state,
    count: recorderData.count,
  };
  statusView.render({
    state: recorderData.state,
    count: recorderData.count,
  });

  activityLogView.initialize(recorderData.events);
}

async function initializeSidebar() {
  try {
    const recorderData = await getRecorderData();
    initialize(recorderData);
  } catch (error) {
    console.error("Could not initialize sidebar:", error);
  }
}

browser.runtime.onMessage.addListener((message) => {
  switch (message?.type) {
    case MessageType.EVENT_ADDED:
      sidebarState.count = message.count;
      activityLogView.append(message.event);
      statusView.render({
        state: sidebarState.state,
        count: sidebarState.count,
      });
      break;

    case MessageType.EVENT_UPDATED:
      activityLogView.update(message.event);
      break;

    case MessageType.EVENTS_CLEARED:
      void clearSelectorHighlight();
      sidebarState.count = 0;
      activityLogView.clear();
      statusView.render({
        state: sidebarState.state,
        count: 0,
      });
      break;

    case MessageType.RECORDER_STATE_CHANGED:
      sidebarState.state = message.state;
      statusView.render({
        state: sidebarState.state,
        count: sidebarState.count,
      });
      break;

    case MessageType.EVENTS_IMPORTED:
      void clearSelectorHighlight();
      sidebarState.count = message.count;
      activityLogView.initialize(message.events);
      statusView.render({
        state: sidebarState.state,
        count: sidebarState.count,
      });
      break;
  }
});

elements.startPauseButton.addEventListener("click", async () => {
  try {
    if (sidebarState.state === RecorderState.RECORDING) {
      await pauseRecording();
    } else {
      await startRecording();
    }
  } catch (error) {
    console.error(error);
  }
});

elements.stopButton.addEventListener("click", async () => {
  try {
    await stopRecording();
  } catch (error) {
    console.error(error);
  }
});

elements.importLogButton.addEventListener("click", () => {
  if (sidebarState.state === RecorderState.RECORDING) {
    window.alert(
      "Stop or pause the recording before importing an activity log.",
    );
    return;
  }

  elements.importLogFileInput.click();
});

elements.importLogFileInput.addEventListener("change", async () => {
  const [file] = elements.importLogFileInput.files ?? [];

  // allow selecting the same file again later.
  elements.importLogFileInput.value = "";

  if (!file) {
    return;
  }

  try {
    const fileContent = await file.text();
    const events = JSON.parse(fileContent);

    if (!Array.isArray(events)) {
      throw new TypeError("The selected file does not contain an event array");
    }

    const shouldImport = window.confirm(
      `Import ${events.length} events?\n\n` +
        "The current activity log will be replaced.",
    );

    if (!shouldImport) {
      return;
    }

    await clearSelectorHighlight();
    const result = await importEvents(events);

    console.log(`Imported ${result.count} activity events`);
  } catch (error) {
    console.error("Could not import activity log:", error);

    window.alert(`Could not import activity log:\n${error.message}`);
  }
});

elements.downloadLogButton.addEventListener("click", async () => {
  try {
    const recorderData = await getRecorderData();
    downloadFile({
      filename: `activity-log-${createTimestamp()}.json`,
      content: JSON.stringify(recorderData.events, null, 2),
    });
  } catch (error) {
    console.error(error);
  }
});

elements.downloadCpeeButton.addEventListener("click", async () => {
  try {
    const recorderData = await getRecorderData();
    const xmlTestset = generateCpeeTestset(recorderData.events);

    downloadFile({
      content: xmlTestset,
      filename: `cpee-testset-${createTimestamp()}.xml`,
    });
  } catch (error) {
    console.error("Could not generate CPEE testset:", error);
  }
});

// listener for manual action addition
elements.addActionButton.addEventListener("click", () => {
  elements.addActionButton.hidden = true;
  elements.addActionPanel.hidden = false;
  resetManualActionForm();
});

elements.manualActionType.addEventListener("change", () => {
  renderManualActionOptions();
});

elements.pickElementButton.addEventListener("click", async () => {
  try {
    elements.pickElementButton.disabled = true;
    elements.pickedElementInfo.textContent =
      "Click an element on the page. Press Escape to cancel.";

    const result = await pickElement();

    if (!result.selected) {
      pickedElement = null;

      elements.pickedElementInfo.textContent = result.cancelled
        ? "Element selection cancelled"
        : (result.error ?? "No element selected");

      return;
    }

    pickedElement = {
      selector: result.selector,
      locators: result.locators,
    };

    elements.pickedElementInfo.textContent =
      `${result.selector.type}: ` + result.selector.segments.join(" → ");
  } catch (error) {
    pickedElement = null;
    elements.pickedElementInfo.textContent = `Could not select element: ${error.message}`;
  } finally {
    elements.pickElementButton.disabled = false;
  }
});

elements.confirmAddActionButton.addEventListener("click", async () => {
  try {
    const type = elements.manualActionType.value;

    if (type === EventType.SCREENSHOT) {
      await addManualAction(EventType.SCREENSHOT, {
        full: elements.screenshotFull.checked,
      });
    } else if (type === EventType.ELEMENT_OUTER_HTML) {
      if (!pickedElement) {
        window.alert("Please select an element first.");
        return;
      }
      await addManualAction(
        EventType.ELEMENT_OUTER_HTML,
        {
          selector: pickedElement.selector,
          timeout: 5,
          interval: 0.1,
        },
        pickedElement.locators,
      );
    } else if (type === EventType.NAVIGATE) {
      await addManualAction(EventType.NAVIGATE);
    }

    elements.addActionPanel.hidden = true;
    elements.addActionButton.hidden = false;
    resetManualActionForm();
  } catch (error) {
    console.error("Could not add manual action:", error);
    window.alert(`Could not add action:\n${error.message}`);
  }
});

elements.cancelAddActionButton.addEventListener("click", () => {
  elements.addActionPanel.hidden = true;
  elements.addActionButton.hidden = false;
  resetManualActionForm();
});

function resetManualActionForm() {
  elements.manualActionType.value = EventType.SCREENSHOT;
  elements.screenshotFull.checked = false;

  pickedElement = null;
  elements.pickedElementInfo.textContent = "No element selected";

  renderManualActionOptions();
}

function renderManualActionOptions() {
  const type = elements.manualActionType.value;

  elements.screenshotOptions.hidden = type !== EventType.SCREENSHOT;

  elements.elementOptions.hidden = type !== EventType.ELEMENT_OUTER_HTML;
}

function downloadFile({ content, filename }) {
  const blob = new Blob([content]);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function createTimestamp() {
  const now = new Date();
  const fillZeros = (value) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${fillZeros(now.getMonth() + 1)}-${fillZeros(now.getDate())}_${fillZeros(now.getHours())}-${fillZeros(now.getMinutes())}-${fillZeros(now.getSeconds())}`;
}

void initializeSidebar();
