const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs/promises");

const authenticatedEditorSessions = new Set();
const adminUsername = process.env.QUIZ_ADMIN_USERNAME || "admin";
const adminPassword = process.env.QUIZ_ADMIN_PASSWORD || "change-me";
const questionDataDirectoryName = "question-data";
const categoryDefinitionsFileName = "categories.json";
const bundledPracticalQuestionFiles = new Set([
    "practical-html-questions.json",
    "practical-css-questions.json",
]);

function normalizeCategoryLabel(label) {
    return typeof label === "string" ? label.replace(/\s+/g, " ").trim() : "";
}

function slugifyCategoryLabel(label) {
    const normalized = normalizeCategoryLabel(label)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

    if (normalized.length > 0) {
        return normalized;
    }

    return `category-${Date.now()}`;
}

function getBundledQuestionFilePath(fileName) {
    return path.join(__dirname, "..", fileName);
}

function getBundledCategoryDefinitionsPath() {
    return path.join(__dirname, "..", categoryDefinitionsFileName);
}

function getQuestionDataDirectoryPath() {
    return path.join(app.getPath("userData"), questionDataDirectoryName);
}

function getCategoryDefinitionsPath() {
    return path.join(getQuestionDataDirectoryPath(), categoryDefinitionsFileName);
}

function getQuestionFilePath(fileName) {
    return path.join(getQuestionDataDirectoryPath(), fileName);
}

function parseCategoryDefinitions(raw) {
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
        throw new Error("Invalid category definitions");
    }

    return parsed.filter((item) => {
        return (
            typeof item?.id === "string" &&
            typeof item?.label === "string" &&
            typeof item?.fileName === "string"
        );
    });
}

async function loadBundledCategoryDefinitions() {
    const raw = await fs.readFile(getBundledCategoryDefinitionsPath(), "utf-8");
    return parseCategoryDefinitions(raw);
}

async function syncBundledCategoryDefinitions() {
    const questionDataDirectoryPath = getQuestionDataDirectoryPath();
    const definitionsPath = getCategoryDefinitionsPath();

    await fs.mkdir(questionDataDirectoryPath, { recursive: true });

    const bundledCategories = await loadBundledCategoryDefinitions();

    try {
        await fs.access(definitionsPath);
    } catch (_error) {
        const bundledContent = `${JSON.stringify(bundledCategories, null, 2)}\n`;
        await fs.writeFile(definitionsPath, bundledContent, "utf-8");
        return definitionsPath;
    }

    const raw = await fs.readFile(definitionsPath, "utf-8");
    const existingCategories = parseCategoryDefinitions(raw);
    const existingFileNames = new Set(existingCategories.map((category) => category.fileName));
    const missingBundledCategories = bundledCategories.filter(
        (category) => !existingFileNames.has(category.fileName)
    );

    if (missingBundledCategories.length > 0) {
        const nextCategories = [...existingCategories, ...missingBundledCategories];
        const nextContent = `${JSON.stringify(nextCategories, null, 2)}\n`;
        await fs.writeFile(definitionsPath, nextContent, "utf-8");
    }

    return definitionsPath;
}

async function ensureCategoryDefinitionsFileExists() {
    return syncBundledCategoryDefinitions();
}

async function loadCategoryDefinitions() {
    const definitionsPath = await ensureCategoryDefinitionsFileExists();
    const raw = await fs.readFile(definitionsPath, "utf-8");
    return parseCategoryDefinitions(raw);
}

async function saveCategoryDefinitions(categories) {
    const definitionsPath = await ensureCategoryDefinitionsFileExists();
    const nextContent = `${JSON.stringify(categories, null, 2)}\n`;
    await fs.writeFile(definitionsPath, nextContent, "utf-8");
}

async function getAllowedQuestionFiles() {
    const categories = await loadCategoryDefinitions();
    return new Set(categories.map((category) => category.fileName));
}

async function ensureQuestionFileExists(fileName) {
    const questionDataDirectoryPath = getQuestionDataDirectoryPath();
    const filePath = getQuestionFilePath(fileName);

    await fs.mkdir(questionDataDirectoryPath, { recursive: true });

    try {
        await fs.access(filePath);
    } catch (_error) {
        const bundledFilePath = getBundledQuestionFilePath(fileName);
        try {
            const fileContent = await fs.readFile(bundledFilePath, "utf-8");
            await fs.writeFile(filePath, fileContent, "utf-8");
        } catch (_bundledError) {
            await fs.writeFile(filePath, "[]\n", "utf-8");
        }
    }

    return filePath;
}

async function ensureQuestionFilesExist() {
    const categories = await loadCategoryDefinitions();
    await Promise.all(categories.map((category) => ensureQuestionFileExists(category.fileName)));
}

function isEditorAuthenticated(event) {
    return authenticatedEditorSessions.has(event.sender.id);
}

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1200,
        height: 900,
        minWidth: 900,
        minHeight: 700,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            preload: path.join(__dirname, "preload.js"),
        },
    });

    mainWindow.loadFile(path.join(__dirname, "..", "index.html"));
}

ipcMain.handle("quiz:load-questions", async (_event, fileName) => {
    const allowedQuestionFiles = await getAllowedQuestionFiles();

    if (!allowedQuestionFiles.has(fileName)) {
        throw new Error("Unsupported question file");
    }

    const filePath = await ensureQuestionFileExists(fileName);
    const fileContent = await fs.readFile(filePath, "utf-8");
    return JSON.parse(fileContent);
});

ipcMain.handle("quiz:load-bundled-questions", async (_event, fileName) => {
    if (!bundledPracticalQuestionFiles.has(fileName)) {
        throw new Error("Unsupported bundled question file");
    }

    const bundledFilePath = getBundledQuestionFilePath(fileName);
    const fileContent = await fs.readFile(bundledFilePath, "utf-8");
    return JSON.parse(fileContent);
});

ipcMain.handle("quiz:save-questions", async (_event, fileName, questions) => {
    if (!isEditorAuthenticated(_event)) {
        throw new Error("Admin authentication required");
    }

    const allowedQuestionFiles = await getAllowedQuestionFiles();

    if (!allowedQuestionFiles.has(fileName)) {
        throw new Error("Unsupported question file");
    }

    if (!Array.isArray(questions)) {
        throw new Error("Invalid question payload");
    }

    const filePath = await ensureQuestionFileExists(fileName);
    const nextContent = `${JSON.stringify(questions, null, 2)}\n`;
    await fs.writeFile(filePath, nextContent, "utf-8");
    return { ok: true };
});

ipcMain.handle("quiz:load-categories", async () => {
    const categories = await loadCategoryDefinitions();
    return categories;
});

ipcMain.handle("quiz:create-category", async (event, payload) => {
    if (!isEditorAuthenticated(event)) {
        throw new Error("Admin authentication required");
    }

    const label = normalizeCategoryLabel(payload?.label);
    if (!label) {
        throw new Error("問題種別名を入力してください。");
    }

    const categories = await loadCategoryDefinitions();
    const labelAlreadyExists = categories.some(
        (category) => category.label.toLowerCase() === label.toLowerCase()
    );
    if (labelAlreadyExists) {
        throw new Error("同じ名前の問題種別がすでに存在します。");
    }

    const baseSlug = slugifyCategoryLabel(label);
    let suffix = 0;
    let fileName = `${baseSlug}-questions.json`;
    while (categories.some((category) => category.fileName === fileName)) {
        suffix += 1;
        fileName = `${baseSlug}-${suffix}-questions.json`;
    }

    const nextCategory = {
        id: suffix === 0 ? baseSlug : `${baseSlug}-${suffix}`,
        label,
        fileName,
    };

    const nextCategories = [...categories, nextCategory];
    await saveCategoryDefinitions(nextCategories);
    await ensureQuestionFileExists(fileName);
    return nextCategory;
});

ipcMain.handle("quiz:rename-category", async (event, payload) => {
    if (!isEditorAuthenticated(event)) {
        throw new Error("Admin authentication required");
    }

    const fileName = typeof payload?.fileName === "string" ? payload.fileName : "";
    const label = normalizeCategoryLabel(payload?.label);

    if (!fileName) {
        throw new Error("変更対象の問題種別が不正です。");
    }
    if (!label) {
        throw new Error("問題種別名を入力してください。");
    }

    const categories = await loadCategoryDefinitions();
    const targetIndex = categories.findIndex((category) => category.fileName === fileName);
    if (targetIndex < 0) {
        throw new Error("変更対象の問題種別が見つかりません。");
    }

    const duplicateLabel = categories.some(
        (category, index) =>
            index !== targetIndex && category.label.toLowerCase() === label.toLowerCase()
    );
    if (duplicateLabel) {
        throw new Error("同じ名前の問題種別がすでに存在します。");
    }

    const nextCategory = {
        ...categories[targetIndex],
        label,
    };
    const nextCategories = [...categories];
    nextCategories[targetIndex] = nextCategory;
    await saveCategoryDefinitions(nextCategories);
    return nextCategory;
});

ipcMain.handle("quiz:delete-category", async (event, payload) => {
    if (!isEditorAuthenticated(event)) {
        throw new Error("Admin authentication required");
    }

    const fileName = typeof payload?.fileName === "string" ? payload.fileName : "";
    if (!fileName) {
        throw new Error("削除対象の問題種別が不正です。");
    }

    const categories = await loadCategoryDefinitions();
    if (categories.length <= 1) {
        throw new Error("最後の1件は削除できません。");
    }

    const targetCategory = categories.find((category) => category.fileName === fileName);
    if (!targetCategory) {
        throw new Error("削除対象の問題種別が見つかりません。");
    }

    const nextCategories = categories.filter((category) => category.fileName !== fileName);
    await saveCategoryDefinitions(nextCategories);
    await fs.rm(getQuestionFilePath(fileName), { force: true });
    return { ok: true };
});

ipcMain.handle("quiz:get-storage-info", async () => {
    await ensureQuestionFilesExist();

    return {
        userDataPath: app.getPath("userData"),
        questionDataPath: getQuestionDataDirectoryPath(),
    };
});

ipcMain.handle("quiz:clear-user-data", async (event) => {
    await event.sender.session.clearStorageData({
        storages: ["localstorage", "indexdb"],
    });
    await fs.rm(getQuestionDataDirectoryPath(), { recursive: true, force: true });

    return { ok: true };
});

ipcMain.handle("quiz:get-admin-auth-state", (event) => {
    return {
        authenticated: isEditorAuthenticated(event),
        username: adminUsername,
    };
});

ipcMain.handle("quiz:login-admin", (event, credentials) => {
    const username = typeof credentials?.username === "string" ? credentials.username : "";
    const password = typeof credentials?.password === "string" ? credentials.password : "";

    if (username === adminUsername && password === adminPassword) {
        authenticatedEditorSessions.add(event.sender.id);
        return { ok: true };
    }

    return {
        ok: false,
        message: "ユーザー名またはパスワードが違います。",
    };
});

ipcMain.handle("quiz:logout-admin", (event) => {
    authenticatedEditorSessions.delete(event.sender.id);
    return { ok: true };
});

app.whenReady().then(() => {
    void ensureQuestionFilesExist();
    createWindow();

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});