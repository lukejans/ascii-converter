import fs from "node:fs";
import process from "node:process";

import AsciiImg from "./ascii-image.ts";
import config from "./config.ts";

const asciiFrames: string[][] = [];

// ----------------
// ascii conversion
// ----------------

// process each frame file
for (let i = 0; i < config.frames.source.length; i++) {
    const buffer = fs.readFileSync(config.frames.source[i]);

    // create a text representation of the image
    const asciiImg = new AsciiImg(buffer);
    await asciiImg.edgeToAscii();
    await asciiImg.lumaToAscii();

    // create an array to store each frame
    asciiFrames[i] = asciiImg.text;
}

// all files have been processed so write to an output file
fs.writeFileSync(config.asciiResult, JSON.stringify(asciiFrames));
console.log(`File written successfully to ${config.asciiResult}`);

const gracefulExit = (function () {
    let clean = false;

    return (code: NodeJS.Signals | Error | string | number) => {
        if (!clean) {
            // perform the cleanup
            if (fs.existsSync(config.tmpDir)) {
                fs.rmSync(config.tmpDir, { recursive: true, force: true });
            }
            // make sure we only cleanup once
            clean = true;

            // if the event that trigger the exit was an Error make
            // sure to still display the error message.
            if (code instanceof Error) {
                console.log(code);
            }
        }
    };
})();

process
    .on("exit", gracefulExit) // before exiting
    .on("SIGINT", gracefulExit) // ctrl+C
    .on("SIGTERM", gracefulExit) // kill <pid>
    .on("SIGHUP", gracefulExit) // window close or parent death
    .on("SIGBREAK", gracefulExit) // winOS ctrl+Break
    .on("uncaughtException", gracefulExit) // uncaught exception
    .on("unhandledRejection", gracefulExit); // unhandled rejection
