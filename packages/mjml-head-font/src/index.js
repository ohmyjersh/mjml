import find from 'lodash/find'

export default {
  name: 'mj-font',
  handler: (element, globalAttributes) => {
    const {
      attributes
    } = element

    const font = find(globalAttributes.fonts, [
      'name',
      attributes.name
    ])

    if (font) {
      font.url = attributes.href
    } else {
      globalAttributes.fonts.push({
        name: attributes.name,
        url: attributes.href
      })
    }
  }
}
