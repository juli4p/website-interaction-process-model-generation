const CLICKABLE_SELECTOR = [
  "button",
  "a[href]",
  "input:not([type='hidden'])",
  "select",
  "textarea",
  "summary",
  "[role='button']",
  "[role='link']",
  "[role='checkbox']",
  "[role='radio']",
  "[role='menuitem']",
  "[onclick]",
].join(",");

/**
 * Returns the nearest meaningful clickable element.
 * If no clickable ancestor is found, the original target is returned.
 */
export function getEffectiveClickTarget(target) {
  if (!(target instanceof Element)) {
    return null;
  }

  const clickableTarget = findClickableAncestor(target);

  return clickableTarget ?? target;
}

function findClickableAncestor(target) {
  let current = target;

  while (current instanceof Element) {
    if (isClickableElement(current)) {
      return current;
    }

    const parent = current.parentElement;

    if (parent) {
      current = parent;
      continue;
    }

    /*
     * If we are in an open Shadow Root, we continue the search at the Shadow Host.
     */
    const root = current.getRootNode();

    if (root instanceof ShadowRoot) {
      current = root.host;
      continue;
    }

    break;
  }

  return null;
}

function isClickableElement(element) {
  if (!element.matches(CLICKABLE_SELECTOR)) {
    return false;
  }

  if (
    element instanceof HTMLButtonElement ||
    element instanceof HTMLInputElement ||
    element instanceof HTMLSelectElement ||
    element instanceof HTMLTextAreaElement
  ) {
    return !element.disabled;
  }

  if (element.getAttribute("aria-disabled") === "true") {
    return false;
  }

  return true;
}
