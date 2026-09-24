export const RecorderState = Object.freeze({
  IDLE: "idle",
  RECORDING: "recording",
  PAUSED: "paused",
  FINISHED: "finished",
});

export function isRecorderState(value) {
  return Object.values(RecorderState).includes(value);
}
