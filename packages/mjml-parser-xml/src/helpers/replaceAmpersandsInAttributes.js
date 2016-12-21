export default function replaceAmpersandsInAttributes (input) {
  const reg = new RegExp('([^\\s]*=")([^"]*)(")', 'g')

  const replaceAmp = match => `&amp;${match.length > 1 ? match.charAt(1) : ''}`
  const replaceAttrVal = match => match.replace(/&([^a]|$)/g, replaceAmp)

  return input.replace(reg, (match, beforeAttr, attrVal, afterAttr) => {
    const newAttrVal = attrVal.replace(/.*&([^a]|$).*/g, replaceAttrVal)
    return `${beforeAttr}${newAttrVal}${afterAttr}`
  })
}
