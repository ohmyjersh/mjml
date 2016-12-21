const buildTags = toImport => {
  if (!toImport.length) { return '' }

  return (
`<!--[if !mso]><!-->
  ${toImport.map(url => `<link href="${url}" rel="stylesheet" type="text/css">`).join('\n').trim()}
  <style type="text/css">
    ${toImport.map(url => `@import url(${url});`).join('\n').trim()}
  </style>
<!--<![endif]-->\n`
  )
}

export default (content, fonts) => {
  const toImport = []

  fonts.forEach(font => {
    const {
      name,
      url,
    } = font

    const regex = new RegExp(`"[^"]*font-family:[^"]*${name}[^"]*"`, 'gmi')

    if (content.match(regex)) {
      toImport.push(url)
    }
  })

  return toImport.length ?
    content.replace(
      /<head([^>]*)>([^]*?)<\/head>/,
      `<head$1>$2${buildTags(toImport)}</head>`
    ) :
    content
}
