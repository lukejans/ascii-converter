import fs from "node:fs";
import path from "node:path";
import config from "../config.ts";

import { InvalidArgumentError } from "commander";
import { isErrnoException } from "../utils/guards.ts";

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

    // only accept the input if it resolves to a file and then
    // just return the path that was passed to the program.
    if (fileInfo.isFile()) {
        // make sure the file is a compatible extension
        const fileExt = path.extname(inputPath).replace(".", "").toLowerCase();

        if (config.ext.photo.has(fileExt) || config.ext.video.has(fileExt)) {
            return inputPath;
        }
    }

    // the value was not a valid file type so throw a cli error
    throw new InvalidArgumentError(
        "Invalid input type... Accepted types are [png, jpeg, avif, webp, mp4, mov]",
    );
}

export function parseThresholdOpt(inputThreshold: string): number {
    const parsedValue = Number.parseFloat(inputThreshold);

    if (Number.isNaN(parsedValue)) {
        throw new InvalidArgumentError("Not a number");
    } else if (parsedValue > 1 || parsedValue < 0) {
        throw new InvalidArgumentError("Number must be in range [0.0, 1.0]");
    }

    return parsedValue;
}
