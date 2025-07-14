import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { mapValue } from "./utils.ts";

// exit early if no path was passed
if (!process.argv[2]) {
    console.error("No path provided");
    process.exit(1);
}

type SharpImg = {
    data: Buffer;
    info: sharp.OutputInfo;
};

const DENSITY = "#$?0=*c~. ";
const FRAMES_DIR = path.resolve(process.argv[2]);

// load all the files
const frameFiles = await fs
    .readdir(FRAMES_DIR)
    .then((res) => res.sort())
    .catch((err) => {
        throw new Error(err);
    });

// process each frame file
let asciiFrames: string[][] = [];
for (let i = 0; i < frameFiles.length; i++) {
    // extract raw, unsigned 8-bit RGB pixel data from png
    const data = await sharp(path.resolve(FRAMES_DIR, frameFiles[i]))
        .raw()
        .toBuffer({ resolveWithObject: true });

    // create an array to store each frame
    asciiFrames[i] = constructFrame(data);
}

function constructFrame(sharpImg: SharpImg): string[] {
    // string to store the image in ascii format
    let asciiImage: string[] = Array(sharpImg.info.height).fill("");
    // start at the top row and then check each column in the row so
    // the asciiImageStr is built top to bottom, left to right.
    for (let row = 0; row < sharpImg.info.height; row++) {
        for (let col = 0; col < sharpImg.info.width; col++) {
            // formula to find the first channels value for a pixel.
            let pixelIndex =
                (row * sharpImg.info.width + col) * sharpImg.info.channels;

            // the channels are red, green, blue
            let r, g, b;
            r = sharpImg.data[pixelIndex];
            g = sharpImg.data[pixelIndex + 1];
            b = sharpImg.data[pixelIndex + 2];

            // calculate the luminance of a given pixel (rec 709)
            // more info: https://en.wikipedia.org/wiki/Relative_luminance
            let luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;

            // map the luminance to a character density index
            let charIndex = Math.round(
                mapValue(luminance, 0, 255, 0, DENSITY.length - 1),
            );

            // add a character (pixel) to the row
            asciiImage[row] += DENSITY.charAt(charIndex);
        }
    }
    return asciiImage;
}

// // all files have been processed so write to an output file
fs.writeFile("frames.json", JSON.stringify(asciiFrames));
