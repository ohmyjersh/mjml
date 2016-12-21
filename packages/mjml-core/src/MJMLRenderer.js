import React from 'react'
import ReactDOMServer from 'react-dom/server'

import { html as beautify } from 'js-beautify'
import he from 'he'
import MJMLParser from 'mjml-parser-xml'
import MJMLValidator from 'mjml-validator'

import cloneDeep from 'lodash/cloneDeep'
import curryRight from 'lodash/curryRight'
import defaults from 'lodash/defaults'

import defaultFonts from './configs/listFontsImports'
import defaultContainer from './configs/defaultContainer'

import { fixLegacyAttrs } from './helpers/postRender'
import { parseInstance } from './helpers/mjml'
import dom from './helpers/dom'
import importFonts from './helpers/importFonts'
import isBrowser from './helpers/isBrowser'

import { EmptyMJMLError, MJMLValidationError } from './Error'
import configParser from './parsers/config'
import includeExternal from './includeExternal'
import MJMLElementsCollection, { endingTags, postRenders } from './MJMLElementsCollection'
import MJMLHeadElements from './MJMLHead'

const debug = require('debug')('mjml-engine/mjml2html')

const minifyHTML = htmlDocument => {
  const { minify } = require('html-minifier')

  return minify(htmlDocument, { collapseWhitespace: true, removeEmptyAttributes: true, minifyCSS: true })
}
const beautifyHTML = htmlDocument => beautify(htmlDocument, { indent_size: 2, wrap_attributes_indent_size: 2 })
const inlineExternal = (htmlDocument, css) => {
  const juice = require('juice')

  return juice(htmlDocument, { extraCss: css, removeStyleTags: false, applyStyleTags: false, insertPreservedExtraCss: false })
}

export default class MJMLRenderer {

  constructor (content, options = {}) {
    if (!isBrowser) {
      configParser()
    }

    this.globalAttributes = {
      container: defaultContainer(),
      defaultAttributes: {},
      cssClasses: {},
      css: [],
      fonts: cloneDeep(defaultFonts),
      title: '',
    }

    this.content = content
    this.options = defaults(options, { level: 'soft', disableMjStyle: false, disableMjInclude: false, disableMinify: false })

    if (typeof this.content === 'string') {
      this.parseDocument()
    }
  }

  parseDocument () {
    if (!this.options.disableMjInclude) {
      this.content = includeExternal(this.content)
    }

    debug('Start parsing document')

    const parser = MJMLParser(this.content, {
      endingTags: endingTags.concat([
        'mj-style',
        'mj-title',
      ]),
      globalAttributes: this.globalAttributes,
      MJMLHeadElements,
      addEmptyAttributes: true,
      convertBooleans: true,
    })

    if (parser !== null) {
      this.content = parser.body.children[0]

      debug('Content parsed')
    }
  }

  validate () {
    if (this.options.level === 'skip') { return }

    this.errors = MJMLValidator(this.content)

    if (this.options.level === 'strict' &&
        this.errors.length > 0) {
      throw new MJMLValidationError(this.errors)
    }
  }

  render () {
    if (!this.content) {
      throw new EmptyMJMLError(`.render: No MJML to render in options ${this.options.toString()}`)
    }

    debug('Validating markup')

    this.validate()

    const rootComponent = MJMLElementsCollection[this.content.tagName]

    if (!rootComponent) {
      return {
        errors: this.errors,
      }
    }

    debug('Render to static markup')

    const rootElemComponent = React.createElement(rootComponent, { mjml: parseInstance(this.content, this.globalAttributes) })
    const renderedMJML = ReactDOMServer.renderToStaticMarkup(rootElemComponent)

    debug('React rendering done. Continue with special overrides.')

    const MJMLDocument = this.globalAttributes.container
      .replace('__content__', renderedMJML)
      .replace('__title__', this.globalAttributes.title)

    return {
      errors: this.errors,
      html: this.postRender(MJMLDocument),
    }
  }

  postRender (MJMLDocument) {
    const externalCSS = this.globalAttributes.css.join('')

    MJMLDocument = importFonts(MJMLDocument, this.globalAttributes.fonts)

    let $ = dom.parseHTML(MJMLDocument)

    $ = fixLegacyAttrs($)

    postRenders.forEach(postRender => {
      if (typeof postRender === 'function') {
        $ = postRender($)
      }
    })

    return [
      !this.options.disableMjStyle ? curryRight(inlineExternal)(externalCSS) : undefined,
      this.options.beautify ? beautifyHTML : undefined,
      !this.options.disableMinify && this.options.minify ? minifyHTML : undefined,
      he.decode,
    ]
    .filter(element => typeof element === 'function')
    .reduce((res, fun) => fun(res), dom.getHTML($))
  }

}
