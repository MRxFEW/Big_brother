module.exports = {
  env: {
    es6: true,
    node: true,
  },
  parserOptions: {
    ecmaVersion: 2024,
    sourceType: 'script',
  },
  extends: [
    'eslint:recommended',
  ],
  rules: {
    'no-restricted-globals': ['error', 'name', 'length'],
    'prefer-arrow-callback': 'off',
    'quotes': 'off',
    'semi': 'off',
    'linebreak-style': 'off',
    'max-len': 'off',
    'indent': 'off',
    'no-tabs': 'off',
    'object-curly-spacing': 'off',
  },
  overrides: [
    {
      files: ['**/*.spec.*'],
      env: {
        mocha: true,
      },
      rules: {},
    },
  ],
  globals: {},
};
