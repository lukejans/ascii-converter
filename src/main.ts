import fs from "node:fs/promises";
import path from "node:path";
import AsciiImg from "./ascii-image.ts";

const FRAMES_DIR = "bin/frames-test";
const RESULT: string[][] = [];

// load all the files
const frameFiles = await fs
    .readdir(FRAMES_DIR)
    .then((res) => res.sort())
    .catch((err) => {
        throw new Error(err);
    });

// process each frame file
const asciiFrames: string[][] = [];
for (let i = 0; i < frameFiles.length; i++) {
    const buffer = await fs.readFile(path.resolve(FRAMES_DIR, frameFiles[i]));

    // create a text representation of the image
    const asciiImg = new AsciiImg(buffer);
    await asciiImg.edgeToAscii();
    await asciiImg.lumaToAscii();

    // create an array to store each frame
    RESULT[i] = asciiImg.text;
}

// all files have been processed so write to an output file
fs.writeFile("./bin/frames.json", JSON.stringify(asciiFrames));
