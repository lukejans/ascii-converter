import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const FPS = 30;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- helper functions
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
function clearConsole() {
    process.stdout.write("\x1b[2J\x1b[0f");
}

// --- handle exit (^C)
process.on("SIGINT", () => {
    console.log("\n\nAnimation stopped by user (Ctrl+C)");
    process.exit(0);
});

process.on("SIGTERM", () => {
    console.log("\n\nAnimation terminated");
    process.exit(0);
});

// --- main loop
(async () => {
    try {
        // Read the frames.json file
        const framesPath = path.join(__dirname, "frames.json");
        const framesData = fs.readFileSync(framesPath, "utf8");
        const frames = JSON.parse(framesData);

        console.log(
            `Loaded ${frames.length} frames. Starting infinite animation...`,
        );
        console.log("Press Ctrl+C to stop\n");
        await sleep(1000); // Brief pause before starting

        let totalFramesShown = 0;

        // infinite loop
        while (true) {
            // display each frame
            for (let frameIndex = 0; frameIndex < frames.length; frameIndex++) {
                clearConsole();

                const frame = frames[frameIndex];

                // display each line in a frame
                for (let lineIndex = 0; lineIndex < frame.length; lineIndex++) {
                    console.log(frame[lineIndex]);
                }

                totalFramesShown++;

                // display frame information
                console.log(
                    `\nFrame: ${frameIndex + 1}/${frames.length} | Total shown: ${totalFramesShown} | Press Ctrl+C to stop`,
                );

                await sleep(1000 / FPS);
            }
        }
    } catch (error) {
        console.error("Error reading or parsing frames.json:", error.message);
        process.exit(1);
    }
})();
