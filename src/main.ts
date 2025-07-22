#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import ASCIIImg from "./ascii-image.ts";
import { mapValue } from "./utils.ts";

const DENSITY = "#$?0=*c~. ";
// const FRAMES_DIR = "public/frames";

/**
 * Convert edges in an image to ASCII / text. This will apply the Sobel
 * operators to compute an approximation of the gradient in the x and y
 * directions. This detects high-frequency variations in the image which
 * is a good indicator that a given pixel is an edge. Since the results
 * are vectors, we can use the x and y components to calculate the angle
 * of the gradient to more accurately decide what character to use. Here
 * are the kernels used to convolve over the image.
 *
 * ```
 *      |-1  0  1 |
 * Gx = |-2  0  2 | * img
 *      |-1  0  1 |
 *
 *      |-1 -2 -1 |
 * Gy = | 0  0  0 | * img
 *      | 1  2  1 |
 *
 * where * denotes the 2D signal processing convolution operation.
 * ```
 *
 * @param imgInfo
 *
 * @link https://en.wikipedia.org/wiki/Kernel_(image_processing)
 * @link https://en.wikipedia.org/wiki/Convolution
 * @link https://en.wikipedia.org/wiki/Sobel_operator
 * @link https://en.wikipedia.org/wiki/Relative_luminance
 */
async function sobelToASCII(asciiImg: ASCIIImg): Promise<ASCIIImg> {
    // apply sobel operators to detect changes in gradient
    // using the preprocessed Sharp instance (already resized and greyscaled)
    const sobelResGx = await asciiImg.preprocessedSharp
        .clone()
        .convolve({
            width: 3,
            height: 3,
            kernel: [-1, 0, 1, -2, 0, 2, -1, 0, 1],
        })
        .raw({ depth: "short" })
        .toBuffer();
    const sobelResGy = await asciiImg.preprocessedSharp
        .clone()
        .convolve({
            width: 3,
            height: 3,
            kernel: [-1, -2, -1, 0, 0, 0, 1, 2, 1],
        })
        .raw({ depth: "short" })
        .toBuffer();

    const data = {
        // put the buffers in a DataView for easy processing
        Gx: new DataView(sobelResGx.buffer),
        Gy: new DataView(sobelResGy.buffer),
        /**
         * magnitudes are used alongside the threshold imgInfo field
         * to determine what pixels should be included in the output.
         */
        magnitude: {
            all: new DataView(
                new ArrayBuffer(asciiImg.mods.width * asciiImg.mods.height * 4),
            ),
            max: -Infinity,
        },
    };

    // calculate the magnitudes and find the max magnitude
    for (let i = 0; i < asciiImg.mods.height; i++) {
        for (let j = 0; j < asciiImg.mods.width; j++) {
            /**
             * this is the current index if each pixel were a single byte.
             * The real index is calculate based on how many bytes are read
             * from a given data buffer to construct the data.
             */
            const index = i * asciiImg.mods.width + j;

            // magnitude = √(Gx² + Gy²)
            const curMagnitude = Math.sqrt(
                // read 2 bytes at a time in little-endian byte order
                data.Gx.getInt16(index * 2, true) ** 2 +
                    data.Gy.getInt16(index * 2, true) ** 2,
            );

            // find the max magnitude
            data.magnitude.max = Math.max(data.magnitude.max, curMagnitude);
            // add the calculated magnitude to the array buffer (4 byte read)
            data.magnitude.all.setFloat32(index * 4, curMagnitude, true);
        }
    }

    const threshold = data.magnitude.max * asciiImg.mods.threshold;

    // build the ASCII image
    for (let i = 0; i < asciiImg.mods.height; i++) {
        for (let j = 0; j < asciiImg.mods.width; j++) {
            /**
             * this is the current index if each pixel were a single byte.
             * The real index is calculate based on how many bytes are read
             * from a given data buffer to construct the data.
             */
            const index = i * asciiImg.mods.width + j;

            const curMagnitude = data.magnitude.all.getFloat32(
                index * 4, // read 4 bytes at a time
                true, // in little-endian byte order
            );

            // before making any calculations, make sure we want to render
            // that pixel as an edge.
            if (curMagnitude > threshold) {
                // get the angle of the gradient in the range [-π, π]
                const gradientAngle = Math.atan2(
                    // read 2 bytes at a time in little-endian byte order
                    data.Gy.getInt16(index * 2, true),
                    data.Gx.getInt16(index * 2, true),
                );

                // get the angle perpendicular to the gradient
                const edgeAngle = gradientAngle + Math.PI / 2;

                // normalize the angle to the range [0, π]
                let normalizedAngle = edgeAngle % Math.PI;
                if (normalizedAngle < 0) normalizedAngle += Math.PI;

                // convert to more human friendly degrees
                const angleDeg = Math.round((normalizedAngle * 180) / Math.PI);

                // determine what character to use based on the angle
                // NOTE: there is currently no way to find a way to detect when corners
                // are present. This might have to be done as a postprocess to check a
                // chars neighbors for blank spaces to detect a corner. This will greatly
                // improve the final border output as "/-" doesn't make a nice corner.
                asciiImg.stich(i, j, determineEdgeChar(angleDeg));
            } else {
                asciiImg.stich(i, j, " ");
            }
        }
    }
    return asciiImg;
}

function determineEdgeChar(angle: number) {
    let edgeChar: string = "";

    if ((angle >= 0 && angle <= 19) || (angle <= 180 && angle >= 161)) {
        edgeChar = "-";
    } else if (angle >= 20 && angle <= 70) {
        edgeChar = "\\";
    } else if (angle >= 71 && angle <= 109) {
        edgeChar = "|";
    } else if (angle >= 110 && angle <= 160) {
        edgeChar = "/";
    } else {
        edgeChar = " ";
    }

    return edgeChar;
}

async function luminanceToASCII(asciiImg: ASCIIImg): Promise<ASCIIImg> {
    for (let row = 0; row < asciiImg.mods.height; row++) {
        for (let col = 0; col < asciiImg.mods.width; col++) {
            // get each pixel in order from left to right, top to bottom
            const pixel = row * asciiImg.mods.width + col;

            // map the luminance to a character density index
            const charIndex = Math.round(
                mapValue(asciiImg.buffer[pixel], 0, 255, 0, DENSITY.length - 1),
            );

            // add a character (pixel) to the row
            asciiImg.stich(row, col, DENSITY[charIndex]);
        }
    }
    return asciiImg;
}

// load all the files
// const frameFiles = await fs
//     .readdir(FRAMES_DIR)
//     .then((res) => res.sort())
//     .catch((err) => {
//         throw new Error(err);
//     });

// process each frame file
const asciiFrames: string[][] = [];
// for (let i = 0; i < frameFiles.length; i++) {
//     const buffer = await fs.readFile(path.resolve(FRAMES_DIR, frameFiles[i]));

//     const asciiImg = await ASCIIImg.init(buffer);

//     await sobelToASCII(asciiImg);
//     await luminanceToASCII(asciiImg);

//     // create an array to store each frame
//     asciiFrames[i] = asciiImg.text;
// }

const buffer = await fs.readFile(path.resolve("./assets/joystick.png"));

const asciiImg = await ASCIIImg.init(buffer);
await sobelToASCII(asciiImg);
await luminanceToASCII(asciiImg);
asciiFrames[0] = asciiImg.text;

// all files have been processed so write to an output file
fs.writeFile("frames.json", JSON.stringify(asciiFrames));
