// eslint-disable-file
export default {

    rules: {
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-empty-object-type": "off",
        "@typescript-eslint/no-unnecessary-type-constraint": "off",
        "import/no-anonymous-default-export": "off",
        "no-unused-expressions": [
            "error",
            { allowShortCircuit: true, allowTernary: true },
        ],
        "@typescript-eslint/no-unused-expressions": [
            "error",
            { allowShortCircuit: true, allowTernary: true },
        ],
        "no-unused-vars": "off",
        "@typescript-eslint/ban-ts-comment": "off",
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
    },
};
