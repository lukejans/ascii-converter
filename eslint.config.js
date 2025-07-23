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
    },
);
