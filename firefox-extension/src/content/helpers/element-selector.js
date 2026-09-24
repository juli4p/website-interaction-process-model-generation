import { buildBestCssSelector } from "./css-selector.js";
import { buildLocators } from "./locators.js";

export function buildElementSelector(target, targetLocators) {
  if (!(target instanceof Element)) {
    return null;
  }

  const reversedSegments = [];

  let currentElement = target;
  let currentLocators = targetLocators;

  while (currentElement instanceof Element) {
    const root = currentElement.getRootNode();

    if (!(root instanceof Document) && !(root instanceof ShadowRoot)) {
      return null;
    }

    const currentLocator = currentLocators.find(
      (locator) => locator.kind === "attributes",
    );

    const selectorResult = buildBestCssSelector({
      element: currentElement,
      locator: currentLocator,
      root,
    });

    if (!selectorResult) {
      return null;
    }

    reversedSegments.push({
      selector: selectorResult.selector,
      index: selectorResult.index,
      matchCount: selectorResult.matchCount,
    });

    if (root instanceof Document) {
      break;
    }

    const host = root.host;

    if (!(host instanceof Element)) {
      return null;
    }

    currentElement = host;
    currentLocators = buildLocators(null, host);
  }

  const resolvedSegments = reversedSegments.reverse();

  return {
    type: resolvedSegments.length > 1 ? "shadow_css" : "css",
    segments: resolvedSegments.map((segment) => segment.selector),
    indexes: resolvedSegments.map((segment) => segment.index),
    matchCounts: resolvedSegments.map((segment) => segment.matchCount),
  };
}
