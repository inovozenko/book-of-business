// Lines up `from` in consecutive single-line imports, like IntelliJ IDEA's "Align 'from' clauses":
//
//   import { Card }              from './Card';
//   import { useMemo, useState } from 'react';
//
// A blank line, a multi-line import or a side-effect import ends the run.
export default {
  meta: {
    type: 'layout',
    docs: {description: "Align 'from' in consecutive single-line imports"},
    fixable: 'whitespace',
    schema: [],
    messages: {align: "Align 'from' with the neighbouring imports."}
  },
  create(context) {
    const source = context.sourceCode;

    return {
      Program(program) {
        const runs = [];
        let run = [];
        let previousLine = -1;

        for (const node of program.body) {
          const singleLine = node.type === 'ImportDeclaration' && node.specifiers.length > 0 && node.loc.start.line === node.loc.end.line;

          if (!singleLine || node.loc.start.line !== previousLine + 1) {
            runs.push(run);
            run = [];
          }

          if (singleLine) {
            const from = source.getTokenBefore(node.source);

            run.push({node, from, before: source.getTokenBefore(from)});
          }

          previousLine = node.loc.end.line;
        }

        runs.push(run);

        for (const imports of runs) {
          const column = Math.max(...imports.map(({before}) => before.loc.end.column + 1));

          for (const {node, from, before} of imports) {
            if (from.loc.start.column !== column) {
              context.report({
                node,
                messageId: 'align',
                fix: (fixer) => fixer.replaceTextRange([before.range[1], from.range[0]], ' '.repeat(column - before.loc.end.column))
              });
            }
          }
        }
      }
    };
  }
};
