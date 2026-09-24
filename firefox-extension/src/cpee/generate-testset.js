import { BASE_TEMPLATE } from "./xml-templates/base-testset.js";
import {
  createCreateSessionNode,
  createDeleteSessionNode,
  createPauseNode,
  createTypeTextNode,
  createClickNode,
  createSelectNode,
  createCopyNode,
  createCutNode,
  createPasteNode,
  createPressSpecialKeyNode,
  createNavigateNode,
  createScreenshotNode,
  createElementOuterHtmlNode,
} from "./node-factory.js";
import { EventType } from "../shared/events/event-types.js";

const DESCRIPTION_NS = "http://cpee.org/ns/description/1.0";

export function generateCpeeTestset(activityLog) {
  const cpeeTestset = parseXml(BASE_TEMPLATE);

  const descriptionNode = cpeeTestset.getElementsByTagNameNS(
    DESCRIPTION_NS,
    "description",
  )[0];

  let nextId = 1;

  descriptionNode.appendChild(
    cpeeTestset.importNode(
      createCreateSessionNode({
        id: `a${nextId++}`,
        headless: true,
        windowSize: [1440, 1000],
        timeout: 10,
      }),
      true,
    ),
  );

  for (const logEntry of activityLog) {
    if (logEntry.useCpee === false) continue;
    let node;

    switch (logEntry.type) {
      case EventType.PAUSE:
        node = createPauseNode({
          id: `a${nextId++}`,
          note: logEntry.data?.note,
        });
        break;

      case EventType.INPUT: {
        const { selectorType, selectorSegments, selectorIndexes } =
          getSelectorData(logEntry);
        node = createTypeTextNode({
          id: `a${nextId++}`,
          strategy: logEntry.data?.typeTextStrategy ?? "selector",
          selectorType,
          selectorSegments,
          selectorIndexes,
          text: logEntry.data?.added ?? "",
          timeout: logEntry.data?.timeout ?? 5,
          interval: logEntry.data?.interval ?? 0.1,
        });
        break;
      }

      case EventType.CLICK: {
        const strategy = logEntry.data?.strategy ?? "css_fallback_xy";
        const coordinateReference =
          logEntry.data?.coordinateReference ?? "element";
        const useSelector =
          strategy !== "xy" || coordinateReference === "element";
        const selectorData = useSelector ? getSelectorData(logEntry) : {};
        const position =
          strategy === "xy" && coordinateReference === "viewport"
            ? logEntry.data?.viewportPosition
            : logEntry.data?.selector;

        node = createClickNode({
          id: `a${nextId++}`,
          selectorType: selectorData.selectorType,
          selectorSegments: selectorData.selectorSegments,
          selectorIndexes: selectorData.selectorIndexes,
          strategy,
          rx: position?.rx,
          ry: position?.ry,
          timeout: logEntry.data?.timeout ?? 5,
          interval: logEntry.data?.interval ?? 0.1,
          debugMarker: logEntry.data?.debugMarker ?? false,
          modifiers: logEntry.data?.modifiers,
        });
        break;
      }

      case EventType.SELECT: {
        const { selectorType, selectorSegments, selectorIndexes } =
          getSelectorData(logEntry);
        node = createSelectNode({
          id: `a${nextId++}`,
          selectorType,
          selectorSegments,
          selectorIndexes,
          selectedIndex: logEntry.data?.selectedIndex,
          timeout: logEntry.data?.timeout ?? 5,
          interval: logEntry.data?.interval ?? 0.1,
        });
        break;
      }

      case EventType.SPECIAL_KEY:
        node = createPressSpecialKeyNode({
          id: `a${nextId++}`,
          key: logEntry.data?.key ?? "",
          modifiers: logEntry.data?.modifiers,
        });
        break;

      case EventType.NAVIGATE:
        node = createNavigateNode({
          id: `a${nextId++}`,
          url: logEntry.context?.url ?? "",
        });
        break;

      case EventType.COPY: {
        const { selectorType, selectorSegments, selectorIndexes } =
          getSelectorData(logEntry);
        node = createCopyNode({
          id: `a${nextId++}`,
          selectorType,
          selectorSegments,
          selectorIndexes,
          selectionStart: logEntry.data?.selectionStart ?? 0,
          selectionEnd: logEntry.data?.selectionEnd ?? 0,
          timeout: logEntry.data?.timeout ?? 5,
          interval: logEntry.data?.interval ?? 0.1,
        });
        break;
      }

      case EventType.PASTE: {
        const { selectorType, selectorSegments, selectorIndexes } =
          getSelectorData(logEntry);
        node = createPasteNode({
          id: `a${nextId++}`,
          selectorType,
          selectorSegments,
          selectorIndexes,
          fallbackText: logEntry.data?.text ?? "",
          timeout: logEntry.data?.timeout ?? 5,
          interval: logEntry.data?.interval ?? 0.1,
        });
        break;
      }

      case EventType.CUT: {
        const { selectorType, selectorSegments, selectorIndexes } =
          getSelectorData(logEntry);
        node = createCutNode({
          id: `a${nextId++}`,
          selectorType,
          selectorSegments,
          selectorIndexes,
          selectionStart: logEntry.data?.selectionStart ?? 0,
          selectionEnd: logEntry.data?.selectionEnd ?? 0,
          timeout: logEntry.data?.timeout ?? 5,
          interval: logEntry.data?.interval ?? 0.1,
        });
        break;
      }

      case EventType.SCREENSHOT:
        node = createScreenshotNode({
          id: `a${nextId++}`,
          full: logEntry.data?.full ?? false,
        });
        break;

      case EventType.ELEMENT_OUTER_HTML: {
        const { selectorType, selectorSegments, selectorIndexes } =
          getSelectorData(logEntry);

        node = createElementOuterHtmlNode({
          id: `a${nextId++}`,
          selectorType,
          selectorSegments,
          selectorIndexes,
          timeout: logEntry.data?.timeout ?? 5,
          interval: logEntry.data?.interval ?? 0.1,
        });

        break;
      }
    }

    if (node) {
      const validationProblems = getCpeeValidationProblems(logEntry);
      if (validationProblems.length > 0) {
        markNodeInvalid(node, validationProblems);
      }
      descriptionNode.appendChild(cpeeTestset.importNode(node, true));
    }
  }

  descriptionNode.appendChild(
    cpeeTestset.importNode(
      createDeleteSessionNode({
        id: `a${nextId++}`,
      }),
      true,
    ),
  );

  return new XMLSerializer().serializeToString(cpeeTestset);
}

function getSelectorData(logEntry) {
  const selector = logEntry.data?.selector;
  const selectorSegments = Array.isArray(selector?.segments)
    ? selector.segments
    : [];

  const selectorIndexes =
    Array.isArray(selector?.indexes) &&
    selector.indexes.length === selectorSegments.length
      ? selector.indexes
      : selectorSegments.map(() => 0);

  return {
    selectorType: selector?.type ?? "css",
    selectorSegments,
    selectorIndexes,
  };
}

function getCpeeValidationProblems(logEntry) {
  const problems = [];

  if (eventRequiresSelector(logEntry)) {
    const { selectorSegments } = getSelectorData(logEntry);

    const selectorMissing =
      selectorSegments.length === 0 ||
      selectorSegments.some(
        (segment) => typeof segment !== "string" || segment.trim() === "",
      );

    if (selectorMissing) {
      problems.push("selector not found");
    }
  }

  if (logEntry.type === EventType.CLICK) {
    const strategy = logEntry.data?.strategy ?? "css_fallback_xy";
    const coordinateReference = logEntry.data?.coordinateReference ?? "element";
    const position =
      strategy === "xy" && coordinateReference === "viewport"
        ? logEntry.data?.viewportPosition
        : logEntry.data?.selector;
    const rx = position?.rx;
    const ry = position?.ry;

    if (!isValidRelativeCoordinate(rx)) {
      problems.push(`invalid rx: ${String(rx)}`);
    }
    if (!isValidRelativeCoordinate(ry)) {
      problems.push(`invalid ry: ${String(ry)}`);
    }
  }

  return problems;
}

function eventRequiresSelector(event) {
  if (event.type === EventType.INPUT) {
    return (event.data?.typeTextStrategy ?? "selector") === "selector";
  }

  // xy may be used relative to the viewport, so no selector is required in that case
  if (event.type === EventType.CLICK) {
    const strategy = event.data?.strategy ?? "css_fallback_xy";

    if (strategy !== "xy") {
      return true;
    }

    return (event.data?.coordinateReference ?? "element") === "element";
  }

  return [
    EventType.SELECT,
    EventType.COPY,
    EventType.CUT,
    EventType.PASTE,
    EventType.ELEMENT_OUTER_HTML,
  ].includes(event.type);
}

function isValidRelativeCoordinate(value) {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 1
  );
}

function markNodeInvalid(node, problems) {
  const labelNode = node.querySelector("label");
  const colorNode = node.querySelector("color");

  const originalLabel = labelNode?.textContent?.trim() || "Activity";

  if (labelNode) {
    labelNode.textContent = `${originalLabel} – ERROR: ${problems.join(", ")}`;
  }

  if (colorNode) {
    colorNode.textContent = "#ff0000";
  }
}

function parseXml(xml) {
  const document = new DOMParser().parseFromString(xml, "application/xml");
  const parserError = document.querySelector("parsererror");
  if (parserError) {
    throw new Error(`Invalid XML: ${parserError.textContent}`);
  }
  return document;
}
