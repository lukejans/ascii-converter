import sharp from "sharp";
import { mapValue } from "./utils.ts";

const DENSITY = "@#$%&*+=~-;:,.`";

// extract raw, unsigned 8-bit RGBA pixel data from png
const testImg = await sharp("public/test.png")
    .raw()
    .toBuffer({ resolveWithObject: true });

// string to store the image in ascii format
let asciiImageStr = "";
// start at the top row and then check each column in the row so
// the asciiImageStr is built top to bottom, left to right.
for (let row = 0; row < testImg.info.height; row++) {
    for (let col = 0; col < testImg.info.width; col++) {
        // formula to find the first channels value for a pixel.
        let pixelIndex = (row * testImg.info.width + col) * 4;
        // the channels are red, green, blue, and alpha
        let r: number = testImg.data[pixelIndex];
        let g: number = testImg.data[pixelIndex + 1];
        let b: number = testImg.data[pixelIndex + 2];
        let a: number = testImg.data[pixelIndex + 3];

        if (a === 0) {
            asciiImageStr += " ";
        } else {
            // calculate the brightness of a pixel
            let avgBrightness = (r + b + g) / 3;
            // map the brightness to a character density index
            let charIndex = mapValue(
                avgBrightness,
                0,
                255,
                0,
                DENSITY.length - 1,
            );
            // add a character (pixel) to the row
            asciiImageStr += DENSITY.charAt(charIndex);
        }
    }
}

// // frame file naming convention "frame_0001.txt" where
// // the first frame is 0001
// const framesDir = "./frames";

// fs.readdir(framesDir, { encoding: "utf-8" }, (err, frameFiles) => {
//     // stop on any errors
//     if (err) {
//         console.error(err);
//         return;
//     }

//     // make sure the array of frame files is in order
//     frameFiles.sort();

//     // create an array to store each frame
//     const frameLines = [];

//     // count how many frames have been processed so we can
//     // create the file on the last readline file close.
//     let frameFilesProcessed = 0;

//     for (let i = 0; i < frameFiles.length; i++) {
//         // store the lines of a frame in an array
//         frameLines[i] = [];

//         // create a stream to read each line of a file
//         const rl = readline.createInterface({
//             input: fs.createReadStream(path.join(framesDir, frameFiles[i])),
//             crlfDelay: Infinity,
//         });

//         // read each line
//         rl.on("line", (line) => {
//             frameLines[i].push(line);
//         });

//         rl.on("close", () => {
//             frameFilesProcessed++;
//             // check if all the files have been processed
//             if (frameFilesProcessed === frameFiles.length) {
//                 let frameData = JSON.stringify(frameLines);
//                 // all files have been processed so write to an output file
//                 fs.writeFile("frames.json", frameData, (err) => {
//                     if (err) throw err;
//                     console.log("The file has been saved!");
//                 });
//             }
//         });
//     }
// });
