import { createActivityEventView } from "./activity-event-view.js";

export function createActivityLogView({
  container,
  onEventChange,
  onSelectorSegmentChange,
  onSelectorHighlight,
  onViewportPositionHighlight,
  onSelectorHighlightClear,
}) {
  const eventViews = new Map();

  function initialize(initialEvents) {
    clear();

    for (const event of initialEvents) {
      append(event);
    }
  }

  function append(event) {
    if (event.id !== undefined && eventViews.has(event.id)) {
      update(event);
      return;
    }

    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      20;

    const eventView = createActivityEventView({
      event,
      index: container.children.length + 1,
      onEventChange,
      onSelectorSegmentChange,
      onSelectorHighlight,
      onViewportPositionHighlight,
      onSelectorHighlightClear,
    });

    if (event.id !== undefined) {
      eventViews.set(event.id, eventView);
    }

    container.appendChild(eventView.element);

    if (isNearBottom) {
      container.scrollTop = container.scrollHeight;
    }
  }

  function update(event) {
    if (event.id === undefined) {
      console.warn("Cannot update event without id:", event);
      return false;
    }

    const eventView = eventViews.get(event.id);

    if (!eventView) {
      console.warn(`No rendered event found for id ${event.id}`);
      return false;
    }

    eventView.update(event);
    return true;
  }

  function clear() {
    container.replaceChildren();
    eventViews.clear();
  }

  return {
    initialize,
    append,
    update,
    clear,
  };
}
