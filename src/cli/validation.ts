import { CommanderError } from "commander";
import { execSync } from "node:child_process";
import { isExecException } from "../utils/guards.ts";

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
                101,
                "UNKNOWN_ERROR",
                "An unknown error occurred",
            );
        }
    }
}
