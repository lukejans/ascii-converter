import { createDefaultEsmPreset } from "ts-jest";

/** @type {import('jest').Config} */
const config = {
    // testing
    testEnvironment: "node",
    testMatch: [
        "**/*.test.ts",
        "**/tests/**",
        "!**/__fixtures__/**",
        "!**/node_modules/**",
    ],
    clearMocks: true,

    // coverage
    collectCoverage: true,
    collectCoverageFrom: [
        "src/**/*.ts",
        "!src/types/**",
        "!**/node_modules/**",
        "!**/*.test.ts",
        "!**/tests/**",
    ],
    coverageReporters: ["text"],
    coverageProvider: "v8",

    // typescript & esm compatibility
    ...createDefaultEsmPreset(),
};

export default config;
