import { ParseError, EmptyMJMLError, NullElementError } from '../Error'
import compact from 'lodash/compact'
import dom from '../helpers/dom'
import each from 'lodash/each'
import toArray from 'lodash/toArray'
import mapValues from 'lodash/mapValues'
import isObject from 'lodash/isObject'
import filter from 'lodash/filter'
import { endingTags } from '../MJMLElementsCollection'
import MJMLHeadElements from '../MJMLHead'
import warning from 'warning'
import expat from 'node-expat'
import _ from 'lodash'

const regexTag = tag => new RegExp(`<${tag}([^>]*)>([^]*?)</${tag}>`, 'gmi')
const replaceTag = tag => `<${tag}$1><![CDATA[$2]]></${tag}>`

function replaceAmpersandsInAttributes (input) {
  const reg = new RegExp('([^\\s]*=")([^"]*)(")', 'g')

  const replaceAmp = match => `&amp;${match.length > 1 ? match.charAt(1) : ''}`
  const replaceAttrVal = match => match.replace(/&([^a]|$)/g, replaceAmp)

  return input.replace(reg, (match, beforeAttr, attrVal, afterAttr) => {
    const newAttrVal = attrVal.replace(/.*&([^a]|$).*/g, replaceAttrVal)
    return `${beforeAttr}${newAttrVal}${afterAttr}`
  })
}

function cleanNode (node) {
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

/**
 * Avoid htmlparser to parse ending tags
 */
function safeEndingTags (content) {
  endingTags.concat([
    'mj-style',
    'mj-title',
  ])

  endingTags.forEach(tag => {
    content = content.replace(regexTag(tag), replaceTag(tag))
  })

  return content
}

/**
 * Convert "true" and "false" string attributes values
 * to corresponding Booleans
 */
function convertBooleansOnAttrs (attrs) {
  return mapValues(attrs, val => {
    if (val === 'true') { return true }
    if (val === 'false') { return false }
    return val
  })
}

function setEmptyAttributes (node) {
  if (!node.attributes) {
    node.attributes = {}
  }
  if (node.children) {
    node.children.forEach(setEmptyAttributes)
  }
}

/**
 * converts MJML body into a JSON representation
 */
const mjmlElementParser = (elem, content) => {
  if (!elem) {
    throw new NullElementError('Null element found in mjmlElementParser')
  }

  const findLine = content.substr(0, elem.startIndex).match(/\n/g)
  const lineNumber = findLine ? findLine.length + 1 : 1
  const tagName = elem.tagName.toLowerCase()
  const attributes = dom.getAttributes(elem)

  const element = { tagName, attributes, lineNumber }

  if (endingTags.indexOf(tagName) !== -1) {
    const $local = dom.parseXML(elem)
    element.content = $local(tagName).html().trim()
  } else {
    const children = dom.getChildren(elem)
    element.children = children ? compact(filter(children, child => child.tagName).map(child => mjmlElementParser(child, content))) : []
  }

  return element
}

const parseHead = (head, attributes) => {
  const $container = dom.parseHTML(attributes.container)

  each(compact(filter(dom.getChildren(head), child => child.tagName)), el => {
    const element = {
      attributes: dom.getAttributes(el),
      children: toArray(el.childNodes),
      tagName: el.tagName.toLowerCase()
    };

    const handler = MJMLHeadElements[element.tagName]

    if (handler) {
      handler(element, { $container, ...attributes })
    } else {
      warning(false, `No handler found for: ${element.tagName}, in mj-head, skipping it`)
    }
  })

  attributes.container = dom.getHTML($container)
}

export default function parseMjml (xml, attributes) {
  if (!xml) { return null }

  const addEmptyAttributes = true
  const convertBooleans = true

  let safeXml = safeEndingTags(xml)

  safeXml = replaceAmpersandsInAttributes(safeXml)

  const parser = new expat.Parser('utf-8')

  let mjml = null
  let cur = null

  parser.on('startElement', (name, attrs) => {
    if (convertBooleans) {
      // "true" and "false" will be converted to bools
      attrs = convertBooleansOnAttrs(attrs)
    }

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

  if (mjml.tagName === 'mjml') {
    const head = _.find(mjml.children, el => el.tagName === 'mj-head')

    if (head && head.children) {
      each(head.children, el => {
        const handler = MJMLHeadElements[el.tagName]

        if (handler && typeof handler === 'function') {
          handler(el, attributes)
        }
      })
    }

    console.log(attributes)
  }

  process.exit()

  return mjml
}
