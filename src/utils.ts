export function mapValue(
    value: number,
    inStart: number,
    inEnd: number,
    outStart: number,
    outEnd: number,
): number {
    // get the number of values in each range to calculate
    // a values proportion.
    let inLen = inEnd - inStart;
    let outLen = outEnd - outStart;

    // calculate the proportion of `value` within the input
    // range. This will be a percentage between 0 and 1.
    let proportion = (value - inStart) / inLen;

    // convert the proportion to the output range.
    return proportion * outLen + outStart;
}
