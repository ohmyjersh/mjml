import expat from 'node-expat'

import each from 'lodash/each'
import find from 'lodash/find'
import isObject from 'lodash/isObject'
import mapValues from 'lodash/mapValues'

import parseAttributes from './helpers/parseAttributes'
import cleanNode from './helpers/cleanNode'
import convertBooleansOnAttrs from './helpers/convertBooleansOnAttrs'
import safeEndingTags from './helpers/safeEndingTags'
import setEmptyAttributes from './helpers/setEmptyAttributes'

export default function parseMjml (xml, options) {
  if (!xml) { return null }

  const {
    globalAttributes,
    MJMLHeadElements,
    endingTags,
    addEmptyAttributes,
    convertBooleans,
  } = options

  let safeXml = parseAttributes(xml)
  safeXml = safeEndingTags(endingTags, safeXml)

  const parser = new expat.Parser('utf-8')

  let mjml = null
  let cur = null

  parser.on('startElement', (name, attrs) => {
    if (convertBooleans) {
      // "true" and "false" will be converted to bools
      attrs = convertBooleansOnAttrs(attrs)
    }

    attrs = mapValues(attrs, val => decodeURIComponent(val))

    const newNode = {
      parent: cur,
      tagName: name,
      attributes: attrs,
      children: [],
    }

    if (cur) {
      cur.children.push(newNode)
    } else {
      mjml = newNode
    }

    cur = newNode
  })

  parser.on('endElement', () => {
    cur = (cur && cur.parent) || null
  })

  parser.on('text', text => {
    if (!text) { return }

    const val = `${(cur.content || '')}${text}`.trim()

    if (val) {
      cur.content = val
    }
  })

  parser.on('error', (err) => { throw err })

  try {
    parser.write(safeXml)
  } catch (reason) {
    if (reason === 'mismatched tag') {
      if (cur) {
        throw new Error(`Tag ${cur.tagName} is not closed.`)
      }

      throw new Error('No correct tag found.')
    }

    throw new Error(reason)
  }

  if (!isObject(mjml)) {
    throw new Error('Parsing failed. Check your mjml.')
  }

  cleanNode(mjml)

  // assign "attributes" property if not set
  if (addEmptyAttributes) {
    setEmptyAttributes(mjml)
  }

  const head = find(mjml.children, el => el.tagName === 'mj-head')

  if (head && head.children) {
    each(head.children, el => {
      const handler = MJMLHeadElements[el.tagName]

      if (handler && typeof handler === 'function') {
        handler(el, globalAttributes)
      }
    })
  }

  const body = find(mjml.children, el => el.tagName === 'mj-body')

  return {
    body,
    globalAttributes,
    head,
    mjml,
  }
}
