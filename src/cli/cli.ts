import { Command } from "@commander-js/extra-typings";
import { nanoid } from "nanoid";
import fs from "node:fs";
import path from "node:path";
import config from "../config.ts";
import * as parsers from "./parsers.ts";
import { runCmd } from "./validation.ts";

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
    .option(
        "-o, --output <path>",
        "the json file to use as output",
        `ascii_${nanoid(10)}.json`,
    )
    .option(
        "-s, --space <string>",
        "what to replace space characters with",
        " ",
    )
    .option(
        "-p, --pixels <string>",
        "the characters to use as pixels",
        "#$?0=*c~. ",
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
    .option("-P, --preview", "preview the result in stdout")
    .option("-f, --force", "overwrite existing destination files")
    .option("-d, --debug", "enable debug mode to see extra logging")
    .action((options) => {
        // resolve output path for better portability
        options.output = path.resolve(options.output);

        // if the output file already exists get it's information
        const outputFileStats = fs.existsSync(options.output)
            ? fs.statSync(options.output)
            : undefined;

        // since the path exists check if its a file or directory and
        // make sure no files or directories are overwritten unless
        // the [-f] option is also present.
        if (outputFileStats?.isFile()) {
            // error out if the force option isn't present
            if (!options.force) {
                program.error(
                    "error: output file already exists. Use the [-f] option to overwrite the existing file.",
                );
            }
        } else if (outputFileStats?.isDirectory()) {
            program.error(
                "error: output file name collides with an existing directory.",
            );
        }

        // make sure the destination directory exists before writing to it
        const destDir = path.dirname(options.output);
        fs.mkdirSync(destDir, { recursive: true }); // `$ mkdir -p`

        // check if the input file type is in a video or photo format. Then
        // run the program on that file. Note that we already the file has
        // a valid ext so we can get away with only checking if its one or
        // the other here.
        if (
            config.ext.video.has(
                path.extname(options.input).replace(".", "").toLowerCase(),
            )
        ) {
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
                //      so this is here only so ffprobe can be used without ts
                //      complaining.
                process.exit(1);
            }

            // calculate the number of digits needed to represent the frames
            const frameDigitLen = Math.ceil(
                Math.log10(Number(ffprobeRes.stdout)),
            );

            // split the video into frames
            const ffmpegRes = runCmd(
                "ffmpeg",
                `-loglevel quiet \
                    -i ${options.input} \
                    ${path.join(config.tmpDir, `frame_%0${frameDigitLen}d.png`)}`,
            );

            if (ffmpegRes.code === "ERROR") {
                program.error(
                    `error: could not split the video into frames with '${ffmpegRes.cmd}'
                        \n${ffmpegRes.stderr}`,
                );
            }

            config.frames.source.push(...fs.readdirSync(config.tmpDir).sort());

            // make sure all paths are resolved for portability
            for (let i = 0; i < config.frames.source.length; i++) {
                config.frames.source[i] = path.resolve(
                    config.tmpDir,
                    config.frames.source[i],
                );
            }
        } else {
            config.frames.source.push(options.input);
        }
    })
    .parse();
