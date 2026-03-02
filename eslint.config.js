// @ts-check
const tseslint = require("@typescript-eslint/eslint-plugin");
const tsparser = require("@typescript-eslint/parser");

/** @type {import("eslint").Linter.Config[]} */
module.exports = [
    {
        files: ["src/**/*.ts"],
        ignores: ["out/**", "dist/**", "**/*.d.ts"],
        languageOptions: {
            parser: tsparser,
            parserOptions: {
                ecmaVersion: 2022,
                sourceType: "module",
                project: "tsconfig.json",
            },
        },
        plugins: {
            "@typescript-eslint": tseslint,
        },
        rules: {
            "@typescript-eslint/naming-convention": [
                "warn",
                {
                    "selector": "import",
                    "format": ["camelCase", "PascalCase"],
                },
            ],
            "@typescript-eslint/no-floating-promises": "warn",
            "@typescript-eslint/no-unused-expressions": "warn",
            "@typescript-eslint/no-explicit-any": "warn",
            "curly": "warn",
            "eqeqeq": "warn",
            "no-throw-literal": "warn",
            "no-duplicate-imports": "warn",
            "semi": "warn",
        },
    },
];
