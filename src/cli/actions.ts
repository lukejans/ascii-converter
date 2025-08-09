import { hrtime } from "node:process";
import { options } from "./cli.ts";

export async function previewAsciiAction(asciiFrames: string[][]) {
    const FRAME_DURATION = 1000 / Number(options.frameRate);

    // enable alternate buffer to preserve the users history
    process.stdout.write("\x1B[?1049h");
    // hide the cursor
    process.stdout.write("\x1b[?25l");

    if (asciiFrames.length === 1) {
        displayFrame(asciiFrames[0]);
    } else {
        // infinite video loop
        let i = 0;
        while (global.state.live) {
            // time frame display overhead so that the delay can be
            // adjusted to ensure a more consistent frame rate.
            const start = hrtime.bigint();

            // display each frame
            displayFrame(asciiFrames[i]);

            // calculate delay between frames
            const end = hrtime.bigint();
            const elapsed = Number(end - start) / 1_000_000; // ns -> ms
            const delay = Math.max(0, FRAME_DURATION - elapsed);

            // show frame information
            process.stdout.write(`\nframe: ${i + 1}/${asciiFrames.length}`);

            // delay between frames
            await new Promise((resolve) => setTimeout(resolve, delay));

            // increment frame index
            i = (i + 1) % asciiFrames.length;
        }
    }
}

// === Internal functions ===

/**
 * @todo consider using a global variable to track if the
 * cursor is invisible so it can be made visible in the cleanup.
 *
 * @internal
 * display a single ascii frame / image. This will clear the
 * screen and write the frame to stdout using ANSI escape codes.
 *
 * @param frame - the ascii frame/image to display
 */
function displayFrame(frame: string[]) {
    // clear stdout before displaying
    process.stdout.write("\x1B[H\x1B[2J");

    // display the line to stdout
    process.stdout.write(frame.join("\n"));
}
