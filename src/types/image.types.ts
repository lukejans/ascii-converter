/**
 * Configuration for image modifications during ASCII conversion preprocessing
 */
export interface ImgModifications {
    /** Target width for the ASCII output */
    width: number;
    /** Target height for the ASCII output */
    height: number;
    /** Threshold multiplier for edge detection (0-1, where 1 is most sensitive) */
    threshold: number;
}
