export interface ASCIIImg {
    originBuffer: Buffer | null;
    sharpBuffer: Buffer | null;
    imgMods: {
        w: number;
        h: number;
        threshold: number;
    };
}
