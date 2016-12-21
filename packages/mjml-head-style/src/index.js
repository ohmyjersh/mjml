export default {
  name: 'mj-style',
  handler: (element, globalAttributes) => {
    const {
      content
    } = element

    if (content) {
      globalAttributes.css.push(content)
    }
  }
}
