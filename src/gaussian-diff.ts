import fs from "fs/promises";
import sharp from "sharp";

const buffer = await fs.readFile("testing/joystick.png");

// apply the difference of gaussians
const diffOfGaussians = await sharp(buffer)
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

const res = await sharp(diffOfGaussians)
    .threshold(1)
    .removeAlpha()
    .toBuffer({ resolveWithObject: true });

console.log(res.info);
