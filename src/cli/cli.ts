import fs from "node:fs";
import path from "node:path";
import * as parsers from "./parsers.ts";

import { Command, Option } from "commander";
import { nanoid } from "nanoid";
import { extensions } from "../utils/support.ts";
import { runCmd, validateOutputOpt } from "./validation.ts";

const program = new Command()
    .name("to-ascii")
    .usage("--input <path> [options]")
    .description("CLI to convert videos and photos to ASCII art")
    .version("0.0.0")
    .requiredOption(
        "-i, --input <path>",
        "the path to an image or video [png, jpeg, mp4, mov]",
        parsers.parseInputOpt,
    )
    .addOption(
        new Option("-o, --output <path>", "the json file to use as output")
            .argParser(parsers.parseOutputOpt)
            .default(
                path.resolve(`ascii_${nanoid(10)}.json`),
                "ascii_uuid.json",
            ),
    )
    .option(
        "-s, --space-char <string>",
        "what to replace space characters with (escape sequences)",
        " ",
    )
    .option(
        "-p, --pixels <string>",
        "the characters to use as pixels",
        "#$?0=x*~. ",
    )
    .option(
        "-t, --threshold <float>",
        "luminance threshold to which a char should be rendered [0, 1]",
        parsers.parseThresholdOpt,
        0.75,
    )
    .option(
        "-r, --frame-rate <fps>",
        "frame rate at which the preview should be rendered",
        parsers.parseFrameRateOpt,
    )
    .addOption(
        new Option("-P, --preview", "preview the result in stdout")
            .implies({ frameRate: 30 })
            .default(false),
    )
    .option("-f, --force", "overwrite existing destination files", false)
    .option("-d, --debug", "enable debug mode to see extra logging", false)
    .parse();

export const options = program.opts();

// === post-parse validation ===

validateOutputOpt(options.output, options.force);

// === frame creation ===

const inputExt = path.extname(options.input).replace(".", "").toLowerCase();
if (extensions.validate(inputExt) === "video") {
    // check the duration of the video and the frame rate
    const ffprobeRes = runCmd(
        "ffprobe",
        `-v error -count_frames -select_streams v:0 \
                -show_entries stream=nb_read_frames \
                -of default=nokey=1:noprint_wrappers=1 ${options.input}`,
    );

    // get the total number of frames in the video
    if (ffprobeRes.code === "ERROR") {
        program.error(
            `error: could not read video metadata with '${ffprobeRes.cmd}'
                    \n${ffprobeRes.stderr}`,
        );
        // BUG: typescript doesn't realize program.error never returns
        //      so this is here for typescript to realize all code beyond
        //      this point is unreachable.
        process.exit(1);
    }

    // calculate the number of digits needed to represent the frames
    const frameDigitLen = Math.ceil(Math.log10(Number(ffprobeRes.stdout)));

    // split the video into frames
    const ffmpegRes = runCmd(
        "ffmpeg",
        `-loglevel quiet \
                -i ${options.input} \
                ${path.join(global.state.tmpDir, `frame_%0${frameDigitLen}d.png`)}`,
    );

    if (ffmpegRes.code === "ERROR") {
        program.error(
            `error: could not split the video into frames with '${ffmpegRes.cmd}'
                    \n${ffmpegRes.stderr}`,
        );
        // BUG: typescript doesn't realize program.error never returns
        //      so this is here for typescript to realize all code beyond
        //      this point is unreachable.
        process.exit(1);
    }

    global.state.frames.push(...fs.readdirSync(global.state.tmpDir).sort());

    // make sure all paths are resolved for portability
    for (let i = 0; i < global.state.frames.length; i++) {
        global.state.frames[i] = path.resolve(
            global.state.tmpDir,
            global.state.frames[i],
        );
    }
} else {
    global.state.frames.push(options.input);
}
