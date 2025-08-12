/**
 * Configuration for image modifications during ASCII conversion preprocessing
 *
 * @property width - width to resize the image to
 * @property height - height to resize the image to
 * @property threshold - threshold for pixel rendering [0, 1]
 */
export interface ImgModifications {
    /** Width to resize the image to */
    width?: number;
    /** Height to resize the image to */
    height?: number;
    /** threshold for pixel rendering [0, 1] */
    threshold: number;
}
