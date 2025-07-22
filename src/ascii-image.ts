import sharp from "sharp";
import type { ImgModifications } from "./types/image.ts";

export default class ASCIIImg {
    /**
     * Preprocessed Sharp instance (resized and greyscaled) that can be
     * reused for different operations without redundant processing
     */
    preprocessedSharp: sharp.Sharp;

    /**
     * Raw grayscale pixel buffer for luminance-based operations
     */
    buffer: Buffer;

    /**
     * What modifications should be made to the image during the initial
     * preprocessing step. Its recommended to have a ~2:1 (w:h) aspect
     * ratio as text is taller than wide. Note that the threshold mod
     * will change the way that the image is processed during all runtime
     * transformations.
     */
    mods: ImgModifications;

    /**
     * The result of converting the image two ascii through various
     * transformations. Note that the order of processing is important
     * as all transformation will only overwrite blank spaces.
     */
    #text: string[];

    private constructor(
        preprocessedSharp: sharp.Sharp,
        rawBuffer: Buffer,
        modInfo: ImgModifications,
    ) {
        this.mods = modInfo;
        this.preprocessedSharp = preprocessedSharp;
        this.buffer = rawBuffer;
        this.#text = Array(this.mods.height).fill("");
    }

    static async init(imgBuffer: Buffer, modInfo?: ImgModifications) {
        const mods: ImgModifications = {
            width: modInfo?.width ?? 80,
            height: modInfo?.height ?? 40,
            threshold: modInfo?.threshold ?? 0.8,
        };

        // Create the preprocessed Sharp instance (resized and greyscaled)
        const preprocessedSharp = sharp(imgBuffer)
            .resize({
                width: mods.width,
                height: mods.height,
                fit: "fill",
            })
            .greyscale();

        // Get raw buffer for luminance operations
        const rawBuffer = await preprocessedSharp.clone().raw().toBuffer();

        return new ASCIIImg(preprocessedSharp, rawBuffer, mods);
    }

    stich(pixelRow: number, pixelCol: number, char: string): void {
        const target: string | undefined = this.#text[pixelRow][pixelCol];

        if (target === undefined) {
            this.#text[pixelRow] += char;
        } else if (target === " ") {
            this.#text[pixelRow] =
                this.#text[pixelRow].slice(0, pixelCol) +
                char +
                this.#text[pixelRow].slice(pixelCol + 1);
        }
    }

    get text(): string[] {
        return this.#text;
    }
}
