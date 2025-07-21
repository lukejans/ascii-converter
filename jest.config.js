import { createDefaultEsmPreset } from "ts-jest";

/** @type {import('jest').Config} */
const config = {
    // environment
    testEnvironment: "node",
    clearMocks: true,

    // coverage
    collectCoverage: true,
    collectCoverageFrom: [
        "src/**/*.{ts,tsx}",
        "!src/types/**",
        "!**/node_modules/**",
        "!**/*.test.{ts,tsx}",
        "!**/tests/**",
    ],
    coverageReporters: ["text"],
    coverageProvider: "v8",

    // typescript & esm compatibility
    ...createDefaultEsmPreset(),
};

export default config;
