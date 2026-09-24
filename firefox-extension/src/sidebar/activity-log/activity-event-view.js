import { createCompactEventDetails } from "./compact-event-details.js";
import { EventType } from "../../shared/events/event-types.js";

export function createActivityEventView({
  event: initialEvent,
  index,
  onEventChange,
  onSelectorSegmentChange,
  onSelectorHighlight,
  onViewportPositionHighlight,
  onSelectorHighlightClear,
}) {
  let event = initialEvent;

  const article = document.createElement("article");
  article.className = "activity-event";

  updateEventId();

  const header = document.createElement("header");
  header.className = "activity-event__header";

  const number = document.createElement("span");
  number.className = "activity-event__number";
  number.textContent = `${index}.`;

  const useCpeeCheckbox = document.createElement("input");
  useCpeeCheckbox.type = "checkbox";
  useCpeeCheckbox.title =
    "Controls whether this event is included in the generated CPEE testset.";

  const eventTitle = document.createElement("span");
  eventTitle.className = "activity-event__title";

  header.append(number, useCpeeCheckbox, eventTitle);

  const detailPanel = document.createElement("div");
  detailPanel.className = "activity-event__details";
  detailPanel.hidden = true;

  const detailContent = document.createElement("div");
  detailContent.className = "activity-event__properties";

  detailPanel.append(detailContent);

  renderHeader();

  useCpeeCheckbox.addEventListener("change", async () => {
    const previousUseCpee = event.useCpee;
    const newUseCpee = useCpeeCheckbox.checked;

    useCpeeCheckbox.disabled = true;

    try {
      const response = await onEventChange(event.id, "useCpee", newUseCpee);

      if (!response.event) {
        throw new Error("Background returned no updated event");
      }

      update(response.event);
    } catch (error) {
      useCpeeCheckbox.checked = previousUseCpee ?? false;
      console.error("Could not update event:", error);
    } finally {
      useCpeeCheckbox.disabled = false;
    }
  });

  header.addEventListener("click", (clickEvent) => {
    if (
      clickEvent.target instanceof Element &&
      clickEvent.target.closest('input[type="checkbox"]')
    ) {
      return;
    }

    toggleDetails();
  });

  function update(updatedEvent) {
    if (updatedEvent.id !== event.id) {
      throw new Error(
        `Cannot update event ${event.id} with event ${updatedEvent.id}`,
      );
    }

    event = updatedEvent;

    updateEventId();
    renderHeader();

    if (!detailPanel.hidden) {
      void renderDetails();
    }
  }

  function updateEventId() {
    if (event.id !== undefined) {
      article.dataset.eventId = String(event.id);
    } else {
      delete article.dataset.eventId;
    }
  }

  function renderHeader() {
    useCpeeCheckbox.checked = event.useCpee ?? false;
    eventTitle.textContent = getEventTitle(event);
  }

  function highlightCurrentSelector() {
    const strategy = event.data?.strategy ?? "css_fallback_xy";
    const coordinateReference = event.data?.coordinateReference ?? "element";

    if (
      event.type === EventType.CLICK &&
      strategy === "xy" &&
      coordinateReference === "viewport"
    ) {
      void onViewportPositionHighlight?.(event, event.data?.viewportPosition);
      return;
    }

    const selector = event.data?.selector;

    if (!selector || !Array.isArray(selector.segments)) {
      return;
    }

    void onSelectorHighlight?.(event, selector);
  }

  async function renderDetails() {
    await onSelectorHighlightClear?.(event);
    detailContent.replaceChildren(
      createCompactEventDetails({
        event,

        onChange: async (path, newValue) => {
          const response = await onEventChange(event.id, path, newValue);

          if (!response.event) {
            throw new Error("Background returned no updated event");
          }

          update(response.event);
        },

        onSelectorSegmentChange: async (segmentIndex, selectorSegment) => {
          const response = await onSelectorSegmentChange(
            event.id,
            segmentIndex,
            selectorSegment,
          );

          if (!response.event) {
            throw new Error("Background returned no updated event");
          }

          update(response.event);
        },

        onSelectorHighlight: (selector) => {
          return onSelectorHighlight?.(event, selector);
        },

        onSelectorHighlightClear: () => {
          return onSelectorHighlightClear?.(event);
        },
      }),
    );

    highlightCurrentSelector();
  }

  function toggleDetails() {
    const shouldOpen = detailPanel.hidden;

    if (shouldOpen) {
      void renderDetails();
    } else {
      void onSelectorHighlightClear?.(event);
    }

    detailPanel.hidden = !shouldOpen;
    article.classList.toggle("activity-event--open", shouldOpen);
  }

  article.append(header, detailPanel);

  return {
    element: article,
    update,
  };
}

function getEventTitle(event) {
  switch (event.type) {
    case EventType.NAVIGATE:
      return `Navigate: ${formatUrl(event.context?.url)}`;

    case EventType.CLICK:
      return `Click: ${formatUrl(event.context?.url)}`;

    case EventType.INPUT:
      return `Input: ${event.data?.added ?? ""}`;

    case EventType.SELECT:
      return `Select: ${event.data?.selectedText ?? event.data?.value ?? "—"}`;

    case EventType.SPECIAL_KEY:
      return `Key: ${event.data?.key ?? ""}`;

    case EventType.PAUSE:
      return "Recording paused";

    case EventType.COPY:
      return "Copy";

    case EventType.CUT:
      return "Cut";

    case EventType.PASTE:
      return "Paste";

    case EventType.SCREENSHOT:
      return "Screenshot";

    case EventType.ELEMENT_OUTER_HTML:
      return "Get Element HTML";

    default:
      return event.type ?? "Unknown event";
  }
}

function formatUrl(urlString) {
  if (!urlString) {
    return "unknown URL";
  }

  try {
    const url = new URL(urlString);
    const host = url.hostname.replace(/^www\./, "");
    const path = url.pathname === "/" ? "" : url.pathname;

    return `${host}${path}`;
  } catch {
    return urlString;
  }
}
