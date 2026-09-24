const PREFERRED_ATTRIBUTES = [
  "id",
  "data-testid",
  "data-test",
  "data-cy",
  "name",
  "class",
  "aria-label",
  "role",
  "title",
  "href",
  "type",
];

const IGNORED_ATTRIBUTES = new Set(["style", "onclick"]);

export function buildBestCssSelector({ element, locator, root = document }) {
  const tag = locator?.value?.tag;
  const attributes = locator?.value?.attributes;

  if (
    !tag ||
    !attributes ||
    !(element instanceof Element) ||
    !(root instanceof Document || root instanceof ShadowRoot)
  ) {
    return null;
  }

  const candidates = createCandidates(tag, attributes)
    .map((candidate) => evaluateCandidate(candidate, element, root))
    .filter(Boolean)
    .sort(compareEvaluatedCandidates);

  return candidates[0] ?? null;
}

function createCandidates(tag, attributes) {
  const candidates = [];

  const usableAttributes = Object.entries(attributes)
    .filter(([name, value]) => {
      return (
        !IGNORED_ATTRIBUTES.has(name) &&
        value !== "" &&
        value !== null &&
        value !== undefined
      );
    })
    .sort(([nameA], [nameB]) => {
      return getAttributePriority(nameA) - getAttributePriority(nameB);
    })
    .slice(0, 8);

  // Single-attribute selectors.
  for (const [name, value] of usableAttributes) {
    candidates.push({
      selector: `${tag}${buildAttributeSelector(name, value)}`,
      attributeNames: [name],
      tagOnly: false,
    });
  }

  // Two-attribute selectors.
  for (let first = 0; first < usableAttributes.length; first += 1) {
    for (
      let second = first + 1;
      second < usableAttributes.length;
      second += 1
    ) {
      const [firstName, firstValue] = usableAttributes[first];
      const [secondName, secondValue] = usableAttributes[second];

      candidates.push({
        selector:
          `${tag}${buildAttributeSelector(firstName, firstValue)}` +
          buildAttributeSelector(secondName, secondValue),
        attributeNames: [firstName, secondName],
        tagOnly: false,
      });
    }
  }

  // The tag alone is the final fallback.
  candidates.push({
    selector: tag,
    attributeNames: [],
    tagOnly: true,
  });

  return candidates;
}

function evaluateCandidate(candidate, element, root) {
  try {
    const matches = [...root.querySelectorAll(candidate.selector)];
    const index = matches.indexOf(element);

    // The selector must actually contain the recorded element.
    if (index === -1) {
      return null;
    }

    return {
      selector: candidate.selector,
      index,
      matchCount: matches.length,
      attributeNames: candidate.attributeNames,
      tagOnly: candidate.tagOnly,
    };
  } catch {
    return null;
  }
}

function compareEvaluatedCandidates(candidateA, candidateB) {
  // Prefer selectors with exactly one match.
  const candidateAIsUnique = candidateA.matchCount === 1;
  const candidateBIsUnique = candidateB.matchCount === 1;

  if (candidateAIsUnique !== candidateBIsUnique) {
    return candidateAIsUnique ? -1 : 1;
  }

  // Otherwise prefer selectors with fewer matches.
  if (candidateA.matchCount !== candidateB.matchCount) {
    return candidateA.matchCount - candidateB.matchCount;
  }

  // Avoid tag-only selectors when another candidate is equally specific.
  if (candidateA.tagOnly !== candidateB.tagOnly) {
    return candidateA.tagOnly ? 1 : -1;
  }

  // Prefer fewer attributes.
  const attributeCountDifference =
    candidateA.attributeNames.length - candidateB.attributeNames.length;

  if (attributeCountDifference !== 0) {
    return attributeCountDifference;
  }

  return compareAttributePriorities(
    candidateA.attributeNames,
    candidateB.attributeNames,
  );
}

function compareAttributePriorities(attributeNamesA, attributeNamesB) {
  for (
    let index = 0;
    index < Math.min(attributeNamesA.length, attributeNamesB.length);
    index += 1
  ) {
    const priorityDifference =
      getAttributePriority(attributeNamesA[index]) -
      getAttributePriority(attributeNamesB[index]);

    if (priorityDifference !== 0) {
      return priorityDifference;
    }
  }

  return 0;
}

function buildAttributeSelector(name, value) {
  return `[${CSS.escape(name)}="${escapeAttributeValue(value)}"]`;
}

function escapeAttributeValue(value) {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\a ")
    .replace(/\r/g, "\\d ");
}

function getAttributePriority(name) {
  const index = PREFERRED_ATTRIBUTES.indexOf(name);

  return index === -1 ? PREFERRED_ATTRIBUTES.length : index;
}
