import fs from "node:fs";
import os from "node:os";
import path from "node:path";

global.state = {
    /**
     * Temporary directory for storing the frames that are
     * produced by ffmpeg splitting a video. This always uses
     * the operating system's recommended temporary directory.
     */
    tmpDir: fs.mkdtempSync(path.join(os.tmpdir(), "frames_")),
    /**
     * Paths to image(s) that will be processed.
     */
    frames: [],
    /**
     * Ascii result from the ascii converter. This can either be
     * a single frame if only a photo was processed or multiple
     * frames if the input was a video.
     */
    asciiResult: [],

    live: true,
};
