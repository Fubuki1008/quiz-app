import {
  clearUserData,
  createCategory,
  deleteCategory,
  getAppWindow,
  getStorageInfo,
  loadCategories,
  loadQuestions,
  renameCategory,
  saveQuestions,
} from "./api.js";
import { escapeHtml, stripMarkup } from "./text-format.js";
import { CategoryDefinition, Question, QuestionFileName } from "./types.js";

export type QuestionEditorElements = {
  editorEntry: HTMLElement;
  editorEntryNote: HTMLElement;
  openEditorButton: HTMLButtonElement;
  adminLoginPanel: HTMLElement;
  adminLoginStatus: HTMLElement;
  adminUsernameInput: HTMLInputElement;
  adminPasswordInput: HTMLInputElement;
  adminLoginButton: HTMLButtonElement;
  adminLoginCancelButton: HTMLButtonElement;
  questionEditorPanel: HTMLElement;
  storageHelpPanel: HTMLElement;
  userDataPathText: HTMLElement;
  questionDataPathText: HTMLElement;
  storageActionStatus: HTMLElement;
  clearUserDataButton: HTMLButtonElement;
  logoutEditorButton: HTMLButtonElement;
  closeEditorButton: HTMLButtonElement;
  editorCategorySelect: HTMLSelectElement;
  newCategoryNameInput: HTMLInputElement;
  addCategoryButton: HTMLButtonElement;
  renameCategoryNameInput: HTMLInputElement;
  renameCategoryButton: HTMLButtonElement;
  deleteCategoryButton: HTMLButtonElement;
  categoryActionStatus: HTMLElement;
  editorStatusMessage: HTMLElement;
  editorQuestionList: HTMLElement;
  editorFormTitle: HTMLElement;
  editorQuestionInput: HTMLTextAreaElement;
  editorChoicesInput: HTMLTextAreaElement;
  editorAnswerInput: HTMLInputElement;
  editorTagsInput: HTMLInputElement;
  editorExplanationInput: HTMLTextAreaElement;
  newQuestionButton: HTMLButtonElement;
  saveQuestionButton: HTMLButtonElement;
  deleteQuestionButton: HTMLButtonElement;
};

export function createQuestionEditor(elements: QuestionEditorElements) {
  let editorQuestions: Question[] = [];
  let categories: CategoryDefinition[] = [];
  let editorCurrentFile: QuestionFileName = "";
  let editorSelectedIndex = -1;
  let isAdminAuthenticated = false;

  elements.openEditorButton.onclick = () => {
    void handleOpenEditor();
  };
  elements.adminLoginButton.onclick = () => {
    void loginAdmin();
  };
  elements.adminLoginCancelButton.onclick = () => {
    closeAdminLoginPanel();
  };
  elements.closeEditorButton.onclick = () => {
    closeQuestionEditor();
  };
  elements.logoutEditorButton.onclick = () => {
    void logoutAdmin();
  };
  elements.editorCategorySelect.onchange = () => {
    const fileName = elements.editorCategorySelect.value as QuestionFileName;
    syncCategoryManagementState(fileName);
    void loadEditorCategory(fileName);
  };
  elements.newQuestionButton.onclick = () => {
    beginNewQuestionDraft();
  };
  elements.saveQuestionButton.onclick = () => {
    void saveEditorQuestion();
  };
  elements.deleteQuestionButton.onclick = () => {
    void deleteEditorQuestion();
  };
  elements.addCategoryButton.onclick = () => {
    void handleCreateCategory();
  };
  elements.renameCategoryButton.onclick = () => {
    void handleRenameCategory();
  };
  elements.deleteCategoryButton.onclick = () => {
    void handleDeleteCategory();
  };
  elements.clearUserDataButton.onclick = () => {
    void handleClearUserData();
  };

  async function init() {
    const hasEditorApi = typeof getAppWindow().quizAppApi?.saveQuestions === "function";

    if (!hasEditorApi) {
      return;
    }

    elements.editorEntry.classList.remove("hidden");
    await refreshCategories();
    beginNewQuestionDraft();
    await syncAdminAuthState();
    await initStorageHelp();
  }

  async function syncAdminAuthState() {
    const appWindow = getAppWindow();

    if (!appWindow.quizAppApi) {
      return;
    }

    const state = await appWindow.quizAppApi.getAdminAuthState();
    isAdminAuthenticated = state.authenticated;
    elements.openEditorButton.textContent = isAdminAuthenticated
      ? "問題を管理する"
      : "管理者ログインして問題を管理する";
    elements.editorEntryNote.textContent = isAdminAuthenticated
      ? `${state.username} としてログイン済みです。問題データはアプリ専用フォルダに保存されます。`
      : "編集画面に入るには管理者ログインが必要です。問題データはアプリ専用フォルダに保存されます。";
  }

  async function handleOpenEditor() {
    if (isAdminAuthenticated) {
      await openQuestionEditor();
      return;
    }

    openAdminLoginPanel();
  }

  function openAdminLoginPanel() {
    elements.questionEditorPanel.classList.add("hidden");
    elements.editorEntry.classList.add("hidden");
    elements.adminLoginPanel.classList.remove("hidden");
    elements.adminLoginStatus.textContent = "編集画面に入るには管理者ログインが必要です。";
    elements.adminLoginStatus.classList.remove("is-error");
    elements.adminPasswordInput.value = "";
    elements.adminUsernameInput.focus();
  }

  function closeAdminLoginPanel() {
    elements.adminLoginPanel.classList.add("hidden");
    elements.editorEntry.classList.remove("hidden");
    elements.adminLoginStatus.textContent = "編集画面に入るには管理者ログインが必要です。";
    elements.adminLoginStatus.classList.remove("is-error");
  }

  async function loginAdmin() {
    const username = elements.adminUsernameInput.value.trim();
    const password = elements.adminPasswordInput.value;

    if (!username || !password) {
      elements.adminLoginStatus.textContent = "ユーザー名とパスワードを入力してください。";
      elements.adminLoginStatus.classList.add("is-error");
      return;
    }

    try {
      const result = await getAppWindow().quizAppApi?.loginAdmin(username, password);
      if (!result?.ok) {
        elements.adminLoginStatus.textContent = result?.message ?? "ログインに失敗しました。";
        elements.adminLoginStatus.classList.add("is-error");
        return;
      }

      isAdminAuthenticated = true;
      elements.adminPasswordInput.value = "";
      closeAdminLoginPanel();
      await syncAdminAuthState();
      await openQuestionEditor();
    } catch (error) {
      console.error("管理者ログインに失敗:", error);
      elements.adminLoginStatus.textContent = "ログイン処理に失敗しました。";
      elements.adminLoginStatus.classList.add("is-error");
    }
  }

  async function logoutAdmin() {
    try {
      await getAppWindow().quizAppApi?.logoutAdmin();
    } catch (error) {
      console.error("管理者ログアウトに失敗:", error);
    }

    isAdminAuthenticated = false;
    closeQuestionEditor();
    await syncAdminAuthState();
  }

  async function openQuestionEditor() {
    if (!isAdminAuthenticated) {
      openAdminLoginPanel();
      return;
    }

    elements.adminLoginPanel.classList.add("hidden");
    elements.questionEditorPanel.classList.remove("hidden");
    elements.editorEntry.classList.add("hidden");
    elements.storageHelpPanel.classList.remove("hidden");

    if (!editorCurrentFile && categories.length > 0) {
      editorCurrentFile = categories[0].fileName;
    }

    if (editorCurrentFile) {
      await loadEditorCategory(editorCurrentFile);
    }
  }

  function closeQuestionEditor() {
    elements.questionEditorPanel.classList.add("hidden");
    elements.editorEntry.classList.remove("hidden");
    elements.storageActionStatus.classList.add("hidden");
    setEditorStatus("問題データを安全に更新できます。", false);
  }

  async function initStorageHelp() {
    try {
      const info = await getStorageInfo();
      elements.storageHelpPanel.classList.remove("hidden");
      elements.userDataPathText.textContent = info.userDataPath;
      elements.questionDataPathText.textContent = info.questionDataPath;
    } catch (_error) {
      elements.storageHelpPanel.classList.add("hidden");
    }
  }

  async function refreshCategories(nextSelectedFileName?: QuestionFileName) {
    categories = await loadCategories();
    renderCategoryOptions();

    if (categories.length === 0) {
      editorCurrentFile = "";
      elements.editorCategorySelect.disabled = true;
      dispatchCategoriesChanged();
      return;
    }

    const preferredFileName = nextSelectedFileName ?? editorCurrentFile;
    const selectedCategory =
      categories.find((category) => category.fileName === preferredFileName) ?? categories[0];

    editorCurrentFile = selectedCategory.fileName;
    elements.editorCategorySelect.value = editorCurrentFile;
    elements.editorCategorySelect.disabled = false;
    syncCategoryManagementState(editorCurrentFile);
    dispatchCategoriesChanged();
  }

  function syncCategoryManagementState(fileName: QuestionFileName) {
    const selectedCategory = categories.find((category) => category.fileName === fileName) ?? null;
    elements.renameCategoryNameInput.value = selectedCategory?.label ?? "";
    elements.renameCategoryButton.disabled = selectedCategory === null;
    elements.deleteCategoryButton.disabled = selectedCategory === null || categories.length <= 1;
  }

  function renderCategoryOptions() {
    elements.editorCategorySelect.innerHTML = "";

    categories.forEach((category) => {
      const option = document.createElement("option");
      option.value = category.fileName;
      option.textContent = category.label;
      elements.editorCategorySelect.appendChild(option);
    });
  }

  function dispatchCategoriesChanged() {
    window.dispatchEvent(
      new CustomEvent("quiz-categories-changed", {
        detail: { categories },
      })
    );
  }

  function getCategoryLabel(fileName: QuestionFileName): string {
    return categories.find((category) => category.fileName === fileName)?.label ?? fileName;
  }

  async function handleCreateCategory() {
    const label = elements.newCategoryNameInput.value.trim();
    if (!label) {
      setCategoryActionStatus("問題種別名を入力してください。", true);
      return;
    }

    elements.addCategoryButton.disabled = true;
    setCategoryActionStatus("問題種別を追加しています...", false);

    try {
      const createdCategory = await createCategory(label);
      elements.newCategoryNameInput.value = "";
      await refreshCategories(createdCategory.fileName);
      await loadEditorCategory(createdCategory.fileName);
      setCategoryActionStatus(`問題種別「${createdCategory.label}」を追加しました。`, false);
    } catch (error) {
      console.error("問題種別の追加に失敗:", error);
      const message = error instanceof Error ? error.message : "問題種別の追加に失敗しました。";
      setCategoryActionStatus(message, true);
    } finally {
      elements.addCategoryButton.disabled = false;
    }
  }

  async function handleRenameCategory() {
    if (!editorCurrentFile) {
      setCategoryActionStatus("変更対象の問題種別を選択してください。", true);
      return;
    }

    const label = elements.renameCategoryNameInput.value.trim();
    if (!label) {
      setCategoryActionStatus("新しい問題種別名を入力してください。", true);
      return;
    }

    elements.renameCategoryButton.disabled = true;
    setCategoryActionStatus("問題種別名を変更しています...", false);

    try {
      const updatedCategory = await renameCategory(editorCurrentFile, label);
      await refreshCategories(updatedCategory.fileName);
      setCategoryActionStatus(`問題種別名を「${updatedCategory.label}」に変更しました。`, false);
      setEditorStatus(
        `${updatedCategory.label} の問題を ${editorQuestions.length} 件読み込みました。`,
        false
      );
    } catch (error) {
      console.error("問題種別名の変更に失敗:", error);
      const message = error instanceof Error ? error.message : "問題種別名の変更に失敗しました。";
      setCategoryActionStatus(message, true);
    } finally {
      syncCategoryManagementState(editorCurrentFile);
    }
  }

  async function handleDeleteCategory() {
    if (!editorCurrentFile) {
      setCategoryActionStatus("削除対象の問題種別を選択してください。", true);
      return;
    }

    const categoryLabel = getCategoryLabel(editorCurrentFile);
    const confirmed = window.confirm(
      `問題種別「${categoryLabel}」を削除します。関連する問題データも削除されます。よろしいですか？`
    );
    if (!confirmed) {
      return;
    }

    elements.deleteCategoryButton.disabled = true;
    setCategoryActionStatus("問題種別を削除しています...", false);

    try {
      await deleteCategory(editorCurrentFile);
      await refreshCategories();
      if (editorCurrentFile) {
        await loadEditorCategory(editorCurrentFile);
      } else {
        editorQuestions = [];
        renderEditorQuestionList();
        beginNewQuestionDraft();
      }
      setCategoryActionStatus(`問題種別「${categoryLabel}」を削除しました。`, false);
    } catch (error) {
      console.error("問題種別の削除に失敗:", error);
      const message = error instanceof Error ? error.message : "問題種別の削除に失敗しました。";
      setCategoryActionStatus(message, true);
      syncCategoryManagementState(editorCurrentFile);
    }
  }

  async function handleClearUserData() {
    const confirmed = window.confirm(
      "履歴、設定、編集した問題データを削除して初期状態に戻します。よろしいですか？"
    );

    if (!confirmed) {
      return;
    }

    elements.clearUserDataButton.disabled = true;
    setStorageActionStatus("ユーザーデータを削除しています...", false);

    try {
      localStorage.clear();
      await clearUserData();
      setStorageActionStatus("削除しました。画面を再読み込みします。", false);
      window.setTimeout(() => {
        location.reload();
      }, 600);
    } catch (error) {
      console.error("ユーザーデータ削除に失敗:", error);
      const message = error instanceof Error ? error.message : "ユーザーデータ削除に失敗しました。";
      setStorageActionStatus(message, true);
      elements.clearUserDataButton.disabled = false;
    }
  }

  async function loadEditorCategory(fileName: QuestionFileName) {
    editorCurrentFile = fileName;
    setEditorStatus("問題を読み込み中です...", false);

    try {
      editorQuestions = await loadQuestions(fileName);
      renderEditorQuestionList();
      beginNewQuestionDraft();
      setEditorStatus(`${getCategoryLabel(fileName)} の問題を ${editorQuestions.length} 件読み込みました。`, false);
    } catch (error) {
      console.error("問題一覧の読み込みに失敗:", error);
      editorQuestions = [];
      renderEditorQuestionList();
      beginNewQuestionDraft();
      setEditorStatus("問題の読み込みに失敗しました。", true);
    }
  }

  function renderEditorQuestionList() {
    elements.editorQuestionList.innerHTML = "";

    if (editorQuestions.length === 0) {
      const emptyItem = document.createElement("li");
      emptyItem.className = "editor-question-empty";
      emptyItem.textContent = "まだ問題がありません";
      elements.editorQuestionList.appendChild(emptyItem);
      return;
    }

    editorQuestions.forEach((question, index) => {
      const item = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.className = `editor-question-item${index === editorSelectedIndex ? " active" : ""}`;
      button.innerHTML = `
        <span class="editor-question-order">${index + 1}</span>
        <span class="editor-question-text">${escapeHtml(
          stripMarkup(question.question) || "無題の問題"
        )}</span>
      `;
      button.onclick = () => {
        selectEditorQuestion(index);
      };
      item.appendChild(button);
      elements.editorQuestionList.appendChild(item);
    });
  }

  function selectEditorQuestion(index: number) {
    const question = editorQuestions[index];
    if (!question) {
      return;
    }

    editorSelectedIndex = index;
    elements.editorFormTitle.textContent = `問題 ${index + 1} を編集中`;
    elements.editorQuestionInput.value = question.question;
    elements.editorChoicesInput.value = question.choices.join("\n");
    elements.editorAnswerInput.value = question.answer;
    elements.editorTagsInput.value = (question.tags ?? []).join(", ");
    elements.editorExplanationInput.value = question.explanation;
    elements.deleteQuestionButton.disabled = false;
    renderEditorQuestionList();
  }

  function beginNewQuestionDraft() {
    editorSelectedIndex = -1;
    elements.editorFormTitle.textContent = "新しい問題";
    elements.editorQuestionInput.value = "";
    elements.editorChoicesInput.value = "";
    elements.editorAnswerInput.value = "";
    elements.editorTagsInput.value = "";
    elements.editorExplanationInput.value = "";
    elements.deleteQuestionButton.disabled = true;
    renderEditorQuestionList();
  }

  async function saveEditorQuestion() {
    try {
      const nextQuestion = readEditorQuestionForm();
      const nextQuestions = [...editorQuestions];

      if (editorSelectedIndex >= 0) {
        nextQuestions[editorSelectedIndex] = nextQuestion;
      } else {
        nextQuestions.push(nextQuestion);
        editorSelectedIndex = nextQuestions.length - 1;
      }

      await saveQuestions(editorCurrentFile, nextQuestions);
      editorQuestions = nextQuestions;
      renderEditorQuestionList();
      selectEditorQuestion(editorSelectedIndex);
      setEditorStatus("問題を保存しました。", false);
    } catch (error) {
      console.error("問題の保存に失敗:", error);
      const message = error instanceof Error ? error.message : "問題の保存に失敗しました。";
      setEditorStatus(message, true);
    }
  }

  async function deleteEditorQuestion() {
    if (editorSelectedIndex < 0) {
      return;
    }

    const target = editorQuestions[editorSelectedIndex];
    if (!target) {
      return;
    }

    const confirmed = window.confirm("選択中の問題を削除します。よろしいですか？");
    if (!confirmed) {
      return;
    }

    try {
      const nextQuestions = editorQuestions.filter((_, index) => index !== editorSelectedIndex);
      await saveQuestions(editorCurrentFile, nextQuestions);
      editorQuestions = nextQuestions;
      beginNewQuestionDraft();
      setEditorStatus("問題を削除しました。", false);
    } catch (error) {
      console.error("問題の削除に失敗:", error);
      const message = error instanceof Error ? error.message : "問題の削除に失敗しました。";
      setEditorStatus(message, true);
    }
  }

  function readEditorQuestionForm(): Question {
    const questionText = elements.editorQuestionInput.value.trim();
    const answerText = elements.editorAnswerInput.value.trim();
    const explanationText = elements.editorExplanationInput.value.trim();
    const choices = elements.editorChoicesInput.value
      .split(/\r?\n/)
      .map((choice) => choice.trim())
      .filter((choice, index, source) => choice.length > 0 && source.indexOf(choice) === index);
    const tags = elements.editorTagsInput.value
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag, index, source) => tag.length > 0 && source.indexOf(tag) === index);

    if (!questionText) {
      throw new Error("問題文を入力してください。");
    }
    if (choices.length < 4) {
      throw new Error("選択肢は 4 件以上入力してください。");
    }
    if (!answerText) {
      throw new Error("正解を入力してください。");
    }
    if (!choices.includes(answerText)) {
      throw new Error("正解は選択肢の中に含めてください。");
    }
    if (!explanationText) {
      throw new Error("解説を入力してください。");
    }

    return {
      question: questionText,
      choices,
      answer: answerText,
      explanation: explanationText,
      tags,
    };
  }

  function setEditorStatus(message: string, isError: boolean) {
    elements.editorStatusMessage.textContent = message;
    elements.editorStatusMessage.classList.toggle("is-error", isError);
  }

  function setCategoryActionStatus(message: string, isError: boolean) {
    elements.categoryActionStatus.textContent = message;
    elements.categoryActionStatus.classList.remove("hidden");
    elements.categoryActionStatus.classList.toggle("is-error", isError);
  }

  function setStorageActionStatus(message: string, isError: boolean) {
    elements.storageActionStatus.textContent = message;
    elements.storageActionStatus.classList.remove("hidden");
    elements.storageActionStatus.classList.toggle("is-error", isError);
  }

  return {
    init,
    handleOpenEditor,
  };
}