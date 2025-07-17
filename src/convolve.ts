import fs from "node:fs/promises";
import sharp from "sharp";
/**
 * To detect edges in an image you can use kernels to convolve over
 * an image's pixels. The kernel is a matrix of weights that is applied
 * to each pixel in an image and outputs new pixels each of which is a
 * function of the nearby pixels and itself. This is typically done on
 * single channel, luminance only images. The Sobel operator can be used
 * to compute the approximate gradient in the x and y directions. It uses
 * two 3x3 kernels one to detect horizontal(x) gradient changes and one
 * for vertical(y).
 *
 * ```
 *      |-1  0  1 |
 * Gx = |-2  0  2 | * img
 *      |-1  0  1 |
 *
 *      |-1 -2 -1 |
 * Gy = | 0  0  0 | * img
 *      | 1  2  1 |
 *
 * where * denotes the 2D signal processing convolution operation.
 * ```
 *
 *
 *
 * @link https://en.wikipedia.org/wiki/Kernel_(image_processing)
 * @link https://en.wikipedia.org/wiki/Convolution
 * @link https://en.wikipedia.org/wiki/Sobel_operator
 * @link https://en.wikipedia.org/wiki/Relative_luminance
 */
const img = {
    buffer: await fs.readFile("testing/circle.png"),
    w: 80,
    h: 40,
    xKernel: [-1, 0, 1, -2, 0, 2, -1, 0, 1],
    yKernel: [-1, -2, -1, 0, 0, 0, 1, 2, 1],
};

const gx = await sharp(img.buffer)
    .resize({ width: img.w, height: img.h, fit: "fill" })
    .greyscale()
    .convolve({ width: 3, height: 3, kernel: img.xKernel })
    .raw({ depth: "short" })
    .toBuffer({ resolveWithObject: true });

const gy = await sharp(img.buffer)
    .resize({ width: img.w, height: img.h, fit: "fill" })
    .greyscale()
    .convolve({ width: 3, height: 3, kernel: img.yKernel })
    .raw({ depth: "short" })
    .toBuffer({ resolveWithObject: true });

const gxData = new DataView(gx.data.buffer);
const gyData = new DataView(gy.data.buffer);

const THRESHOLD = 950;
let asciiImg = "";

for (let i = 0; i < img.h; i++) {
    for (let j = 0; j < img.w; j++) {
        /**
         * magnitude = √(horizontalGradient² + verticalGradient²)
         */
        const magnitude = Math.sqrt(
            gxData.getInt16((i * img.w + j) * 2, true) ** 2 +
                gyData.getInt16((i * img.w + j) * 2, true) ** 2,
        );
        if (magnitude > THRESHOLD) {
            /**
             * get the angle of the gradient in the range [-π, π].
             * @link https://en.wikipedia.org/wiki/Atan2
             */
            const gradientAngle = Math.atan2(
                gyData.getInt16((i * img.w + j) * 2, true),
                gxData.getInt16((i * img.w + j) * 2, true),
            );

            // add half a radian to get the perpendicular angle to the
            // gradient which will be the angle of the edge.
            const edgeAngle = gradientAngle + Math.PI / 2;

            // we don't actually care about the direction because the
            // character would be the same for -π/2 and π/2 so we can
            // normalize the angle to the range [0, π]
            let normalizedAngle = edgeAngle % Math.PI;
            if (normalizedAngle < 0) normalizedAngle += Math.PI;

            // Convert to degrees for easier understanding
            const angleDeg = Math.round((normalizedAngle * 180) / Math.PI);
            if (isHorizontal(angleDeg)) {
                asciiImg += "-";
            } else if (isRightDiagonal(angleDeg)) {
                asciiImg += "\\";
            } else if (isVertical(angleDeg)) {
                asciiImg += "|";
            } else if (isLeftDiagonal(angleDeg)) {
                asciiImg += "/";
            }
        } else if (magnitude < THRESHOLD && magnitude > THRESHOLD * 0.9) {
            asciiImg += ".";
        } else {
            asciiImg += " ";
        }
    }
    asciiImg += "\n";
}
console.log(asciiImg);

function isHorizontal(angle: number): boolean {
    return (angle >= 0 && angle <= 19) || (angle <= 180 && angle >= 161);
}

function isVertical(angle: number): boolean {
    return angle >= 80 && angle <= 99;
}

function isRightDiagonal(angle: number): boolean {
    return angle >= 20 && angle <= 79;
}

function isLeftDiagonal(angle: number): boolean {
    return angle >= 100 && angle <= 160;
}
