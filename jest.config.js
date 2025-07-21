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
        "!**/node_modules/**",
        "!**/*.test.{ts,tsx}",
        "!**/tests/**",
    ],
    coverageReporters: ["text", { skipFull: true }],
    coverageProvider: "v8",

    // typescript & esm compatibility
    ...createDefaultEsmPreset(),
};

export default config;
