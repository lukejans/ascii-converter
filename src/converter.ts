import sharp from "sharp";
import type { ImgModifications } from "./types/image.types.ts";
import { mapValue } from "./utils.ts";

export default class AsciiImg {
    /**
     * This sharp instance is a resized, grey-scaled, normalized, and
     * flattened image that all other pipelines will branch off of for
     * text conversion.
     */
    pipeline: sharp.Sharp;

    /**
     * These modifications control resizing and threshold effects. Its
     * recommended to have a ~2:1 (w:h) aspect ratio as text is taller
     * than wide. The threshold controls what pixels to render as text.
     */
    mods: ImgModifications;

    /**
     * The result of converting the image to ascii.
     */
    #text: string[];

    #pixels: string;

    constructor(img: Buffer, imgMods: ImgModifications, pixels: string) {
        this.mods = imgMods;
        this.#pixels = pixels;

        // these preprocessing steps help ensure the image is ready to
        // go through all processing steps by removing alpha channels,
        // converting to a luminance only image, then normalizing.
        this.pipeline =
            imgMods.width <= 0 || imgMods.height <= 0
                ? sharp(img)
                : sharp(img)
                      .resize({
                          width: this.mods.width,
                          height: this.mods.height,
                          fit: "fill",
                      })
                      /**
                       * BUG: when processing images with flatten and normalise the
                       *      image have quite a mangled output such as not rendering
                       *      much of the edges as well as rendering too much in other
                       *      areas... Do more research into the effects of these
                       *      operations and how other operations can be used to improve
                       *      the output.
                       */
                      // .flatten()
                      // .grayscale()
                      // .normalise()
                      .greyscale();

        // create an array of empty string for each row of pixels that
        // will be converted into characters.
        this.#text = Array(this.mods.height).fill("");
    }

    /**
     * Convert edges in an image to text. This will apply the Sobel operators
     * to compute an approximation of the gradient in the x and y directions.
     * Since the results are vectors, we can use the x and y components to
     * calculate the direction perpendicular to the gradient to choose the
     * most accurate EDGE_CHARS.
     *
     * ```
     *      |-1  0  1 |
     * Gx = |-2  0  2 | * img
     *      |-1  0  1 |
     *
     *      |-1 -2 -1 |
     * Gy = | 0  0  0 | * img
     *      | 1  2  1 |
     * ```
     *
     * @param imgInfo
     *
     * @link https://en.wikipedia.org/wiki/Kernel_(image_processing)
     * @link https://en.wikipedia.org/wiki/Sobel_operator
     */
    async edgeToAscii() {
        // apply the sobel operators to the image via convolution
        // and return the result in raw format with the depth of
        // short to preserve signed values outside the range 0-255.
        const gx = await this.pipeline
            .clone()
            .convolve({
                width: 3,
                height: 3,
                kernel: [-1, 0, 1, -2, 0, 2, -1, 0, 1],
            })
            .raw({ depth: "short" })
            .toBuffer();

        const gy = await this.pipeline
            .clone()
            .convolve({
                width: 3,
                height: 3,
                kernel: [-1, -2, -1, 0, 0, 0, 1, 2, 1],
            })
            .raw({ depth: "short" })
            .toBuffer();

        const data = {
            Gx: new DataView(gx.buffer),
            Gy: new DataView(gy.buffer),

            /**
             * magnitudes are used alongside the threshold to determine
             * what pixels should be included in the output.
             */
            magnitude: {
                all: new DataView(
                    new ArrayBuffer(this.mods.width * this.mods.height * 4),
                ),
                max: -Infinity,
            },
        };

        // calculate the magnitudes and find the max magnitude
        for (let row = 0; row < this.mods.height; row++) {
            for (let col = 0; col < this.mods.width; col++) {
                // this is the current index if each pixel were a single byte.
                const index = row * this.mods.width + col;

                // magnitude = √(Gx² + Gy²)
                const curMagnitude = Math.sqrt(
                    // read 2 bytes at a time in little-endian byte order
                    data.Gx.getInt16(index * 2, true) ** 2 +
                        data.Gy.getInt16(index * 2, true) ** 2,
                );

                // find the max magnitude
                data.magnitude.max = Math.max(data.magnitude.max, curMagnitude);
                // add the calculated magnitude (4 byte write in little endian)
                data.magnitude.all.setFloat32(index * 4, curMagnitude, true);
            }
        }

        // calculate the threshold based on the max magnitude
        const threshold = data.magnitude.max * this.mods.threshold;

        // build the ASCII image
        for (let row = 0; row < this.mods.height; row++) {
            for (let col = 0; col < this.mods.width; col++) {
                // this is the current index if each pixel were a single byte.
                const index = row * this.mods.width + col;

                const curMagnitude = data.magnitude.all.getFloat32(
                    index * 4, // read 4 bytes at a time
                    true, // in little-endian byte order
                );

                // before making any calculations, make sure we want to render
                // that pixel as an edge.
                if (curMagnitude > threshold) {
                    // get the angle of the gradient in the range [-π, π]
                    const gradientAngleRad = Math.atan2(
                        // read 2 bytes at a time in little-endian byte order
                        data.Gy.getInt16(index * 2, true),
                        data.Gx.getInt16(index * 2, true),
                    );

                    // convert the angle to degrees [-180º, 180º]
                    const gradientAngleDeg = Math.round(
                        (gradientAngleRad * 180) / Math.PI,
                    );

                    // the edge is the angle perpendicular to the gradient
                    let edgeAngleDeg = gradientAngleDeg + 90;

                    // normalize the angle to the range [0º, 180º]
                    edgeAngleDeg %= 180;
                    if (edgeAngleDeg < 0) edgeAngleDeg += 180;

                    // determine what character to use based on the angle
                    this.stitchText(row, col, this.edgeToChar(edgeAngleDeg));
                } else {
                    this.stitchText(row, col, " ");
                }
            }
        }
        return this;
    }

    /**
     * @link https://en.wikipedia.org/wiki/Relative_luminance
     */
    async lumaToAscii() {
        const buffer = await this.pipeline.clone().raw().toBuffer();

        for (let row = 0; row < this.mods.height; row++) {
            for (let col = 0; col < this.mods.width; col++) {
                // get each pixel in order from left to right, top to bottom
                const pixel = row * this.mods.width + col;

                // add a character (pixel) to the row
                this.stitchText(row, col, this.lumaToChar(buffer[pixel]));
            }
        }
        return this;
    }

    async diffOfGaussians() {
        const buffer = await this.pipeline.clone().raw().toBuffer();

        const diff = await sharp(buffer)
            .normalise()
            .blur(1)
            .greyscale()
            .composite([
                {
                    input: await sharp(buffer)
                        .normalise()
                        .blur(2)
                        .greyscale()
                        .toBuffer(),
                    blend: "difference",
                },
            ])
            .toBuffer();

        const res = await sharp(diff)
            .threshold(1)
            .removeAlpha()
            .toBuffer({ resolveWithObject: true });

        return res;
    }

    /**
     * Add a character to the text array at a given pixel index. This
     * will only add a character representation of a pixel at that
     * location if there isn't already a character there or if the
     * character is a space.
     *
     * @param pixelRow - the row where char will be placed
     * @param pixelCol - the location in the row
     * @param char - the character to place at the pixel location
     */
    stitchText(pixelRow: number, pixelCol: number, char: string) {
        const target = this.#text[pixelRow][pixelCol];

        if (target === " ") {
            // a space character was found so stitch the character
            this.#text[pixelRow] =
                this.#text[pixelRow].slice(0, pixelCol) +
                char +
                this.#text[pixelRow].slice(pixelCol + 1);
        } else if (target === undefined) {
            // there was no text created yet so we can simply add
            // the character to a row.
            this.#text[pixelRow] += char;
        }
    }

    private lumaToChar(luminance: number) {
        // the characters being used to represent the luma in an image
        // which is a practical measurement of a pixels brightness. This
        // charset is listed from darkest to brightest which is currently
        // being represented as most to least dense.

        // map the luma to a character
        const index = Math.floor(
            mapValue(luminance, 0, 255, 0, this.#pixels.length - 1),
        );

        return this.#pixels[index];
    }

    private edgeToChar(angle: number) {
        let edgeChar: string = "";

        if ((angle >= 0 && angle <= 19) || (angle <= 180 && angle >= 161)) {
            // 38º of range
            edgeChar = "-";
        } else if (angle >= 20 && angle <= 70) {
            // 50º of range
            edgeChar = "\\";
        } else if (angle >= 71 && angle <= 109) {
            // 38º of range
            edgeChar = "|";
        } else if (angle >= 110 && angle <= 160) {
            // 50º of range
            edgeChar = "/";
        } else {
            // TODO: this currently will never trigger but in the future
            //       try to find a method to detect corner chars. But this
            //       might only be possible in low detail images such as
            //       clip art.
            edgeChar = "+";
        }

        return edgeChar;
    }

    get text(): string[] {
        return this.#text;
    }
}
