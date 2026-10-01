import js                            from '@eslint/js';
import {defineConfig, globalIgnores} from 'eslint/config';

import stylistic     from '@stylistic/eslint-plugin';
import perfectionist from 'eslint-plugin-perfectionist';
import reactHooks    from 'eslint-plugin-react-hooks';
import reactRefresh  from 'eslint-plugin-react-refresh';
import globals       from 'globals';
import tseslint      from 'typescript-eslint';

import alignImports      from './eslint-rules/align-imports.js';
import importsOnOneLine  from './eslint-rules/imports-on-one-line.js';
import jsxPropsOnOneLine from './eslint-rules/jsx-props-on-one-line.js';

const style = stylistic.configs.customize({
  indent: 2,
  quotes: 'single',
  semi: true,
  commaDangle: 'never',
  braceStyle: '1tbs',
  arrowParens: true,
  quoteProps: 'as-needed',
  jsx: true
});

// The preset indents JSX props by 2; here jsx-indent-props lines them up with the first prop instead.
const [indentLevel, indentSize, indentOptions] = style.rules['@stylistic/indent'];

export default defineConfig([
  globalIgnores(['dist', 'coverage', 'playwright-report', 'test-results', '.wrangler', '.playwright-mcp']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, tseslint.configs.recommended]
  },
  {
    files: ['client/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat.recommended, reactRefresh.configs.vite],
    languageOptions: {
      globals: globals.browser
    }
  },
  {
    files: ['server/**/*.ts', 'e2e/**/*.ts', '*.config.ts'],
    languageOptions: {
      globals: globals.node
    }
  },

  // Code style: the IntelliJ IDEA TypeScript scheme, plus the blank-line rules IDEA does not have.
  // `npm run format` applies it; IDEA applies it on save with "Run eslint --fix on save".
  style,
  {
    plugins: {
      perfectionist,
      local: {rules: {'align-imports': alignImports, 'imports-on-one-line': importsOnOneLine, 'jsx-props-on-one-line': jsxPropsOnOneLine}}
    },
    rules: {
      // IDEA: "Force braces: Always", with the body on a line of its own.
      curly: ['error', 'all'],
      '@stylistic/brace-style': ['error', '1tbs', {allowSingleLine: false}],
      '@stylistic/quotes': ['error', 'single', {avoidEscape: true}],
      // Blank lines: around a group of declarations, around blocks, before `return` and after `super()`.
      // When several entries match a pair of statements, the last one wins.
      '@stylistic/padding-line-between-statements': ['error',
        {blankLine: 'always', prev: '*', next: ['const', 'let', 'var']},
        {blankLine: 'always', prev: ['const', 'let', 'var'], next: '*'},
        {blankLine: 'any', prev: ['const', 'let', 'var'], next: ['const', 'let', 'var']},
        {blankLine: 'always', prev: 'block-like', next: '*'},
        {blankLine: 'always', prev: '*', next: ['if', 'for', 'while', 'do', 'switch', 'try']},
        {blankLine: 'always', prev: '*', next: 'return'},
        {blankLine: 'always', prev: {selector: 'ExpressionStatement[expression.callee.type="Super"]'}, next: '*'}
      ],
      // `=` ends the line, as in IDEA; other operators start the next one.
      '@stylistic/operator-linebreak': ['error', 'before', {overrides: {'=': 'after'}}],
      // As IDEA does by default: no spaces in object, destructuring and import braces, spaces in type braces.
      '@stylistic/object-curly-spacing': ['error', 'never', {
        overrides: {TSTypeLiteral: 'always', TSInterfaceBody: 'always', TSMappedType: 'always', TSEnumBody: 'always'}
      }],

      // JSX: do not move tag content, props or the closing `>` onto lines of their own,
      // and put the props on the tag's line when it fits in the IDEA right margin.
      '@stylistic/jsx-one-expression-per-line': 'off',
      '@stylistic/jsx-max-props-per-line': 'off',
      // Off: its fix drops type arguments, turning `<TreeTable<Item>` into `<TreeTable` (@stylistic 5.10).
      '@stylistic/jsx-first-prop-new-line': 'off',
      '@stylistic/jsx-closing-bracket-location': ['error', 'after-props'],
      // The props of a multi-line tag line up under the first one: <Row id={row.id}
      //                                                                  className={styles.row}>
      '@stylistic/jsx-indent-props': ['error', 'first'],
      '@stylistic/indent': [indentLevel, indentSize, {...indentOptions, ignoredNodes: [...indentOptions.ignoredNodes, 'JSXAttribute', 'JSXSpreadAttribute']}],
      'local/jsx-props-on-one-line': ['error', {maxLength: 240}],
      // Props in the attribute order of the Code Guide (codeguide.co): class, id and name, data-, the attributes
      // of the element, title and alt, role and aria-, tabindex, style. React's key and ref come before them, the
      // other component props join the attributes of the element, handlers close the tag. Inside a group the props
      // keep the order they are written in; a {...spread} is never crossed.
      'perfectionist/sort-jsx-props': ['error', {
        type: 'unsorted',
        customGroups: [
          {groupName: 'react', elementNamePattern: '^(key|ref)$'},
          {groupName: 'class', elementNamePattern: '^className$'},
          {groupName: 'id', elementNamePattern: '^(id|name)$'},
          {groupName: 'data', elementNamePattern: '^data-'},
          {groupName: 'element', elementNamePattern: '^(src|htmlFor|type|href|value)$'},
          {groupName: 'title', elementNamePattern: '^(title|alt)$'},
          {groupName: 'a11y', elementNamePattern: '^(role|aria-.+)$'},
          {groupName: 'tabindex', elementNamePattern: '^tabIndex$'},
          {groupName: 'style', elementNamePattern: '^style$'},
          {groupName: 'handler', elementNamePattern: '^on[A-Z]'}
        ],
        groups: ['react', 'class', 'id', 'data', 'element', 'title', 'unknown', 'a11y', 'tabindex', 'style', 'handler'],
        newlinesBetween: 0
      }],

      // Imports in three groups split by a blank line: frameworks, libraries, application code.
      // Each group is sorted by module name. Styles close the last group so that a component's own
      // styles load after the styles of the components it renders and win ties.
      'perfectionist/sort-imports': ['error', {
        customGroups: [{
          groupName: 'framework',
          elementNamePattern: ['^node:', '^react$', '^react-dom(/|$)', '^hono(/|$)', '^@hono/', '^vite$', '^vitest(/|$)', '^@playwright/test$', '^eslint(/|$)', '^@eslint/']
        }],
        groups: ['framework', ['builtin', 'external'], ['internal', 'parent', 'sibling', 'index', 'unknown'], {newlinesBetween: 0}, 'style'],
        newlinesBetween: 1
      }],
      'perfectionist/sort-named-imports': 'error',
      'local/imports-on-one-line': ['error', {maxLength: 240}],
      'local/align-imports': 'error',
      // The spaces that line up `from` are not extra.
      '@stylistic/no-multi-spaces': ['error', {exceptions: {Property: true, ImportDeclaration: true}}]
    }
  }
]);
