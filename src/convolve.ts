import sharp from "sharp";
import type { ImageInfo } from "./main.ts";

/**
 * Sobel operator kernels for edge detection
 *
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
 * @link https://en.wikipedia.org/wiki/Kernel_(image_processing)
 * @link https://en.wikipedia.org/wiki/Convolution
 * @link https://en.wikipedia.org/wiki/Sobel_operator
 * @link https://en.wikipedia.org/wiki/Relative_luminance
 */
const SOBEL_KERNELS = {
    x: [-1, 0, 1, -2, 0, 2, -1, 0, 1],
    y: [-1, -2, -1, 0, 0, 0, 1, 2, 1],
};

// angle detection helper functions
function isHorizontal(angle: number): boolean {
    return (angle >= 0 && angle <= 19) || (angle <= 180 && angle >= 161);
}
function isVertical(angle: number): boolean {
    return angle >= 71 && angle <= 109;
}
function isRightDiagonal(angle: number): boolean {
    return angle >= 20 && angle <= 70;
}
function isLeftDiagonal(angle: number): boolean {
    return angle >= 110 && angle <= 160;
}

/**
 * Convert an image to ASCII / text. This will apply the Sobel operators
 * to an image then calculate the angle of the gradient to determine what
 * edge character to use.
 *
 * @param imgInfo
 * @returns
 */
async function convertImageToASCII(imgInfo: ImageInfo): Promise<string[]> {
    // apply sobel operators to detect changes in gradient
    const sobelResGx = await sharp(imgInfo.buffer)
        .resize({ width: imgInfo.w, height: imgInfo.h, fit: "fill" })
        .greyscale()
        .convolve({ width: 3, height: 3, kernel: SOBEL_KERNELS.x })
        .raw({ depth: "short" })
        .toBuffer({ resolveWithObject: true });
    const sobelResGy = await sharp(imgInfo.buffer)
        .resize({ width: imgInfo.w, height: imgInfo.h, fit: "fill" })
        .greyscale()
        .convolve({ width: 3, height: 3, kernel: SOBEL_KERNELS.y })
        .raw({ depth: "short" })
        .toBuffer({ resolveWithObject: true });

    const data = {
        // put the buffers in a DataView for easy processing
        Gx: new DataView(sobelResGx.data.buffer),
        Gy: new DataView(sobelResGy.data.buffer),
        /**
         * magnitudes are used alongside the threshold imgInfo field
         * to determine what pixels should be included in the output.
         */
        magnitude: {
            all: new DataView(new ArrayBuffer(imgInfo.w * imgInfo.h * 4)),
            max: -Infinity,
        },
    };

    // calculate the magnitudes and find the max magnitude
    for (let i = 0; i < imgInfo.h; i++) {
        for (let j = 0; j < imgInfo.w; j++) {
            /**
             * this is the current index if each pixel were a single byte.
             * The real index is calculate based on how many bytes are read
             * from a given data buffer to construct the data.
             */
            const index = i * imgInfo.w + j;

            // magnitude = √(Gx² + Gy²)
            const curMagnitude = Math.sqrt(
                // read 2 bytes at a time in little-endian byte order
                data.Gx.getInt16(index * 2, true) ** 2 +
                    data.Gy.getInt16(index * 2, true) ** 2,
            );

            // find the max magnitude
            data.magnitude.max = Math.max(data.magnitude.max, curMagnitude);
            // add the calculated magnitude to the array buffer (4 byte read)
            data.magnitude.all.setFloat32(index * 4, curMagnitude, true);
        }
    }

    // where the ASCII image will be stored
    const asciiImg: string[] = Array(imgInfo.h).fill("");
    const threshold = data.magnitude.max * imgInfo.threshold;

    // build the ASCII image
    for (let i = 0; i < imgInfo.h; i++) {
        for (let j = 0; j < imgInfo.w; j++) {
            /**
             * this is the current index if each pixel were a single byte.
             * The real index is calculate based on how many bytes are read
             * from a given data buffer to construct the data.
             */
            const index = i * imgInfo.w + j;

            const curMagnitude = data.magnitude.all.getFloat32(
                index * 4, // read 4 bytes at a time
                true, // in little-endian byte order
            );

            // before making any calculations, make sure we want to render
            // that pixel as an edge.
            if (curMagnitude > threshold) {
                // get the angle of the gradient in the range [-π, π]
                const gradientAngle = Math.atan2(
                    // read 2 bytes at a time in little-endian byte order
                    data.Gy.getInt16(index * 2, true),
                    data.Gx.getInt16(index * 2, true),
                );

                // get the angle perpendicular to the gradient
                const edgeAngle = gradientAngle + Math.PI / 2;

                // normalize the angle to the range [0, π]
                let normalizedAngle = edgeAngle % Math.PI;
                if (normalizedAngle < 0) normalizedAngle += Math.PI;

                // convert to more human friendly degrees
                const angleDeg = Math.round((normalizedAngle * 180) / Math.PI);

                // determine what character to use based on the angle
                // NOTE: there is currently no way to find a way to detect when corners
                // are present. This might have to be done as a postprocess to check a
                // chars neighbors for blank spaces to detect a corner. This will greatly
                // improve the final border output as "/-" doesn't make a nice corner.
                if (isHorizontal(angleDeg)) asciiImg[i] += "-";
                else if (isRightDiagonal(angleDeg)) asciiImg[i] += "\\";
                else if (isVertical(angleDeg)) asciiImg[i] += "|";
                else if (isLeftDiagonal(angleDeg)) asciiImg[i] += "/";
                else asciiImg[i] += " ";
            } else {
                asciiImg[i] += " ";
            }
        }
    }
    return asciiImg;
}

export { convertImageToASCII };
