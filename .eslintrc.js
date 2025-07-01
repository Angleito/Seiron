module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: './tsconfig.json',
  },
  plugins: [
    '@typescript-eslint',
    'functional',
    'fp',
    'import',
  ],
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    '@typescript-eslint/recommended-requiring-type-checking',
    'plugin:functional/external-vanilla-recommended',
    'plugin:functional/recommended',
    'plugin:functional/stylistic',
    'prettier',
  ],
  rules: {
    // TypeScript specific rules
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/prefer-readonly': 'error',
    '@typescript-eslint/prefer-readonly-parameter-types': 'warn',
    '@typescript-eslint/strict-boolean-expressions': 'error',

    // Functional programming rules
    'functional/no-conditional-statement': 'off', // Allow conditional statements for control flow
    'functional/no-expression-statement': 'off', // Allow expression statements for side effects
    'functional/functional-parameters': [
      'error',
      {
        allowRestParameter: true,
        allowArgumentsKeyword: false,
      },
    ],
    'functional/no-return-void': 'error',
    'functional/prefer-readonly-type': [
      'error',
      {
        allowLocalMutation: false,
        allowMutableReturnType: false,
        ignoreClass: false,
        ignoreInterface: false,
        ignoreCollections: false,
      },
    ],
    'functional/no-mixed-type': 'error',
    'functional/no-classes': 'error',
    'functional/no-this-expression': 'error',
    'functional/no-throw-statement': 'error',
    'functional/no-try-statement': 'error',

    // FP plugin rules
    'fp/no-arguments': 'error',
    'fp/no-class': 'error',
    'fp/no-delete': 'error',
    'fp/no-events': 'error',
    'fp/no-get-set': 'error',
    'fp/no-let': 'error',
    'fp/no-loops': 'error',
    'fp/no-mutating-assign': 'error',
    'fp/no-mutating-methods': 'error',
    'fp/no-mutation': [
      'error',
      {
        allowThis: false,
        exceptions: ['module.exports'],
      },
    ],
    'fp/no-nil': 'warn',
    'fp/no-proxy': 'error',
    'fp/no-rest-parameters': 'off', // Allow rest parameters for functional composition
    'fp/no-this': 'error',
    'fp/no-throw': 'error',
    'fp/no-unused-expression': 'error',
    'fp/no-valueof-field': 'error',

    // Import rules
    'import/order': [
      'error',
      {
        groups: [
          'builtin',
          'external',
          'internal',
          'parent',
          'sibling',
          'index',
        ],
        'newlines-between': 'always',
      },
    ],
    'import/no-default-export': 'error',
    'import/prefer-default-export': 'off',

    // General rules
    'no-console': 'warn',
    'prefer-const': 'error',
    'no-var': 'error',
    'no-param-reassign': 'error',
    'no-implicit-coercion': 'error',
    'prefer-template': 'error',
    'prefer-arrow-callback': 'error',
    'arrow-body-style': ['error', 'as-needed'],
  },
  overrides: [
    {
      files: ['*.test.ts', '*.spec.ts'],
      rules: {
        'functional/no-expression-statement': 'off',
        'functional/no-return-void': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        'fp/no-unused-expression': 'off',
      },
    },
    {
      files: ['scripts/**/*.ts'],
      rules: {
        'functional/no-expression-statement': 'off',
        'no-console': 'off',
      },
    },
    {
      files: ['*.config.js', '*.config.ts'],
      rules: {
        'import/no-default-export': 'off',
        'functional/no-expression-statement': 'off',
        'functional/immutable-data': 'off',
      },
    },
  ],
  env: {
    node: true,
    es2022: true,
    jest: true,
  },
  ignorePatterns: [
    'dist/',
    'node_modules/',
    'contracts/out/',
    'coverage/',
    '*.js',
  ],
};