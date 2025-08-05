import { nanoid } from "nanoid";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const frameFiles: string[] = [];

const config = {
    ext: {
        photo: new Set(["png", "jpg", "avif"]),
        video: new Set(["mp4", "mov"]),
    },
    chars: {
        luma: "#$?0=*c~. ",
    },
    threshold: {
        luma: 0.7,
    },
    tmpDir: fs.mkdtempSync(path.join(os.tmpdir(), "frames_")),
    asciiResult: path.resolve(`ascii_${nanoid(10)}.json`),
    frames: {
        rate: 45,
        source: frameFiles,
    },
};

export default config;
