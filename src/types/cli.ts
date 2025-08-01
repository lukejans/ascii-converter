export interface ProgramOptions {
    input: string;
    output: string;
    space: string;
    pixels: string;
    threshold: number;
    preview?: boolean;
    force?: boolean;
    debug?: boolean;
}

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
