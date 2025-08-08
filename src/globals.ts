import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const frameFiles: string[] = [];
const frameAscii: string[][] = [];
const TMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "frames_"));

/**
 * Global state
 * @todo use the node global object or refactor
 */
export const state = {
    /**
     * Temporary directory for storing the frames that are
     * produced by ffmpeg splitting a video. This always uses
     * the operating system's recommended temporary directory.
     */
    tmpDir: TMP_DIR,
    /**
     * Paths to image(s) that will be processed.
     */
    frames: frameFiles,
    /**
     * Ascii result from the ascii converter. This can either be
     * a single frame if only a photo was processed or multiple
     * frames if the input was a video.
     */
    asciiResult: frameAscii,

    live: true,
};
