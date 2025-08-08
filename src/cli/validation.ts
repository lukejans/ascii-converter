import { CommanderError } from "commander";
import { execSync } from "node:child_process";
import fs from "node:fs";
import { isExecException } from "../utils/guards.ts";

import path from "node:path";
import type { CmdResult } from "../types/cli.types.ts";

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
                1,
                "UNKNOWN_ERR",
                `Unknown error running ${cmd} ${opts}`,
            );
        }
    }
}

export function validateOutputOpt(outputPath: string, force: boolean) {
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
