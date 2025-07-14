// @ts-check

import eslint from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
    {
        languageOptions: {
            globals: globals.node,
        },
    },
    eslint.configs.recommended,
    tseslint.configs.strict,
);
