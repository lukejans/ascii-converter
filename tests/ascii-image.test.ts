import fs from "node:fs/promises";
import ASCIIImg from "../src/ascii-image.ts";

const buffer = await fs.readFile("./tests/__fixtures__/8x8.png");

test("ASCIIImg.init() - creating a new instance with explicit mods", async () => {
    const asciiImg = await ASCIIImg.init(buffer, {
        width: 80,
        height: 80,
        threshold: 1.0,
    });

    expect(asciiImg.mods).toStrictEqual({
        width: 80,
        height: 80,
        threshold: 1.0,
    });
});

test("ASCIIImg.init() - creating a new instance with implicit mods", async () => {
    const asciiImg = await ASCIIImg.init(buffer);

    expect(asciiImg.mods).toStrictEqual({
        width: 80,
        height: 40,
        threshold: 0.8,
    });
});

test("asciiImg.stitch - adding four '$' chars to an empty row", async () => {
    const asciiImg = await ASCIIImg.init(buffer, {
        width: 8,
        height: 8,
        threshold: 0.8,
    });

    asciiImg.stich(4, 0, "$");
    asciiImg.stich(4, 1, "$");
    asciiImg.stich(4, 2, "$");
    asciiImg.stich(4, 3, "$");
    expect(asciiImg.text).toStrictEqual(["", "", "", "", "$$$$", "", "", ""]);
});

test("asciiImg.stitch - adding and replacing a ' ' char in a row", async () => {
    const asciiImg = await ASCIIImg.init(buffer, {
        width: 8,
        height: 8,
        threshold: 0.8,
    });

    asciiImg.stich(4, 0, " ");
    asciiImg.stich(4, 0, "!");
    expect(asciiImg.text).toStrictEqual(["", "", "", "", "!", "", "", ""]);
});

test("asciiImg.stitch - ensure non-space chars cannot be overwritten", async () => {
    const asciiImg = await ASCIIImg.init(buffer, {
        width: 8,
        height: 8,
        threshold: 0.8,
    });

    asciiImg.stich(4, 0, "$");
    asciiImg.stich(4, 0, "!");
    expect(asciiImg.text).toStrictEqual(["", "", "", "", "$", "", "", ""]);
});
