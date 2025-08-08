export const extensions = {
    photo: new Set(["png", "jpg", "avif"]),
    video: new Set(["mp4", "mov"]),

    /**
     * validates the extension type (photo or video) and if the
     * extension is neither it returns false.
     *
     * @param extension - the extension to validate
     * @returns the extension category (photo or video) if true
     */
    validate(extension: string): "photo" | "video" | false {
        if (this.photo.has(extension)) return "photo";
        if (this.video.has(extension)) return "video";
        return false;
    },
};
