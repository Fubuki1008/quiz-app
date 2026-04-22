// 問題データと Electron API の読み書きをまとめて扱う
import {
  CategoryDefinition,
  Question,
  QuestionFileName,
  QuizAppApi,
  StorageInfo,
} from "./types.js";

type AppWindow = Window & typeof globalThis & { quizAppApi?: QuizAppApi };

export function getAppWindow(): AppWindow {
  return window as AppWindow;
}

export function loadQuestions(fileName: string): Promise<Question[]> {
  const appWindow = getAppWindow();

  if (appWindow.quizAppApi) {
    return appWindow.quizAppApi.loadQuestions(fileName);
  }

  return fetch(`./${fileName}`).then((response) => {
    if (!response.ok) {
      throw new Error(`Failed to load questions: ${response.status}`);
    }
    return response.json() as Promise<Question[]>;
  });
}

export function loadBundledQuestions(fileName: string): Promise<Question[]> {
  const appWindow = getAppWindow();

  if (appWindow.quizAppApi) {
    return appWindow.quizAppApi.loadBundledQuestions(fileName);
  }

  return fetch(`./${fileName}`).then((response) => {
    if (!response.ok) {
      throw new Error(`Failed to load bundled questions: ${response.status}`);
    }
    return response.json() as Promise<Question[]>;
  });
}

export function loadCategories(): Promise<CategoryDefinition[]> {
  const appWindow = getAppWindow();

  if (appWindow.quizAppApi) {
    return appWindow.quizAppApi.loadCategories();
  }

  return fetch("./categories.json").then((response) => {
    if (!response.ok) {
      throw new Error(`Failed to load categories: ${response.status}`);
    }
    return response.json() as Promise<CategoryDefinition[]>;
  });
}

export function saveQuestions(
  fileName: QuestionFileName,
  nextQuestions: Question[]
): Promise<void> {
  const appWindow = getAppWindow();

  if (!appWindow.quizAppApi) {
    return Promise.reject(new Error("問題管理は Electron 版でのみ利用できます。"));
  }

  return appWindow.quizAppApi.saveQuestions(fileName, nextQuestions).then(() => undefined);
}

export function createCategory(label: string): Promise<CategoryDefinition> {
  const appWindow = getAppWindow();

  if (!appWindow.quizAppApi) {
    return Promise.reject(new Error("問題種別の追加は Electron 版でのみ利用できます。"));
  }

  return appWindow.quizAppApi.createCategory(label);
}

export function renameCategory(
  fileName: QuestionFileName,
  label: string
): Promise<CategoryDefinition> {
  const appWindow = getAppWindow();

  if (!appWindow.quizAppApi) {
    return Promise.reject(new Error("問題種別の変更は Electron 版でのみ利用できます。"));
  }

  return appWindow.quizAppApi.renameCategory(fileName, label);
}

export function deleteCategory(fileName: QuestionFileName): Promise<void> {
  const appWindow = getAppWindow();

  if (!appWindow.quizAppApi) {
    return Promise.reject(new Error("問題種別の削除は Electron 版でのみ利用できます。"));
  }

  return appWindow.quizAppApi.deleteCategory(fileName).then(() => undefined);
}

export function getStorageInfo(): Promise<StorageInfo> {
  const appWindow = getAppWindow();

  if (!appWindow.quizAppApi) {
    return Promise.reject(new Error("保存先の案内は Electron 版でのみ利用できます。"));
  }

  return appWindow.quizAppApi.getStorageInfo();
}

export function clearUserData(): Promise<void> {
  const appWindow = getAppWindow();

  if (!appWindow.quizAppApi) {
    return Promise.reject(new Error("ユーザーデータ削除は Electron 版でのみ利用できます。"));
  }

  return appWindow.quizAppApi.clearUserData().then(() => undefined);
}