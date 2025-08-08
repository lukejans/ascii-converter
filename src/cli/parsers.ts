import fs from "node:fs";
import path from "node:path";

import { InvalidArgumentError } from "commander";
import { isErrnoException } from "../utils/guards.ts";
import { extensions } from "../utils/support.ts";

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
export function parseInputOpt(inputPath: string): string {
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
 * @param inputThreshold - threshold argument from [-t|--threshold] cli option
 * @throws
 * {InvalidArgumentError} if the value is not a number or is outside of the range
 * [0.0, 1.0]
 * @returns a number between 0 and 1
 */
export function parseThresholdOpt(inputThreshold: string): number {
    const parsedValue = Number.parseFloat(inputThreshold);

    if (Number.isNaN(parsedValue)) {
        throw new InvalidArgumentError("Threshold must be a number");
    } else if (parsedValue > 1 || parsedValue < 0) {
        throw new InvalidArgumentError("Number must be in range [0.0, 1.0]");
    }

    return parsedValue;
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
export function parseFrameRateOpt(frameRate: string): number {
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
export function parseOutputOpt(outputPath: string): string {
    return path.resolve(outputPath);
}
