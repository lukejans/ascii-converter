import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import AsciiImg from "./converter.ts";

import { initializeFrames, options, showAsciiPreview } from "./cli.ts";

/* Setup Global State */

global.state = {
    /**
     * Temporary directory for storing the frames that are
     * produced by ffmpeg splitting a video. This always uses
     * the operating system's recommended temporary directory.
     */
    tmpDir: fs.mkdtempSync(path.join(os.tmpdir(), "frames_")),
    /**
     * Paths to image(s) that will be processed.
     */
    frames: [],
    /**
     * Ascii result from the ascii converter. This can either be
     * a single frame if only a photo was processed or multiple
     * frames if the input was a video.
     */
    asciiResult: [],
    /**
     * The current state of the application. This will be live until
     * something causes the application to exit.
     */
    live: true,
};

/* Setup Exit Cleanup */

/**
 * callback function to cleanup any resources created during runtime
 * before the program exits.
 *
 * @param code - value from the process.exit emitted event
 */
const cleanup = (() => {
    let clean = false;

    return function (code: NodeJS.Signals | Error | string | number) {
        // set status to exit
        global.state.live = false;

        // make the cursor visible and disable alternate buffer
        if (options.preview) {
            process.stdout.write("\x1B[?25h");
            process.stdout.write("\x1B[?1049l");
        }

        if (!clean) {
            // perform the cleanup
            if (fs.existsSync(global.state.tmpDir)) {
                fs.rmSync(global.state.tmpDir, {
                    recursive: true,
                    force: true,
                });
            }
            // make sure we only cleanup once
            clean = true;

            // if the event that trigger the exit was an Error make
            // sure to still display the error message.
            if (code instanceof Error) {
                console.log(code.message);
            }
        }
    };
})();

process
    .on("exit", cleanup) // before exiting
    .on("SIGINT", cleanup) // ctrl+C
    .on("SIGTERM", cleanup) // kill <pid>
    .on("SIGHUP", cleanup) // window close or parent death
    .on("SIGBREAK", cleanup) // winOS ctrl+Break
    .on("uncaughtException", cleanup) // uncaught exception
    .on("unhandledRejection", cleanup); // unhandled rejection

/* # Initialize CLI state */

initializeFrames();

/* # Convert to ASCII */

for (let i = 0; i < global.state.frames.length; i++) {
    const buffer = fs.readFileSync(global.state.frames[i]);

    const imgMods = options.dimensions
        ? {
              ...options.dimensions,
              threshold: options.threshold,
          }
        : {
              width: 0,
              height: 0,
              threshold: options.threshold,
          };

    // create a text representation of the image
    const asciiImg = new AsciiImg(buffer, imgMods, options.pixels);
    await asciiImg.edgeToAscii();
    await asciiImg.lumaToAscii();

    // create an array to store each frame
    global.state.asciiResult[i] = asciiImg.text;
}

// all files have been processed so write to an output file
fs.writeFileSync(options.output, JSON.stringify(global.state.asciiResult));
console.log(
    `File written successfully to ${path.relative(".", options.output)}`,
);

/* # Preview Result */

if (options.preview) {
    let asciiFrames;
    try {
        asciiFrames = JSON.parse(fs.readFileSync(options.output, "utf8"));
    } catch (error) {
        if (error instanceof Error) {
            console.error(`Error reading or parsing: ${error.message}`);
        } else throw error;
    }

    showAsciiPreview(asciiFrames);
}
