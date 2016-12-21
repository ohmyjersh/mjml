export default function cleanNode (node) {
  delete node.parent

  // delete children if needed
  if (node.children.length) {
    node.children.forEach(cleanNode)
  } else {
    delete node.children
  }

  // delete attributes if needed
  if (Object.keys(node.attributes).length === 0) {
    delete node.attributes
  }
}
