export default {
  name: 'mj-title',
  handler (element, globalAttributes) {
    const {
      content,
    } = element

    if (content) {
      globalAttributes.title = content
    }
  },
}
