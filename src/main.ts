import "./cli/cli.ts";

import fs from "node:fs";
import process from "node:process";

import { previewAsciiAction } from "./cli/actions.ts";
import { options } from "./cli/cli.ts";
import { runConverter } from "./converter/runner.ts";
import { state } from "./globals.ts";

// === exit cleanup ===

/**
 * @internal
 * gracefully exit the program / node process when event occurs
 * which will cause the program to exit. This callback function
 * will be attached to different process events that would exit
 * the program such as; user termination, program completion, or
 * an error.
 *
 * @param code - value from the process.exit emitted event
 */
const gracefulExit = (() => {
    let clean = false;

    return function (code: NodeJS.Signals | Error | string | number) {
        // set status to exit
        state.live = false;

        // make the cursor visible and disable alternate buffer
        if (options.preview) {
            process.stdout.write("\x1B[?25h");
            process.stdout.write("\x1B[?1049l");
        }

        if (!clean) {
            // perform the cleanup
            if (fs.existsSync(state.tmpDir)) {
                fs.rmSync(state.tmpDir, { recursive: true, force: true });
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
    .on("exit", gracefulExit) // before exiting
    .on("SIGINT", gracefulExit) // ctrl+C
    .on("SIGTERM", gracefulExit) // kill <pid>
    .on("SIGHUP", gracefulExit) // window close or parent death
    .on("SIGBREAK", gracefulExit) // winOS ctrl+Break
    .on("uncaughtException", gracefulExit) // uncaught exception
    .on("unhandledRejection", gracefulExit); // unhandled rejection

// === ascii conversion ===

await runConverter();

// === run preview ===

if (options.preview) {
    let asciiFrames;
    try {
        asciiFrames = JSON.parse(fs.readFileSync(options.output, "utf8"));
    } catch (error) {
        if (error instanceof Error) {
            console.error(`Error reading or parsing: ${error.message}`);
        } else throw error;
    }

    previewAsciiAction(asciiFrames);
}
