/** @format */
const _ = require('lodash/fp')
const path = require('path')
const crypto = require(`crypto`)
const isRelative = require('is-relative-url')
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
    let doc = asciidoctor.load(content, { catalog_assets: true })

    const contentDigest = crypto
      .createHash(`md5`)
      .update(doc.reader.source_lines.join('\n'))
      .digest(`hex`)

    const html = doc.convert()

    const tags = _.compose([
      _.defaultTo([]),
      _.map(_.trim),
      _.filter(_.negate(_.isEmpty)),
      _.split(';'),
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
      authors: _.map(a => ({
        name: a.getName(),
        firstname: a.getFirstName(),
        lastname: a.getLastName(),
        email: a.getEmail(),
        initials: a.getInitials(),
      }))(doc.getAuthors()),
    }

    const images = _.map(i => i.getTarget())(doc.getImages())

    const links = doc.getLinks()

    const asciidocNode = {
      id: createNodeId(`${node.id} >>> Asciidoctor`),
      frontmatter: metadata,
      internalReferences: _.compose([
        _.filter(_.negate(_.isNull)),
        _.filter(_.negate(_.startsWith('/'))),
        _.filter(isRelative),
      ])(_.concat(images, links)),
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
