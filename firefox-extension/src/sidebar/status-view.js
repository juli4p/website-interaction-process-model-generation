import { RecorderState } from "../shared/recorder/recorder-states.js";

export function createStatusView({
  body,
  statusText,
  countElement,
  startPauseButton,
  stopButton,
}) {
  function render({ state, count }) {
    body.classList.toggle("recording", state === RecorderState.RECORDING);

    stopButton.disabled =
      state === RecorderState.IDLE || state === RecorderState.FINISHED;

    switch (state) {
      case RecorderState.RECORDING:
        statusText.textContent = "Recording…";
        startPauseButton.textContent = "Pause";
        break;

      case RecorderState.PAUSED:
        statusText.textContent = "Paused";
        startPauseButton.textContent = "Resume";
        break;

      case RecorderState.FINISHED:
        statusText.textContent = "Finished";
        startPauseButton.textContent = "Start";
        break;

      default:
        statusText.textContent = "Idle";
        startPauseButton.textContent = "Start";
    }

    countElement.textContent = count > 0 ? `(${count} events)` : "";
  }

  return {
    render,
  };
}
