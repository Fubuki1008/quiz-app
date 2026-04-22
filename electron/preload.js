const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("quizAppApi", {
    loadCategories() {
        return ipcRenderer.invoke("quiz:load-categories");
    },
    loadQuestions(fileName) {
        return ipcRenderer.invoke("quiz:load-questions", fileName);
    },
    loadBundledQuestions(fileName) {
        return ipcRenderer.invoke("quiz:load-bundled-questions", fileName);
    },
    saveQuestions(fileName, questions) {
        return ipcRenderer.invoke("quiz:save-questions", fileName, questions);
    },
    createCategory(label) {
        return ipcRenderer.invoke("quiz:create-category", { label });
    },
    renameCategory(fileName, label) {
        return ipcRenderer.invoke("quiz:rename-category", { fileName, label });
    },
    deleteCategory(fileName) {
        return ipcRenderer.invoke("quiz:delete-category", { fileName });
    },
    getAdminAuthState() {
        return ipcRenderer.invoke("quiz:get-admin-auth-state");
    },
    getStorageInfo() {
        return ipcRenderer.invoke("quiz:get-storage-info");
    },
    clearUserData() {
        return ipcRenderer.invoke("quiz:clear-user-data");
    },
    loginAdmin(username, password) {
        return ipcRenderer.invoke("quiz:login-admin", { username, password });
    },
    logoutAdmin() {
        return ipcRenderer.invoke("quiz:logout-admin");
    },
});