// @ts-check

import eslint from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
    eslint.configs.recommended,
    tseslint.configs.strict,
    {
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.jest,
            },
        },
        rules: {
            // this is disabled because ts already handles it.
            "no-unused-vars": "off",
            "@typescript-eslint/no-unused-vars": "off",
        },
    },
);
