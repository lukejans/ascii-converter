export type CommandOptions = typeof import("../cli/cli.ts").options;

export interface ValidCmdResult {
    code: "OK";
    cmd: string;
    stdout: string;
}

export interface InvalidCmdResult {
    code: "ERROR";
    cmd: string;
    stderr: string;
}

export type CmdResult = ValidCmdResult | InvalidCmdResult;
