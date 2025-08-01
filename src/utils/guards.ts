import type { ExecException } from "node:child_process";

export function isExecException(err: unknown): err is ExecException {
    return (
        err instanceof Error &&
        ("cmd" in err ||
            "killed" in err ||
            "code" in err ||
            "signal" in err ||
            "stdout" in err ||
            "stderr" in err)
    );
}

export function isErrnoException(err: unknown): err is NodeJS.ErrnoException {
    return (
        err instanceof Error &&
        ("errno" in err || "code" in err || "path" in err || "syscall" in err)
    );
}
