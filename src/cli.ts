import fs from "node:fs";
import path from "node:path";

import {
    Command,
    CommanderError,
    createOption,
    InvalidArgumentError,
} from "commander";
import { nanoid } from "nanoid";
import { execSync } from "node:child_process";
import { hrtime } from "node:process";
import { isErrnoException, isExecException } from "./types/guards.ts";

/* Supported Extensions */

const extensions = {
    photo: new Set(["png", "jpg", "jpeg", "avif"]),
    video: new Set(["mp4", "mov"]),

    /**
     * validates the extension type (photo or video) and if the
     * extension is neither it returns false.
     *
     * @param extension - the extension to validate
     * @returns the extension category (photo or video) if true
     */
    validate(extension: string): "photo" | "video" | false {
        if (this.photo.has(extension)) return "photo";
        if (this.video.has(extension)) return "video";
        return false;
    },
};

/* # CLI Options */

/**
 * The path to an image or video that is in a compatible format. The
 * currently supported formats are as follows:
 *
 * photo: {@linkcode extensions.photo}
 * video: {@linkcode extensions.video}
 *
 * @example
 * ```sh
 * $ ascii -i ./input.mp4 [options]
 * ```
 */
const inputOpt = createOption(
    "-i, --input <path>",
    "the path to an image or video [png, jpeg, mp4, mov]",
)
    .argParser(parseInputOpt)
    .makeOptionMandatory();

/**
 * The path to create the JSON file at with the generate ASCII data.
 * If this option is not specified on the command line then a unique
 * file will be created with {@link https://github.com/ai/nanoid nanoid}.
 *
 * @example
 * ```sh
 * $ ascii -i ./input.mp4 -o ./output.json [options]
 * ```
 */
const outputOpt = createOption(
    "-o, --output <path>",
    "the json file to use as output",
)
    .argParser(parseOutputOpt)
    .default(path.resolve(`ascii_${nanoid(10)}.json`), "ascii_uuid.json");

/**
 * The character or escape sequence to use in the ASCII output strings
 * as a replacement for a space character. This is useful for scenarios
 * when your target is something like html where you would need to use
 * `&nbsp;` instead of a space character.
 *
 * @example
 * ```sh
 * $ ascii -i ./input.mp4 -s "&nbsp;" [options]
 * ```
 */
const spaceCharOpt = createOption(
    "-s, --space-char <string>",
    "what to replace space characters with (escape sequences)",
).default(" ");

/**
 * The string of characters that should be used as the "pixels" in the
 * ASCII output. These are used based on the luminance of a character
 * where the characters on the left will replace darker pixels.
 *
 * @example
 * ```sh
 * $ ascii -i ./input.mp4 -p "#$?0=x*~. " [options]
 * ```
 */
const pixelOpt = createOption(
    "-p, --pixels <string>",
    "the characters to use as pixels",
).default("#$?0=x*~. ");

/**
 * The threshold will control how dark a pixel must be for it to be
 * render as something other than a space in the output. This should
 * be a floating point value between 0 and 1 (inclusive) which represents
 * a threshold percentage.
 *
 * @example
 * ```sh
 * $ ascii -i ./input.mp4 -t 0.75 [options]
 * ```
 */
const thresholdOpt = createOption(
    "-t, --threshold <float>",
    "luminance threshold to which a char should be rendered [0, 1]",
)
    .argParser(parseThresholdOpt)
    .default(0.75);

const dimensionsOpt = createOption(
    "-d, --dimensions <WxH>",
    "width and height of the output image (default: size of input image)",
).argParser(parseDimensionsOpt);

const backgroundColorOpt = createOption(
    "-b, --background-color <color>",
    "background used when merging the alpha channel (parsed by color module)",
).default("white");

/**
 * The frame rate to set the preview to render at. This should be a
 * number between 1 and 100 (inclusive). This option only does something
 * if the preview option is also used.
 *
 * @example
 * ```sh
 * $ ascii -i ./input.mp4 -r 30 [options]
 * ```
 */
const frameRateOpt = createOption(
    "-r, --frame-rate <fps>",
    "frame rate at which the preview should be rendered",
).argParser(parseFrameRateOpt);

/**
 * Enable a preview of the ASCII result in stdout. This option implies
 * that the frame rate should be set so if no frame rate option is used,
 * the default frame rate of 30 will be used.
 *
 * @example
 * ```sh
 * $ ascii -i ./input.mp4 -P [options]
 * ```
 */
const previewOpt = createOption(
    "-P, --preview",
    "preview the ASCII result in stdout",
)
    .default(false)
    .implies({ frameRate: 30 });

/**
 * If the file specified for output already exists this flag will
 * allow the program to overwrite it instead of throwing an error.
 *
 * @example
 * ```sh
 * $ ascii -i ./input.mp4 -o ./output.json -f [options]
 * ```
 */
const forceOpt = createOption(
    "-f, --force",
    "overwrite existing destination files",
).default(false);

/**
 * @todo implement this option
 *
 * enable log output to stout for debugging.
 *
 * @example
 * ```sh
 * $ ascii -i ./input.mp4 -d [options]
 * ```
 */
const verboseOpt = createOption(
    "-v, --verbose",
    "enable extra logging",
).default(false);

/* # CLI Parse & Program Setup */

const program = new Command()
    .name("ascii")
    .usage("--input <path> [options]")
    .description("CLI to convert videos and photos to ASCII art")
    .version("0.0.0")
    .addOption(inputOpt)
    .addOption(outputOpt)
    .addOption(spaceCharOpt)
    .addOption(pixelOpt)
    .addOption(thresholdOpt)
    .addOption(frameRateOpt)
    .addOption(dimensionsOpt)
    .addOption(backgroundColorOpt)
    .addOption(previewOpt)
    .addOption(forceOpt)
    .addOption(verboseOpt)
    .parse();

const options = program.opts();

function initializeFrames() {
    validateOutputOpt(options.output, options.force);
    createFrames();
}

/* # Actions */

async function showAsciiPreview(asciiFrames: string[][][]) {
    const FRAME_DURATION = 1000 / Number(options.frameRate);

    // hide the cursor
    process.stdout.write("\x1b[?25l");

    if (asciiFrames.length === 1) {
        // display the line to stdout
        process.stdout.write(
            asciiFrames[0].map((row) => row.join("")).join("\n") + "\n",
        );
    } else {
        // enable alternate buffer to preserve the users history
        process.stdout.write("\x1B[?1049h");

        // infinite video loop
        let i = 0;
        while (global.state.live) {
            // time frame display overhead so that the delay can be
            // adjusted to ensure a more consistent frame rate.
            const start = hrtime.bigint();

            // display each frame
            _displayFrame(asciiFrames[i]);

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

function createFrames() {
    const inputExt = path.extname(options.input).replace(".", "").toLowerCase();
    if (extensions.validate(inputExt) === "video") {
        // check the duration of the video and the frame rate
        const frameCount = _runCmd(
            "ffprobe",
            `-v error \
            -count_frames \
            -select_streams v:0 \
            -show_entries stream=nb_read_frames \
            -of default=nokey=1:noprint_wrappers=1 ${options.input}`,
        );

        // calculate the number of digits needed to represent the frames
        const frameDigitLen = Math.ceil(Math.log10(Number(frameCount)));

        // split the video into frames
        _runCmd(
            "ffmpeg",
            `-loglevel quiet \
            -i ${options.input} \
            ${path.join(global.state.tmpDir, `frame_%0${frameDigitLen}d.png`)}`,
        );

        global.state.frames = fs.readdirSync(global.state.tmpDir).sort();

        // make sure all paths are resolved for portability
        for (let i = 0; i < global.state.frames.length; i++) {
            global.state.frames[i] = path.resolve(
                global.state.tmpDir,
                global.state.frames[i],
            );
        }
    } else {
        global.state.frames = [options.input];
    }
}

/* # Option Parsers */

/**
 * Parse the input path and check if the file exists, is a file,
 * and has an extension that is compatible with the program.
 *
 * @param inputPath - path argument from [-i|--input] cli option
 * @throws
 * {InvalidArgumentError} if the file does not exist, is not a file,
 * or has an invalid extension.
 * @returns the resolved input path
 */
function parseInputOpt(inputPath: string): string {
    let fileInfo: fs.Stats;
    inputPath = path.resolve(inputPath);

    // attempt to access the file information
    try {
        fileInfo = fs.statSync(inputPath);
    } catch (err) {
        if (isErrnoException(err)) {
            if (err.code === "ENOENT") {
                throw new InvalidArgumentError("No such file or directory");
            }
        }
        throw new InvalidArgumentError(
            "Unexpected issue parsing [--input] argument.",
        );
    }

    // validate the input file existence and extension
    if (fileInfo.isFile()) {
        const fileExt = path.extname(inputPath).replace(".", "").toLowerCase();

        if (extensions.validate(fileExt)) {
            return inputPath;
        }
    }

    // the value was not a valid file type so throw a cli error
    throw new InvalidArgumentError(
        `Invalid input file extension... Compatible extensions are: \n
        photo: ${[...extensions.photo]} \n
        video: ${[...extensions.video]}`,
    );
}

/**
 * Parse the threshold argument sting and return a number within
 * the allowed range.
 *
 * @param threshold - threshold argument from [-t|--threshold] cli option
 * @throws
 * {InvalidArgumentError} if the value is not a number or is outside of the range
 * [0.0, 1.0]
 * @returns a number between 0 and 1
 */
function parseThresholdOpt(threshold: string): number {
    const parsedValue = Number.parseFloat(threshold);

    if (Number.isNaN(parsedValue)) {
        throw new InvalidArgumentError("Threshold must be a number");
    } else if (parsedValue > 1 || parsedValue < 0) {
        throw new InvalidArgumentError("Number must be in range [0.0, 1.0]");
    }

    return parsedValue;
}

/**
 * Parse the dimensions argument string and return an object containing
 * the width and height values.
 *
 * @param dimensions - dimensions argument from [-d|--dimensions] cli option
 * @throws
 * {InvalidArgumentError} if the value is not a number or improperly formatted
 * @returns an object containing the width and height values
 */
function parseDimensionsOpt(dimensions: string): {
    width: number;
    height: number;
} {
    const input = dimensions.split("x");

    if (input.length > 2 || input.length < 2) {
        throw new InvalidArgumentError(
            "Size must be in format <width>x<height>",
        );
    }

    input.forEach((num) => {
        const cur = Number(num);

        if (Number.isNaN(cur) || !Number.isInteger(cur) || cur <= 0) {
            throw new InvalidArgumentError(
                "Please provide positive integers for the dimensions",
            );
        }
    });

    return {
        width: Number(input[0]),
        height: Number(input[1]),
    };
}

/**
 * Parse the frame rate argument string and return a number within
 * the allowed range.
 *
 * @param frameRate - frame rate argument from [-r|--frame-rate] cli option
 * @throws
 * {InvalidArgumentError} if the value is not a number or is outside of the
 * range [1, 100]
 * @returns a number between 1 and 100 (inclusive)
 */
function parseFrameRateOpt(frameRate: string): number {
    const fps = Number.parseInt(frameRate);

    if (Number.isNaN(fps)) {
        throw new InvalidArgumentError("Please provide a valid frame rate");
    } else if (fps <= 0) {
        throw new InvalidArgumentError("Frame rate must be greater than 0");
    } else if (fps > 100) {
        throw new InvalidArgumentError(
            "Frame rate must be less than or equal to 100 for performance reasons",
        );
    }

    return fps;
}

/**
 * Resolves the output path without validating it. Validation needs
 * to be done after all the options are parsed so we can see if the
 * [-f|--force] flag is set.
 *
 * @param outputPath - path argument from [-o|--output] cli option
 * @returns the resolved output path
 */
function parseOutputOpt(outputPath: string): string {
    return path.resolve(outputPath);
}

/* # Validators */

function validateOutputOpt(outputPath: string, force: boolean) {
    // if the output file already exists get it's information
    const outputFileStats = fs.existsSync(outputPath)
        ? fs.statSync(outputPath)
        : undefined;

    if (!outputFileStats) {
        // if the output dir does not exist create it
        const outputDir = path.dirname(outputPath);
        fs.mkdirSync(outputDir, { recursive: true }); // `$ mkdir -p`
    } else {
        // since the path exists check if its a file or directory
        // and make sure no files or directories are overwritten
        // unless the [-f] option is also present.
        if (outputFileStats.isFile()) {
            // error out if the force option isn't present
            if (!force) {
                throw new Error(
                    "error: output file already exists. Use the [-f] option to overwrite the existing file.",
                );
            }
        } else if (outputFileStats.isDirectory()) {
            throw new Error(
                "error: output file name collides with an existing directory.",
            );
        }
        // make sure the user has r/w permission
        try {
            fs.accessSync(outputPath, fs.constants.W_OK | fs.constants.R_OK);
        } catch (err) {
            throw new Error(
                "error: output file needs read and write permissions.",
            );
        }
    }
}

/* # Helpers */

/**
 * Run a command in a users shell. This should work on all
 * platforms as long as only resolved paths are being used as
 * arguments to options.
 *
 * @example
 * ```ts
 * _runCmd("mkdir", "-p ./new/dir")
 * ```
 * @param cmd - an executable command in a users PATH
 * @param opts - all options and arguments for the command
 * @throws
 * {CommanderError} if the error from running the command is
 * not an ExecException then some unknown behavior occurred.
 */
function _runCmd(cmd: string, opts: string): string | never {
    try {
        return execSync(`${cmd} ${opts}`, { encoding: "utf8" });
    } catch (err) {
        if (isExecException(err)) {
            program.error(
                `error: command '${cmd}' failed to run: ${err.stderr || err.message}`,
            );
            // BUG: Typescript should realize that commanders Command.error method
            //      has a return type of never. To fix this we need to write this
            //      extra process.exit even though it's unreachable.
            process.exit(1);
        } else {
            throw new CommanderError(
                1,
                "UNKNOWN_ERR",
                `Unknown error running ${cmd} ${opts}`,
            );
        }
    }
}

/**
 * display a single ascii frame / image. This will clear the
 * screen and write the frame to stdout using ANSI escape codes.
 *
 * @param frame - the ascii frame/image to display
 */
function _displayFrame(frame: string[][]) {
    // clear the previous frame
    process.stdout.write("\x1B[H\x1B[2J");

    const rows = frame.map((row) => row.join(""));

    // display the line to stdout
    process.stdout.write(rows.join("\n"));
}

export { initializeFrames, options, showAsciiPreview };
