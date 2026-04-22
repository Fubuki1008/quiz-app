import path from "node:path";
import { notarize } from "@electron/notarize";

export default async function notarizeApp(context) {
    const { electronPlatformName, appOutDir, packager } = context;

    if (electronPlatformName !== "darwin") {
        return;
    }

    const appleId = process.env.APPLE_ID;
    const appleIdPassword = process.env.APPLE_APP_SPECIFIC_PASSWORD;
    const teamId = process.env.APPLE_TEAM_ID;

    if (!appleId || !appleIdPassword || !teamId) {
        console.log("Skipping notarization: APPLE_ID / APPLE_APP_SPECIFIC_PASSWORD / APPLE_TEAM_ID are not fully set.");
        return;
    }

    const appName = packager.appInfo.productFilename;
    const appBundleId = packager.appInfo.id;
    const appPath = path.join(appOutDir, `${appName}.app`);

    console.log(`Notarizing ${appName}.app for ${appBundleId}...`);

    await notarize({
        tool: "notarytool",
        appBundleId,
        appPath,
        appleId,
        appleIdPassword,
        teamId,
    });
}
