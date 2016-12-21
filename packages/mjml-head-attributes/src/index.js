import compact from 'lodash/compact'
import each from 'lodash/each'
import filter from 'lodash/filter'
import omit from 'lodash/omit'

export default {
  name: 'mj-attributes',
  handler: (element, globalAttributes) => {
    each(compact(filter(element.children, el => el.tagName)), el => {
      const {
        tagName,
        attributes
      } = el

      if (tagName === 'mj-class') {
        return globalAttributes.cssClasses[attributes.name] = omit(attributes, ['name'])
      }

      globalAttributes.defaultAttributes[tagName] = attributes
    })
  }
}
