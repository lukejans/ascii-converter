import type { CommandOptions } from "../cli.ts";

declare global {
    var state: {
        tmpDir: string;
        frames: string[];
        asciiResult: string[][][];
        live: boolean;
    };
    var options: CommandOptions;
}

export {};
