// Puts the props of a JSX opening tag on the tag's line when the whole line fits:
//
//   <XAxis dataKey="category"              →   <XAxis dataKey="category" height={X_AXIS_HEIGHT} tick={renderXTick} />
//     height={X_AXIS_HEIGHT}
//     tick={renderXTick} />
//
// A tag stays as written when a prop spans several lines or a comment sits between the props.
export default {
  meta: {
    type: 'layout',
    docs: {description: 'Put the props of a JSX opening tag on one line when it fits'},
    fixable: 'whitespace',
    schema: [{type: 'object', properties: {maxLength: {type: 'integer', minimum: 1}}, additionalProperties: false}],
    messages: {join: 'Put the props on the line of the tag: it fits in {{maxLength}} characters.'}
  },
  create(context) {
    const source = context.sourceCode;
    const maxLength = context.options[0]?.maxLength ?? 240;

    return {
      JSXOpeningElement(node) {
        if (node.loc.start.line === node.loc.end.line) {
          return;
        }

        const {attributes} = node;

        if (attributes.some((attribute) => attribute.loc.start.line !== attribute.loc.end.line)) {
          return;
        }

        const inAttribute = (comment) => attributes.some((attribute) => comment.range[0] >= attribute.range[0] && comment.range[1] <= attribute.range[1]);

        if (source.getCommentsInside(node).some((comment) => !inAttribute(comment))) {
          return;
        }

        const head = source.text.slice(node.range[0], (node.typeArguments ?? node.name).range[1]);
        const tail = node.selfClosing ? ' />' : '>';
        const joined = [head, ...attributes.map((attribute) => source.getText(attribute))].join(' ') + tail;
        const before = source.lines[node.loc.start.line - 1].slice(0, node.loc.start.column);
        const after = source.lines[node.loc.end.line - 1].slice(node.loc.end.column);

        if (before.length + joined.length + after.length > maxLength) {
          return;
        }

        context.report({
          node,
          messageId: 'join',
          data: {maxLength},
          fix: (fixer) => fixer.replaceText(node, joined)
        });
      }
    };
  }
};
