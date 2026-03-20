import typescriptEslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import pluginVue from 'eslint-plugin-vue';

export default [...pluginVue.configs['flat/recommended'], {
    files: ['**/*.ts'],
    languageOptions: {
        parser: tsParser,
        ecmaVersion: 2022,
        sourceType: 'module',
    },
}, {
    files: ['**/*.vue'],
    languageOptions: {
        parserOptions: {
            parser: tsParser,
            ecmaVersion: 2022,
            sourceType: 'module',
        },
    },
}, {
    files: ['**/*.ts', '**/*.vue'],
    plugins: {
        '@typescript-eslint': typescriptEslint,
    },

    rules: {
        'vue/html-indent': ['warn', 4],
        'vue/max-attributes-per-line': ['warn', { singleline: { max: 5 }, multiline: { max: 1 } }],
        'vue/no-v-html': 'off',
        'vue/html-self-closing': ['warn', { html: { void: 'any', normal: 'always', component: 'always' } }],
        'vue/singleline-html-element-content-newline': 'off',

        '@typescript-eslint/naming-convention': ['warn',
            { selector: 'import', format: ['camelCase', 'PascalCase'] },
            { selector: 'variable', format: ['camelCase', 'UPPER_CASE', 'PascalCase'], leadingUnderscore: 'allow' },
            { selector: 'function', format: ['camelCase', 'PascalCase'] },
            { selector: 'typeLike', format: ['PascalCase'] },
            { selector: 'classProperty', format: ['camelCase'], leadingUnderscore: 'allow' },
        ],

        '@typescript-eslint/no-explicit-any': 'warn',
        'brace-style': ['warn', '1tbs'],
        curly: 'warn',
        eqeqeq: 'warn',
        indent: ['warn', 4, { SwitchCase: 1 }],
        'no-throw-literal': 'warn',
        quotes: ['warn', 'single', { avoidEscape: true }],
        semi: 'warn',
    },
}];