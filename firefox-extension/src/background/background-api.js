// message dispatcher: receives messages from content scripts and dispatches them to the appropriate service

import { MessageType } from "../shared/messages/message-types.js";
import {
  addManualAction,
  getRecorderData,
  importActivityLog,
  pauseRecording,
  startRecording,
  stopRecording,
  storeContentEvent,
} from "./recording/recording-service.js";
import {
  updateEvent,
  updateSelectorSegment,
} from "./recording/event-service.js";

// queue to ensure msgs are processed in order
let messageQueue = Promise.resolve();

// listens for internal extension messages and dispatches them
export function registerMessageHandler() {
  browser.runtime.onMessage.addListener((message, sender) => {
    if (sender.id !== browser.runtime.id) {
      console.warn("Rejected message from unknown sender", sender);
      return undefined;
    }

    return enqueueMessage(() => handleMessage(message, sender));
  });
}

function enqueueMessage(action) {
  // execute when previous action is done (no matter if it succeeded or failed)
  const result = messageQueue.then(action, action);
  // if actions fails: log error and continue with next action
  messageQueue = result.catch((error) => {
    console.error("Background message failed:", error);
  });

  return result;
}

// dispatches the message to the appropriate service based on its type
async function handleMessage(message, sender) {
  switch (message?.type) {
    case MessageType.LOG_EVENT:
      return storeContentEvent(message.payload, sender);

    case MessageType.START_RECORDING:
      return startRecording();

    case MessageType.PAUSE_RECORDING:
      return pauseRecording();

    case MessageType.STOP_RECORDING:
      return stopRecording();

    case MessageType.GET_RECORDER_DATA:
      return getRecorderData();

    case MessageType.UPDATE_EVENT:
      return updateEvent(message.id, message.path, message.value);

    case MessageType.ADD_MANUAL_ACTION:
      return addManualAction(
        message.actionType,
        message.data,
        message.locators,
      );

    case MessageType.UPDATE_SELECTOR_SEGMENT:
      return updateSelectorSegment(
        message.id,
        message.segmentIndex,
        message.selectorSegment,
      );

    case MessageType.IMPORT_EVENTS:
      return importActivityLog(message.events);

    default:
      return undefined;
  }
}
