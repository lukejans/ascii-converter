import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { convertImageToASCII } from "./convolve.ts";
import { mapValue } from "./utils.ts";

interface SharpImg {
    data: Buffer;
    info: sharp.OutputInfo;
}

const DENSITY = "#$?0=*c~. ";
const FRAMES_DIR = "public/frames";

function constructFrame(sharpImg: SharpImg): string[] {
    // string to store the image in ascii format
    const asciiImage: string[] = Array(sharpImg.info.height).fill("");
    // start at the top row and then check each column in the row so
    // the asciiImageStr is built top to bottom, left to right.
    for (let row = 0; row < sharpImg.info.height; row++) {
        for (let col = 0; col < sharpImg.info.width; col++) {
            // formula to find the first channels value for a pixel.
            const pixelIndex =
                (row * sharpImg.info.width + col) * sharpImg.info.channels;

            // the channels are red, green, blue
            const r = sharpImg.data[pixelIndex];
            const g = sharpImg.data[pixelIndex + 1];
            const b = sharpImg.data[pixelIndex + 2];

            // calculate the luminance of a given pixel (rec 709)
            // more info: https://en.wikipedia.org/wiki/Relative_luminance
            const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;

            // map the luminance to a character density index
            const charIndex = Math.round(
                mapValue(luminance, 0, 255, 0, DENSITY.length - 1),
            );

            // add a character (pixel) to the row
            asciiImage[row] += DENSITY.charAt(charIndex);
        }
    }
    return asciiImage;
}

export interface ImageInfo {
    buffer: Buffer;
    w: number;
    h: number;
    threshold: number;
}

function stichASCII(imgBase: string[], imgAdd: string[]): string[] {
    const res: string[] = Array(imgInfo.h).fill("");
    // stitch the two images together
    for (let i = 0; i < imgInfo.h; i++) {
        for (let j = 0; j < imgInfo.w; j++) {
            if (imgBase[i][j] === " ") {
                res[i] += imgAdd[i][j];
            } else {
                res[i] += imgBase[i][j];
            }
        }
    }
    return res;
}

// load all the files
const frameFiles = await fs
    .readdir(FRAMES_DIR)
    .then((res) => res.sort())
    .catch((err) => {
        throw new Error(err);
    });

// image configuration
const imgInfo: ImageInfo = {
    buffer: await fs.readFile(path.resolve(FRAMES_DIR, frameFiles[0])),
    w: 160,
    h: 80,
    threshold: 0.8,
};

// process each frame file
const asciiFrames: string[][] = [];
for (let i = 0; i < frameFiles.length; i++) {
    imgInfo.buffer = await fs.readFile(path.resolve(FRAMES_DIR, frameFiles[i]));
    // extract raw, unsigned 8-bit RGB pixel data from png
    const buffer = await sharp(imgInfo.buffer)
        .resize({
            width: imgInfo.w,
            height: imgInfo.h,
            fit: "fill",
        })
        .raw()
        .toBuffer({ resolveWithObject: true });

    const imgBase = await convertImageToASCII(imgInfo);
    const imgAdd = constructFrame(buffer);

    // create an array to store each frame
    asciiFrames[i] = stichASCII(imgBase, imgAdd);
}

// all files have been processed so write to an output file
fs.writeFile("frames.json", JSON.stringify(asciiFrames));
