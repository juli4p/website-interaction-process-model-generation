import { MessageType } from "../../shared/messages/message-types.js";
import {
  isRecorderState,
  RecorderState,
} from "../../shared/recorder/recorder-states.js";

import { broadcast } from "./broadcaster.js";

const RECORDER_STATE_STORAGE_KEY = "state";

export async function getRecorderState() {
  const result = await browser.storage.local.get(RECORDER_STATE_STORAGE_KEY);
  return isRecorderState(result[RECORDER_STATE_STORAGE_KEY])
    ? result[RECORDER_STATE_STORAGE_KEY]
    : RecorderState.IDLE;
}

// saves the current recorder state in the extension storage and informs the sidebar about it
export async function setRecorderState(state) {
  if (!isRecorderState(state)) {
    throw new TypeError(`Invalid recorder state: ${state}`);
  }

  await browser.storage.local.set({
    [RECORDER_STATE_STORAGE_KEY]: state,
  });

  await broadcast({
    type: MessageType.RECORDER_STATE_CHANGED,
    state,
  });
}
