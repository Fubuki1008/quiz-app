import { loadCategories, loadQuestions } from "./api.js";
import {
  CategoryAccuracyElements,
  DashboardElements,
  ExplanationElements,
  ResultTabElements,
  WeakTagAnalysisElements,
  createWrongNote,
  extractTags,
  renderCategoryAccuracy,
  renderExplanationList,
  renderLearningDashboard,
  renderWeakTagAnalysis,
  resetStoredStats,
  setActiveResultTab,
  setActiveWeakTagTab,
  updateCategoryStats,
  updateTimeStats,
  updateWeakTagStats,
} from "./analytics.js";
import { QUESTION_COUNT } from "./constants.js";
import { createQuestionEditor } from "./question-editor.js";
import { createChoiceSet, shuffleArray } from "./quiz-core.js";
import { renderMarkedText } from "./text-format.js";
import { AnswerRecord, CategoryDefinition, Question, QuestionFileName } from "./types.js";

let questions: Question[] = [];
let selectedQuestions: Question[] = [];
let correctList: boolean[] = [];
let answerRecords: AnswerRecord[] = [];
let currentQuestionIndex = 0;
let score = 0;
let categories: CategoryDefinition[] = [];
let categoryLabelMap: Record<string, string> = {};
let currentCategory: QuestionFileName = "";
let reviewMode = false;
let questionStartAt = 0;
let popupClass = "";

const startScreen = document.getElementById("startScreen") as HTMLElement;
const backToStartButton = document.getElementById("backToStartButton") as HTMLButtonElement;
const startCategoryButtons = document.getElementById("startCategoryButtons") as HTMLElement;
const quizContainer = document.getElementById("quizContainer") as HTMLElement;
const questionEl = document.getElementById("question") as HTMLElement;
const choicesEl = document.getElementById("choices") as HTMLElement;
const scoreEl = document.getElementById("score") as HTMLElement;
const popup = document.getElementById("resultPopup") as HTMLElement;
const finalMessageEl = document.getElementById("finalMessage") as HTMLElement;
const finalScoreEl = document.getElementById("finalScore") as HTMLElement;
const progressEl = document.getElementById("progress") as HTMLElement;
const quizTitle = document.getElementById("quizTitle") as HTMLElement;
const wrongNoteText = document.getElementById("wrongNoteText") as HTMLTextAreaElement;
const copyNoteButton = document.getElementById("copyNoteButton") as HTMLButtonElement;
const downloadNoteButton = document.getElementById("downloadNoteButton") as HTMLButtonElement;
const retryWrongButton = document.getElementById("retryWrongButton") as HTMLButtonElement;
const retryAllButton = document.getElementById("retryAllButton") as HTMLButtonElement;
const resetStatsButton = document.getElementById("resetStatsButton") as HTMLButtonElement;

const resultTabElements: ResultTabElements = {
  tabAnalyticsButton: document.getElementById("tabAnalyticsButton") as HTMLButtonElement,
  tabExplanationButton: document.getElementById("tabExplanationButton") as HTMLButtonElement,
  tabWrongNoteButton: document.getElementById("tabWrongNoteButton") as HTMLButtonElement,
  analyticsPanel: document.getElementById("analyticsPanel") as HTMLElement,
  explanationPanel: document.getElementById("explanationTabPanel") as HTMLElement,
  wrongNotePanel: document.getElementById("wrongNotePanel") as HTMLElement,
};

const explanationElements: ExplanationElements = {
  explanationList: document.getElementById("explanationList") as HTMLElement,
  explanationItems: document.getElementById("explanationItems") as HTMLElement,
};

const categoryAccuracyElements: CategoryAccuracyElements = {
  categoryAccuracyList: document.getElementById("categoryAccuracyList") as HTMLElement,
};

const dashboardElements: DashboardElements = {
  dashboardSummary: document.getElementById("dashboardSummary") as HTMLElement,
  averageTimeChart: document.getElementById("averageTimeChart") as HTMLElement,
  masterySummary: document.getElementById("masterySummary") as HTMLElement,
  masteryLevelList: document.getElementById("masteryLevelList") as HTMLElement,
};

const weakTagElements: WeakTagAnalysisElements = {
  weakTagList: document.getElementById("weakTagList") as HTMLElement,
  currentWeakTagList: document.getElementById("currentWeakTagList") as HTMLElement,
  weakTagSortSelect: document.getElementById("weakTagSortSelect") as HTMLSelectElement,
  collapsePerfectTagsToggle: document.getElementById(
    "collapsePerfectTagsToggle"
  ) as HTMLInputElement,
  perfectTagSummary: document.getElementById("perfectTagSummary") as HTMLElement,
  currentPerfectTagSummary: document.getElementById("currentPerfectTagSummary") as HTMLElement,
  weakTagHistoryTabButton: document.getElementById(
    "weakTagHistoryTabButton"
  ) as HTMLButtonElement,
  weakTagCurrentTabButton: document.getElementById(
    "weakTagCurrentTabButton"
  ) as HTMLButtonElement,
  weakTagHistoryPanel: document.getElementById("weakTagHistoryPanel") as HTMLElement,
  weakTagCurrentPanel: document.getElementById("weakTagCurrentPanel") as HTMLElement,
};

const questionEditor = createQuestionEditor({
  editorEntry: document.getElementById("editorEntry") as HTMLElement,
  editorEntryNote: document.getElementById("editorEntryNote") as HTMLElement,
  openEditorButton: document.getElementById("openEditorButton") as HTMLButtonElement,
  adminLoginPanel: document.getElementById("adminLoginPanel") as HTMLElement,
  adminLoginStatus: document.getElementById("adminLoginStatus") as HTMLElement,
  adminUsernameInput: document.getElementById("adminUsernameInput") as HTMLInputElement,
  adminPasswordInput: document.getElementById("adminPasswordInput") as HTMLInputElement,
  adminLoginButton: document.getElementById("adminLoginButton") as HTMLButtonElement,
  adminLoginCancelButton: document.getElementById(
    "adminLoginCancelButton"
  ) as HTMLButtonElement,
  questionEditorPanel: document.getElementById("questionEditorPanel") as HTMLElement,
  storageHelpPanel: document.getElementById("storageHelpPanel") as HTMLElement,
  userDataPathText: document.getElementById("userDataPathText") as HTMLElement,
  questionDataPathText: document.getElementById("questionDataPathText") as HTMLElement,
  storageActionStatus: document.getElementById("storageActionStatus") as HTMLElement,
  clearUserDataButton: document.getElementById("clearUserDataButton") as HTMLButtonElement,
  logoutEditorButton: document.getElementById("logoutEditorButton") as HTMLButtonElement,
  closeEditorButton: document.getElementById("closeEditorButton") as HTMLButtonElement,
  editorCategorySelect: document.getElementById("editorCategorySelect") as HTMLSelectElement,
  newCategoryNameInput: document.getElementById("newCategoryNameInput") as HTMLInputElement,
  addCategoryButton: document.getElementById("addCategoryButton") as HTMLButtonElement,
  renameCategoryNameInput: document.getElementById("renameCategoryNameInput") as HTMLInputElement,
  renameCategoryButton: document.getElementById("renameCategoryButton") as HTMLButtonElement,
  deleteCategoryButton: document.getElementById("deleteCategoryButton") as HTMLButtonElement,
  categoryActionStatus: document.getElementById("categoryActionStatus") as HTMLElement,
  editorStatusMessage: document.getElementById("editorStatusMessage") as HTMLElement,
  editorQuestionList: document.getElementById("editorQuestionList") as HTMLElement,
  editorFormTitle: document.getElementById("editorFormTitle") as HTMLElement,
  editorQuestionInput: document.getElementById("editorQuestionInput") as HTMLTextAreaElement,
  editorChoicesInput: document.getElementById("editorChoicesInput") as HTMLTextAreaElement,
  editorAnswerInput: document.getElementById("editorAnswerInput") as HTMLInputElement,
  editorTagsInput: document.getElementById("editorTagsInput") as HTMLInputElement,
  editorExplanationInput: document.getElementById(
    "editorExplanationInput"
  ) as HTMLTextAreaElement,
  newQuestionButton: document.getElementById("newQuestionButton") as HTMLButtonElement,
  saveQuestionButton: document.getElementById("saveQuestionButton") as HTMLButtonElement,
  deleteQuestionButton: document.getElementById("deleteQuestionButton") as HTMLButtonElement,
});

quizContainer.classList.add("hidden");
popup.classList.add("hidden");

backToStartButton.onclick = () => returnToStartScreen();

resultTabElements.tabAnalyticsButton.onclick = () =>
  setActiveResultTab(resultTabElements, "analytics");
resultTabElements.tabExplanationButton.onclick = () =>
  setActiveResultTab(resultTabElements, "explanation");
resultTabElements.tabWrongNoteButton.onclick = () =>
  setActiveResultTab(resultTabElements, "wrongNote");
weakTagElements.weakTagHistoryTabButton.onclick = () =>
  setActiveWeakTagTab(weakTagElements, "history");
weakTagElements.weakTagCurrentTabButton.onclick = () =>
  setActiveWeakTagTab(weakTagElements, "current");
weakTagElements.weakTagSortSelect.onchange = () =>
  renderWeakTagAnalysis(weakTagElements, answerRecords);
weakTagElements.collapsePerfectTagsToggle.onchange = () =>
  renderWeakTagAnalysis(weakTagElements, answerRecords);

setActiveWeakTagTab(weakTagElements, "current");
window.addEventListener("quiz-categories-changed", (event) => {
  const customEvent = event as CustomEvent<{ categories: CategoryDefinition[] }>;
  applyCategories(customEvent.detail.categories);
});

void initializeApp();

retryAllButton.onclick = () => {
  location.reload();
};

retryWrongButton.onclick = () => {
  startReviewMode();
};

resetStatsButton.onclick = () => {
  const confirmed = window.confirm(
    "分野別正答率の累積履歴をリセットします。よろしいですか？"
  );
  if (!confirmed) {
    return;
  }

  resetStoredStats();

  const currentTotal = selectedQuestions.length;
  renderCategoryAccuracy(
    categoryAccuracyElements,
    categoryLabelMap,
    currentCategory,
    score,
    currentTotal
  );
  renderLearningDashboard(dashboardElements, answerRecords);
  renderWeakTagAnalysis(weakTagElements, answerRecords);
  resetStatsButton.textContent = "履歴をリセットしました";

  setTimeout(() => {
    resetStatsButton.textContent = "履歴リセット";
  }, 1400);
};

copyNoteButton.onclick = async () => {
  if (!wrongNoteText.value.trim()) {
    return;
  }

  try {
    await navigator.clipboard.writeText(wrongNoteText.value);
    copyNoteButton.textContent = "コピー完了";
    setTimeout(() => {
      copyNoteButton.textContent = "ノートをコピー";
    }, 1200);
  } catch (error) {
    console.error("コピーに失敗:", error);
  }
};

downloadNoteButton.onclick = () => {
  if (!wrongNoteText.value.trim()) {
    return;
  }

  const categoryLabel = getCategoryLabel(currentCategory) ?? "Quiz";
  const now = new Date();
  const dateText = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(now.getDate()).padStart(2, "0")}`;
  const blob = new Blob([wrongNoteText.value], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `wrong-note-${categoryLabel}-${dateText}.md`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

async function initializeApp() {
  try {
    const loadedCategories = await loadCategories();
    applyCategories(loadedCategories);
  } catch (error) {
    console.error("問題種別の読み込みに失敗:", error);
    startCategoryButtons.innerHTML = "<p>問題種別の読み込みに失敗しました。</p>";
  }

  await questionEditor.init();
}

function applyCategories(nextCategories: CategoryDefinition[]) {
  categories = nextCategories;
  categoryLabelMap = Object.fromEntries(
    categories.map((category) => [category.fileName, category.label])
  );

  if (!currentCategory || !categoryLabelMap[currentCategory]) {
    currentCategory = categories[0]?.fileName ?? "";
  }

  renderStartCategoryButtons();
}

function renderStartCategoryButtons() {
  startCategoryButtons.innerHTML = "";

  if (categories.length === 0) {
    const message = document.createElement("p");
    message.textContent = "問題種別がありません。管理画面から追加してください。";
    startCategoryButtons.appendChild(message);
    return;
  }

  categories.forEach((category) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = `${category.label}クイズ`;
    button.onclick = () => startQuiz(category.fileName, `${category.label}クイズ`);
    startCategoryButtons.appendChild(button);
  });
}

function getCategoryLabel(fileName: QuestionFileName): string {
  return categoryLabelMap[fileName] ?? fileName;
}

function startQuiz(categoryFile: QuestionFileName, quizTitleText: string) {
  currentCategory = categoryFile;
  reviewMode = false;
  score = 0;
  currentQuestionIndex = 0;
  correctList = [];
  answerRecords = [];

  scoreEl.textContent = `スコア: ${score}`;
  startScreen.classList.add("hidden");
  quizContainer.classList.remove("hidden");
  popup.className = "popup hidden";

  quizTitle.textContent = quizTitleText;
  void fetchQuestions();
}

function returnToStartScreen() {
  questions = [];
  selectedQuestions = [];
  correctList = [];
  answerRecords = [];
  currentQuestionIndex = 0;
  score = 0;
  reviewMode = false;
  popupClass = "";

  scoreEl.textContent = "スコア: 0";
  progressEl.textContent = `第1問 / ${QUESTION_COUNT}問`;
  choicesEl.innerHTML = "";
  questionEl.innerHTML = "";
  wrongNoteText.value = "";
  popup.className = "popup hidden";
  quizContainer.classList.add("hidden");
  startScreen.classList.remove("hidden");
  quizTitle.textContent = "クイズを選択してください";
}

async function fetchQuestions() {
  try {
    const data = await loadQuestions(currentCategory);
    questions = data.map((question) => ({
      ...question,
      choices: createChoiceSet(question.choices, question.answer),
    }));
    selectedQuestions = shuffleArray(questions).slice(0, QUESTION_COUNT);
    showQuestion();
  } catch (error) {
    console.error("データ読み込み失敗:", error);
  }
}

function showQuestion() {
  if (currentQuestionIndex >= selectedQuestions.length) {
    showFinalResult();
    return;
  }

  const modeLabel = reviewMode ? "（復習）" : "";
  progressEl.textContent = `第${currentQuestionIndex + 1}問 / ${
    selectedQuestions.length
  }問 ${modeLabel}`;

  const currentQuestion = selectedQuestions[currentQuestionIndex];
  questionEl.innerHTML = renderMarkedText(currentQuestion.question);

  choicesEl.innerHTML = "";
  currentQuestion.choices.forEach((choice) => {
    const button = document.createElement("button");
    button.textContent = choice;
    button.onclick = () => checkAnswer(choice);
    choicesEl.appendChild(button);
  });

  questionStartAt = performance.now();
}

function checkAnswer(selected: string) {
  const currentQuestion = selectedQuestions[currentQuestionIndex];
  const isCorrect = selected === currentQuestion.answer;

  correctList[currentQuestionIndex] = isCorrect;
  answerRecords.push({
    question: currentQuestion,
    selected,
    isCorrect,
    tags: extractTags(currentQuestion, currentCategory, categoryLabelMap),
    elapsedMs: Math.max(0, performance.now() - questionStartAt),
  });

  if (isCorrect) {
    score++;
    scoreEl.textContent = `スコア: ${score}`;
  }

  currentQuestionIndex++;
  showQuestion();
}

function showFinalResult() {
  const total = selectedQuestions.length;
  const wrongRecords = answerRecords.filter((record) => !record.isCorrect);

  if (!reviewMode) {
    updateCategoryStats(currentCategory, score, total);
    updateWeakTagStats(answerRecords);
    updateTimeStats(answerRecords);
  }

  renderExplanationList(explanationElements, selectedQuestions, correctList, answerRecords);
  renderCategoryAccuracy(categoryAccuracyElements, categoryLabelMap, currentCategory, score, total);
  renderLearningDashboard(dashboardElements, answerRecords);
  renderWeakTagAnalysis(weakTagElements, answerRecords);
  wrongNoteText.value = createWrongNote(
    wrongRecords,
    score,
    total,
    currentCategory,
    categoryLabelMap
  );
  retryWrongButton.style.display = wrongRecords.length > 0 ? "inline-block" : "none";

  if (reviewMode) {
    finalMessageEl.textContent =
      wrongRecords.length === 0
        ? "復習クリア！苦手問題を克服できました"
        : "復習モード終了。もう一度復習できます";
  } else if (score <= 2) {
    finalMessageEl.textContent = "出直してこい！";
    popupClass = "low-score";
  } else if (score <= 4) {
    finalMessageEl.textContent = "う〜ん・・・";
    popupClass = "mid-score";
  } else if (score <= 6) {
    finalMessageEl.textContent = "及第点";
    popupClass = "pass-score";
  } else if (score <= 8) {
    finalMessageEl.textContent = "良い感じ！";
    popupClass = "pass-score";
  } else {
    finalMessageEl.textContent = "素晴らしい！完璧！";
    popupClass = "high-score";
  }

  if (reviewMode && wrongRecords.length === 0) {
    popupClass = "high-score";
  }

  finalScoreEl.textContent = `最終スコア: ${score} / ${total}`;
  popup.className = `popup visible ${popupClass}`;
  setActiveResultTab(resultTabElements, "analytics");
  setActiveWeakTagTab(weakTagElements, "current");
}

function startReviewMode() {
  const wrongQuestions = answerRecords
    .filter((record) => !record.isCorrect)
    .map((record) => record.question);

  if (wrongQuestions.length === 0) {
    return;
  }

  reviewMode = true;
  selectedQuestions = shuffleArray(wrongQuestions);
  currentQuestionIndex = 0;
  score = 0;
  correctList = [];
  answerRecords = [];
  scoreEl.textContent = `スコア: ${score}`;

  popup.className = "popup hidden";
  quizContainer.classList.remove("hidden");
  quizTitle.textContent = `${getCategoryLabel(currentCategory)} 復習モード`;

  showQuestion();
}