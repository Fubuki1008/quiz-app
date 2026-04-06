import { readdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const releaseDir = new URL("../release/", import.meta.url);
const releasePath = fileURLToPath(releaseDir);
const removablePatterns = [
    /^Quiz App-.*\.dmg$/,
    /^Quiz App-.*\.zip$/,
    /^Quiz App-.*\.dmg\.blockmap$/,
    /^Quiz App-.*\.zip\.blockmap$/,
];

async function main() {
    let entries = [];

    try {
        entries = await readdir(releaseDir);
    } catch (error) {
        if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
            return;
        }
        throw error;
    }

    const targets = entries.filter((entry) => removablePatterns.some((pattern) => pattern.test(entry)));

    await Promise.all(
        targets.map((target) => rm(path.join(releasePath, target), { force: true }))
    );
}

await main();