import fs from "node:fs";
import AsciiImg from "./ascii-image.ts";

import { options } from "../cli/cli.ts";
import { state } from "../globals.ts";

export async function runConverter() {
    for (let i = 0; i < state.frames.length; i++) {
        const buffer = fs.readFileSync(state.frames[i]);

        // create a text representation of the image
        const asciiImg = new AsciiImg(buffer);
        await asciiImg.edgeToAscii();
        await asciiImg.lumaToAscii();

        // create an array to store each frame
        state.asciiResult[i] = asciiImg.text;
    }

    // all files have been processed so write to an output file
    fs.writeFileSync(options.output, JSON.stringify(state.asciiResult));
    console.log(`File written successfully to ${options.output}`);
}
