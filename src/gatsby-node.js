/** @format */
const _ = require('lodash/fp');
const path = require('path');
const crypto = require(`crypto`);
const isRelative = require('is-relative-url');
const booleanBind = Boolean.bind;
let asciidoctor = require('asciidoctor.js')();
Boolean.bind = booleanBind;

module.exports.onCreateNode = function(
  {node, getNode, getNodes, loadNodeContent, actions, createNodeId},
  pluginOptions,
) {
  const {createNode, createParentChildLink} = actions;

  if (node.extension !== `adoc`) {
    return;
  }

  if (!_.isUndefined(pluginOptions.converterFactory)) {
    asciidoctor.ConverterFactory.register(
      new pluginOptions.converterFactory(asciidoctor),
      ['html5'],
    );
  }

  let registry = asciidoctor.Extensions.create();
  if (!_.isEmpty(pluginOptions.extensions)) {
    _.reduce((reg, ext) => ext(reg), registry, pluginOptions.extensions);
  }

  return loadNodeContent(node).then(content => {
    let doc = asciidoctor.load(content, {
      catalog_assets: true,
      extension_registry: registry,
    });

    console.log(doc.getAttribute('nofootnotes'));

    const contentDigest = crypto
      .createHash(`md5`)
      .update(doc.reader.source_lines.join('\n'))
      .digest(`hex`);

    const html = doc.convert();

    const tags = _.compose([
      _.defaultTo([]),
      _.map(_.trim),
      _.filter(_.negate(_.isEmpty)),
      _.split(';'),
    ])(doc.getAttribute('tags'));

    const info = doc.getRevisionInfo();
    const metadata = {
      title: doc.getTitle(),
      description: doc.getAttribute('description') || '',
      date: info.getDate(),
      version: info.getNumber() || '1',
      remark: info.getRemark() || '',
      tags: tags,
      author: doc.getAuthor(),
      authors: _.map(a => ({
        name: a.getName(),
        firstname: a.getFirstName(),
        lastname: a.getLastName(),
        email: a.getEmail(),
        initials: a.getInitials(),
      }))(doc.getAuthors()),
    };

    const images = _.map(i => i.getTarget())(doc.getImages());

    const links = doc.getLinks();

    const asciidocNode = {
      id: createNodeId(`${node.id} >>> Asciidoctor`),
      frontmatter: metadata,
      children: _.compose([
        _.filter(_.negate(_.isNull)),
        _.filter(_.negate(_.startsWith('/'))),
        _.filter(isRelative),
      ])(_.concat(images, links)),
      html,
      parent: node.id,
      internal: {
        content,
        contentDigest,
        type: 'Asciidoctor',
      },
    };

    createNode(asciidocNode);
    createParentChildLink({parent: node, child: asciidocNode});
  });
};
