"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

const asciidoc = require(`asciidoctor.js`)();

function onCreateNode(_x, _x2) {
  return _onCreateNode.apply(this, arguments);
}

function _onCreateNode() {
  _onCreateNode = (0, _asyncToGenerator2.default)(function* ({
    node,
    actions,
    loadNodeContent,
    createNodeId,
    reporter,
    createContentDigest
  }, pluginOptions) {
    // Filter out non-adoc content
    if (!node.extension || node.extension !== `adoc`) {
      return;
    }

    if (pluginOptions.converterFactory) {
      asciidoc.ConverterFactory.register(new pluginOptions.converterFactory(asciidoc), ['html5']);
    }

    const createNode = actions.createNode,
          createParentChildLink = actions.createParentChildLink; // Load Asciidoc contents

    const content = yield loadNodeContent(node); // Load Asciidoc file for extracting
    // https://asciidoctor-docs.netlify.com/asciidoctor.js/processor/extract-api/
    // We use a `let` here as a warning: some operations, like .convert() mutate the document

    let doc = yield asciidoc.load(content, pluginOptions);

    try {
      const html = doc.convert(); // Use "partition" option to be able to get title, subtitle, combined

      const title = doc.getDocumentTitle({
        partition: true
      });
      let revision = null;
      let author = null;

      if (doc.hasRevisionInfo()) {
        revision = {
          date: doc.getRevisionDate(),
          number: doc.getRevisionNumber(),
          remark: doc.getRevisionRemark()
        };
      }

      if (doc.getAuthor()) {
        author = {
          fullName: doc.getAttribute(`author`),
          firstName: doc.getAttribute(`firstname`),
          lastName: doc.getAttribute(`lastname`) || ``,
          middleName: doc.getAttribute(`middlename`) || ``,
          authorInitials: doc.getAttribute(`authorinitials`) || ``,
          email: doc.getAttribute(`email`) || ``
        };
      }

      const asciiNode = {
        id: createNodeId(`${node.id} >>> ASCIIDOC`),
        parent: node.id,
        internal: {
          type: `Asciidoc`,
          mediaType: `text/html`
        },
        children: [],
        html,
        document: {
          title: title.getCombined(),
          subtitle: title.hasSubtitle() ? title.getSubtitle() : ``,
          main: title.getMain()
        },
        revision,
        author
      };
      asciiNode.internal.contentDigest = createContentDigest(asciiNode);
      createNode(asciiNode);
      createParentChildLink({
        parent: node,
        child: asciiNode
      });
    } catch (err) {
      reporter.panicOnBuild(`Error processing Asciidoc ${node.absolutePath ? `file ${node.absolutePath}` : `in node ${node.id}`}:\n
      ${err.message}`);
    }
  });
  return _onCreateNode.apply(this, arguments);
}

exports.onCreateNode = onCreateNode;