/**
 * Avoid htmlparser to parse ending tags
 */

export const regexTag = tag => new RegExp(`<${tag}([^>\/]*)>([^.]*?)</${tag}>`, 'gmi')
export const replaceTag = tag => `<${tag}$1><![CDATA[$2]]></${tag}>`

export default function safeEndingTags (endingTags, content) {
  endingTags.forEach(tag => {
    content = content.replace(regexTag(tag), replaceTag(tag))
  })

  return content
}
