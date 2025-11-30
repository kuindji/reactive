import js from "@eslint/js";
import typescriptParser from "@typescript-eslint/parser";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

const ignores = globalIgnores([
    "dist/**/*",
    "node_modules/**/*",
]);

const extraConfig = {
    rules: {
        "@typescript-eslint/no-empty-object-type": "off",
        "@typescript-eslint/no-unused-vars": [
            "error",
            {
                argsIgnorePattern: "^_",
                caughtErrors: "none",
                caughtErrorsIgnorePattern: "^_",
                destructuredArrayIgnorePattern: "^_",
                ignoreRestSiblings: true,
                varsIgnorePattern: "^_",
            },
        ],

        // Generic event/action library uses 'any' by design for flexibility
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-unsafe-assignment": "off",
        "@typescript-eslint/no-unsafe-argument": "off",
        "@typescript-eslint/no-unsafe-return": "off",
        "@typescript-eslint/no-unsafe-member-access": "off",
        "@typescript-eslint/no-unsafe-call": "off",
        "@typescript-eslint/no-redundant-type-constituents": "off",
        "@typescript-eslint/no-duplicate-type-constituents": "off",
        "@typescript-eslint/no-unused-expressions": [
            "error",
            { allowShortCircuit: true, allowTernary: true },
        ],
        "@typescript-eslint/ban-ts-comment": "off",
    },
};

const tsConfig = {
    extends: [
        js.configs.recommended,
        tseslint.configs.recommendedTypeChecked,
        extraConfig,
    ],
    files: [ "src/**/*.{ts,tsx}", "tests/**/*.{ts,tsx}" ],
    languageOptions: {
        parser: typescriptParser,
        ecmaVersion: "latest",
        parserOptions: {
            project: [ "tsconfig.json" ],
        },
        globals: {
            NodeJS: false,
            ...globals.node,
        },
    },
};

const jsConfig = {
    extends: [
        js.configs.recommended,
    ],
    files: [ "eslint.config.js" ],
};

export default defineConfig([
    ignores,
    tsConfig,
    jsConfig,
]);
