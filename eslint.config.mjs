// eslint-disable-file
export default {
    plugins: {
        "@typescript-eslint": {
            "parser": "typescript-eslint/parser",
            "parserOptions": {
                "project": "./tsconfig.json",
            },
        },
    },
    rules: {
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-empty-object-type": "off",
        "@typescript-eslint/no-unnecessary-type-constraint": "off",
        "import/no-anonymous-default-export": "off",
        "no-unused-expressions": [
            "error",
            { allowShortCircuit: true, allowTernary: true },
        ],
        "no-unused-vars": "off",
        "@typescript-eslint/ban-ts-comment": "off",
    },
};
