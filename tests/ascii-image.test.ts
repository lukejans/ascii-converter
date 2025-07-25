import fs from "node:fs/promises";
import AsciiImg from "../src/ascii-image";

const buffer = await fs.readFile("./tests/__fixtures__/8x8.png");

test("new AsciiImg - creating a new instance with explicit mods", async () => {
    const asciiImg = new AsciiImg(buffer, {
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

test("new AsciiImg - creating a new instance with implicit mods", async () => {
    const asciiImg = new AsciiImg(buffer);

    expect(asciiImg.mods).toStrictEqual({
        width: 100,
        height: 50,
        threshold: 0.7,
    });
});

test("asciiImg.stitchText - ensure chars can be added to an empty row", async () => {
    const asciiImg = new AsciiImg(buffer, {
        width: 8,
        height: 8,
        threshold: 0.8,
    });

    asciiImg.stitchText(4, 0, "$");
    asciiImg.stitchText(4, 1, "$");
    asciiImg.stitchText(4, 2, "$");
    asciiImg.stitchText(4, 3, "$");
    expect(asciiImg.text).toStrictEqual(["", "", "", "", "$$$$", "", "", ""]);
});

test("asciiImg.stitchText - ensure space chars can be overwritten", async () => {
    const asciiImg = new AsciiImg(buffer, {
        width: 8,
        height: 8,
        threshold: 0.8,
    });

    asciiImg.stitchText(4, 0, " ");
    asciiImg.stitchText(4, 0, "!");
    expect(asciiImg.text).toStrictEqual(["", "", "", "", "!", "", "", ""]);
});

test("asciiImg.stitchText - ensure non-space chars cannot be overwritten", async () => {
    const asciiImg = new AsciiImg(buffer, {
        width: 8,
        height: 8,
        threshold: 0.8,
    });

    asciiImg.stitchText(4, 0, "$");
    asciiImg.stitchText(4, 0, "!");
    expect(asciiImg.text).toStrictEqual(["", "", "", "", "$", "", "", ""]);
});
