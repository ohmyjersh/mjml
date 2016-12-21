export default function setEmptyAttributes (node) {
  if (!node.attributes) {
    node.attributes = {}
  }
  if (node.children) {
    node.children.forEach(setEmptyAttributes)
  }
}
