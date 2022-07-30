module.exports = {
  env: {
    browser: false,
    es6: true
  },
  extends: ['prettier-standard', 'standard', 'prettier'],

  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly'
  },
  parserOptions: {
    ecmaVersion: 2018
  },
  plugins: ['prettier'],
  rules: {
    semi: ['error', 'never'],
    quotes: ['error', 'single'],
    'no-undef': 'off',
    'no-empty': 'off',
    'arrow-parens': 'off',
    'padded-blocks': 'off',
    'space-before-function-paren': 'off',

    'prettier/prettier': 'error'
  }
}
