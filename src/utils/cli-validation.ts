import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { CommanderError, InvalidArgumentError } from "commander";
import { PHOTO_EXT, VIDEO_EXT } from "../config.ts";

import type { CmdResult } from "../types/cli.ts";
import { isErrnoException, isExecException } from "./guards.ts";

/**
 * Run a command in a users shell. This should work on all
 * platforms as long as only resolved paths are being used as
 * arguments to options.
 *
 * @example
 * ```ts
 * runCmd("mkdir", "-p ./new/dir")
 * ```
 * @param cmd - an executable command in a users PATH
 * @param opts - all options and arguments for the command
 * @throws
 * {CommanderError} if the error from running the command is
 * not an ExecException then some unknown behavior occurred.
 */
export function runCmd(cmd: string, opts: string): CmdResult {
    try {
        return {
            cmd: cmd,
            stdout: execSync(`${cmd} ${opts}`, { encoding: "utf8" }),
            code: "OK",
        };
    } catch (err) {
        if (isExecException(err)) {
            return {
                cmd: cmd,
                stderr: err.stderr ?? "",
                code: "ERROR",
            };
        } else {
            throw new CommanderError(
                101,
                "UNKNOWN_ERROR",
                "An unknown error occurred",
            );
        }
    }
}

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

        if (PHOTO_EXT.has(fileExt) || VIDEO_EXT.has(fileExt)) {
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
