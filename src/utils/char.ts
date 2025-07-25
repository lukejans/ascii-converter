import { mapValue } from "./math.ts";

export function determineEdgeChar(angle: number) {
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

export function determineLumaChar(luminance: number) {
    // the characters being used to represent the luma in an image
    // which is a practical measurement of a pixels brightness. This
    // charset is listed from darkest to brightest which is currently
    // being represented as most to least dense.
    const LUMA_CHARS = "#$?0=*c~. ";

    // map the luma to a character
    const index = Math.floor(
        mapValue(luminance, 0, 255, 0, LUMA_CHARS.length - 1),
    );

    return LUMA_CHARS[index];
}
