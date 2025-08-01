import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

import { program } from "commander";
import { nanoid } from "nanoid";
import AsciiImg from "./ascii-image.ts";
import { VIDEO_EXT } from "./config.ts";
import type { ProgramOptions } from "./types/cli.ts";
import {
    parseInputOpt,
    parseThresholdOpt,
    runCmd,
} from "./utils/cli-validation.ts";

const asciiFrames: string[][] = [];
let frameFiles: string[] = [];
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "frames_"));

program
    .name("to-ascii")
    .usage("--input <path> [options]")
    .description("CLI to convert videos and photos to ASCII art")
    .version("0.0.0")
    .requiredOption(
        "-i, --input <path>",
        "the path to an image or video [png, jpeg, mp4, mov]",
        parseInputOpt,
    )
    .option(
        "-o, --output <path>",
        "the json file to use as output",
        `ascii_${nanoid(10)}.json`,
    )
    .option(
        "-s, --space <string>",
        "what to replace space characters with",
        " ",
    )
    .option(
        "-p, --pixels <string>",
        "the characters to use as pixels",
        "#$?0=*c~. ",
    )
    .option(
        "-t, --threshold <float>",
        "luminance threshold to which a char should be rendered [0, 1]",
        parseThresholdOpt,
        0.7,
    )
    .option("-P, --preview", "preview the result in stdout")
    .option("-f, --force", "overwrite existing destination files")
    .option("-d, --debug", "enable debug mode to see extra logging")
    .action(executeProgram)
    .parse(process.argv);

async function executeProgram(options: ProgramOptions) {
    // resolve output path for better portability
    options.output = path.resolve(options.output);

    // if the output file already exists get it's information
    const outputFileStats = fs.existsSync(options.output)
        ? fs.statSync(options.output)
        : undefined;

    // since the path exists check if its a file or directory and
    // make sure no files or directories are overwritten unless
    // the [-f] option is also present.
    if (outputFileStats?.isFile()) {
        // error out if the force option isn't present
        if (!options.force) {
            program.error(
                "error: output file already exists. Use the [-f] option to overwrite the existing file.",
            );
        }
    } else if (outputFileStats?.isDirectory()) {
        program.error(
            "error: output file name collides with an existing directory.",
        );
    }

    // make sure the destination directory exists before writing to it
    const destDir = path.dirname(options.output);
    fs.mkdirSync(destDir, { recursive: true }); // `$ mkdir -p`

    // check if the input file type is in a video or photo format. Then
    // run the program on that file. Note that we already the file has
    // a valid ext so we can get away with only checking if its one or
    // the other here.
    if (
        VIDEO_EXT.has(
            path.extname(options.input).replace(".", "").toLowerCase(),
        )
    ) {
        // check the duration of the video and the frame rate
        const ffprobeRes = runCmd(
            "ffprobe",
            `-v error -count_frames -select_streams v:0 \
            -show_entries stream=nb_read_frames \
            -of default=nokey=1:noprint_wrappers=1 ${options.input}`,
        );

        // get the total number of frames in the video
        if (ffprobeRes.code === "ERROR") {
            program.error(
                `error: could not read video metadata with '${ffprobeRes.cmd}'
                \n${ffprobeRes.stderr}`,
            );
        }

        // calculate the number of digits needed to represent the frames
        const frameDigitLen = Math.ceil(Math.log10(Number(ffprobeRes.stdout)));

        // split the video into frames
        const ffmpegRes = runCmd(
            "ffmpeg",
            `-loglevel quiet \
            -i ${options.input} \
            ${path.join(tmpDir, `frame_%0${frameDigitLen}d.png`)}`,
        );

        if (ffmpegRes.code === "ERROR") {
            program.error(
                `error: could not split the video into frames with '${ffmpegRes.cmd}'
                \n${ffmpegRes.stderr}`,
            );
        }

        frameFiles = fs.readdirSync(tmpDir).sort();

        // make sure all paths are resolved for portability
        for (let i = 0; i < frameFiles.length; i++) {
            frameFiles[i] = path.resolve(tmpDir, frameFiles[i]);
        }
    } else {
        frameFiles = [options.input];
    }

    // ----------------
    // ascii conversion
    // ----------------

    // process each frame file
    for (let i = 0; i < frameFiles.length; i++) {
        const buffer = fs.readFileSync(frameFiles[i]);

        // create a text representation of the image
        const asciiImg = new AsciiImg(buffer);
        await asciiImg.edgeToAscii();
        await asciiImg.lumaToAscii();

        // create an array to store each frame
        asciiFrames[i] = asciiImg.text;
    }

    // all files have been processed so write to an output file
    fs.writeFileSync(options.output, JSON.stringify(asciiFrames));
    console.log(`File written successfully to ${options.output}`);
}

const gracefulExit = (function () {
    let clean = false;

    return (code: NodeJS.Signals | Error | string | number) => {
        if (!clean) {
            // perform the cleanup
            if (fs.existsSync(tmpDir)) {
                fs.rmSync(tmpDir, { recursive: true, force: true });
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
