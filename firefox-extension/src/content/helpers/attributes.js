export function getAttributes(element) {
  if (!(element instanceof Element)) {
    return null;
  }

  const attributes = {};

  for (const attribute of element.attributes) {
    attributes[attribute.name] = attribute.value;
  }

  return {
    tag: element.tagName.toLowerCase(),
    attributes,
  };
}
