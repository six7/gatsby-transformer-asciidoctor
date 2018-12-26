/** @format */
const _ = require('lodash/fp')
const path = require('path')
const crypto = require(`crypto`)
const booleanBind = Boolean.bind
const asciidoctor = require('asciidoctor.js')()
Boolean.bind = booleanBind

module.exports.onCreateNode = function(
  { node, getNode, getNodes, loadNodeContent, actions, createNodeId },
  pluginOptions
) {
  const { createNode, createParentChildLink } = actions

  if (node.extension !== `adoc`) {
    return
  }

  return loadNodeContent(node).then(content => {
    const doc = asciidoctor.load(content, { catalog_assets: true })

    const contentDigest = crypto
      .createHash(`md5`)
      .update(doc.reader.source_lines.join('\n'))
      .digest(`hex`)

    function getAuthor(id) {
      const idSuffix = _.isNumber(id) ? `_${id}` : ``
      return {
        name: doc.getAttribute(`author${idSuffix}`),
        firstname: doc.getAttribute(`firstname${idSuffix}`),
        lastname: doc.getAttribute(`lastname${idSuffix}`),
        email: doc.getAttribute(`email${idSuffix}`),
        initials: doc.getAttribute(`authorinitials${idSuffix}`),
      }
    }

    const authorCount = _.defaultTo(doc.getAttribute('authorcount'), 0)

    const tags = _.flowRight([
      _.split(';'),
      _.filter(_.negate(_.isEmpty)),
      _.map(_.trim),
      _.defaultTo([]),
    ])(doc.getAttribute('tags'))

    const metadata = {
      title: doc.getAttribute('doctitle'),
      description: doc.getAttribute('description') || '',
      date: _.defaultTo(
        doc.getAttribute('revdate'),
        doc.getAttribute('docdate')
      ),
      version: doc.getAttribute('revnumber') || '',
      remark: doc.getAttribute('revremark') || '',
      tags: tags,
      authors: _.flatMap(
        _.rangeStep(1, 0, authorCount),
        i => (i === 0 ? getAuthor(null) : getAuthor(i + 1))
      ),
    }

    const images = doc.getCatalog().images

    const html = doc.convert()

    const asciidocNode = {
      id: createNodeId(`${node.id} >>> Asciidoctor`),
      frontmatter: metadata,
      images,
      children: [],
      html,
      parent: node.id,
      internal: {
        content,
        contentDigest,
        type: 'Asciidoctor',
      },
    }

    createNode(asciidocNode)
    createParentChildLink({ parent: node, child: asciidocNode })
  })
}
