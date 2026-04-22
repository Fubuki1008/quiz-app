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
import { PRACTICAL_CATEGORIES, loadPracticalQuestions } from "./practical-questions.js";
import {
  gradePracticalAnswer,
  isPracticalQuestion,
  showPracticalQuestion,
  syncPracticalPreview,
  type PracticalQuizElements,
} from "./practical-quiz.js";
import { createChoiceSet, shuffleArray } from "./quiz-core.js";
import {
  buildCategoryLabelMap,
  renderStartCategoryButtons as renderStartCategoryButtonsUI,
  type StartModeElements,
  updateStartModeView,
} from "./quiz-start.js";
import { renderMarkedText } from "./text-format.js";
import {
  AnswerRecord,
  CategoryDefinition,
  Question,
  QuestionFileName,
  QuizMode,
} from "./types.js";

export type QuizSessionElements = {
  startScreen: HTMLElement;
  quizContainer: HTMLElement;
  knowledgeWorkspace: HTMLElement;
  practicalWorkspace: HTMLElement;
  questionEl: HTMLElement;
  choicesEl: HTMLElement;
  scoreEl: HTMLElement;
  popup: HTMLElement;
  finalMessageEl: HTMLElement;
  finalScoreEl: HTMLElement;
  progressEl: HTMLElement;
  quizTitle: HTMLElement;
  wrongNoteText: HTMLTextAreaElement;
  retryWrongButton: HTMLButtonElement;
  practicalAnswerInput: HTMLTextAreaElement;
  startCategoryButtons: HTMLElement;
};

export type QuizSessionDependencies = {
  elements: QuizSessionElements;
  startModeElements: StartModeElements;
  practicalQuizElements: PracticalQuizElements;
  resultTabElements: ResultTabElements;
  explanationElements: ExplanationElements;
  categoryAccuracyElements: CategoryAccuracyElements;
  dashboardElements: DashboardElements;
  weakTagElements: WeakTagAnalysisElements;
  questionEditor: { init: () => Promise<void> };
};

export function createQuizSession({
  elements,
  startModeElements,
  practicalQuizElements,
  resultTabElements,
  explanationElements,
  categoryAccuracyElements,
  dashboardElements,
  weakTagElements,
  questionEditor,
}: QuizSessionDependencies) {
  let questions: Question[] = [];
  let selectedQuestions: Question[] = [];
  let correctList: boolean[] = [];
  let answerRecords: AnswerRecord[] = [];
  let currentQuestionIndex = 0;
  let score = 0;
  let categories: CategoryDefinition[] = [];
  let categoryLabelMap: Record<string, string> = {};
  let currentCategory: QuestionFileName = "";
  let currentMode: QuizMode = "knowledge";
  let reviewMode = false;
  let questionStartAt = 0;
  let popupClass = "";

  const practicalCategories = PRACTICAL_CATEGORIES;

  async function initializeApp() {
    try {
      const loadedCategories = await loadCategories();
      applyCategories(loadedCategories);
    } catch (error) {
      console.error("問題種別の読み込みに失敗:", error);
      applyCategories([]);
      elements.startCategoryButtons.innerHTML = "<p>知識問題の読み込みに失敗しました。</p>";
    }

    setStartMode("knowledge");
    await questionEditor.init();
  }

  function handleCategoriesChanged(nextCategories: CategoryDefinition[]) {
    applyCategories(nextCategories);
  }

  function applyCategories(nextCategories: CategoryDefinition[]) {
    categories = nextCategories;
    categoryLabelMap = buildCategoryLabelMap(categories, practicalCategories);

    const modeCategories = getCategoriesForMode(currentMode);
    if (!currentCategory || !categoryLabelMap[currentCategory]) {
      currentCategory = modeCategories[0]?.fileName ?? "";
    }

    renderStartCategoryButtons();
  }

  function getCategoriesForMode(mode: QuizMode): CategoryDefinition[] {
    return mode === "knowledge" ? categories : practicalCategories;
  }

  function setStartMode(mode: QuizMode) {
    currentMode = mode;
    updateStartModeView(startModeElements, mode);

    const modeCategories = getCategoriesForMode(mode);
    if (!modeCategories.some((category) => category.fileName === currentCategory)) {
      currentCategory = modeCategories[0]?.fileName ?? "";
    }
  }

  function renderStartCategoryButtons() {
    renderStartCategoryButtonsUI(
      startModeElements,
      categories,
      practicalCategories,
      (category) => startKnowledgeQuiz(category.fileName, `${category.label}クイズ`),
      (category) => startPracticalQuiz(category.fileName, `${category.label}実技`)
    );
  }

  function getCategoryLabel(fileName: QuestionFileName): string {
    return categoryLabelMap[fileName] ?? fileName;
  }

  function startKnowledgeQuiz(categoryFile: QuestionFileName, quizTitleText: string) {
    currentMode = "knowledge";
    startQuizSession(categoryFile, quizTitleText);
  }

  function startPracticalQuiz(categoryFile: QuestionFileName, quizTitleText: string) {
    currentMode = "practical";
    startQuizSession(categoryFile, quizTitleText);
  }

  function startQuizSession(categoryFile: QuestionFileName, quizTitleText: string) {
    currentCategory = categoryFile;
    reviewMode = false;
    score = 0;
    currentQuestionIndex = 0;
    correctList = [];
    answerRecords = [];
    popupClass = "";

    elements.scoreEl.textContent = `スコア: ${score}`;
    elements.startScreen.classList.add("hidden");
    elements.quizContainer.classList.remove("hidden");
    elements.popup.className = "popup hidden";
    elements.practicalAnswerInput.value = "";

    elements.quizTitle.textContent = quizTitleText;
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

    elements.scoreEl.textContent = "スコア: 0";
    elements.progressEl.textContent = `第1問 / ${QUESTION_COUNT}問`;
    elements.choicesEl.innerHTML = "";
    elements.questionEl.innerHTML = "";
    practicalQuizElements.practicalQuestionText.innerHTML = "";
    practicalQuizElements.practicalCodeTemplate.innerHTML = "";
    elements.practicalAnswerInput.value = "";
    practicalQuizElements.practicalPreviewFrame.srcdoc = "";
    elements.wrongNoteText.value = "";
    elements.popup.className = "popup hidden";
    elements.quizContainer.classList.add("hidden");
    elements.startScreen.classList.remove("hidden");
    elements.knowledgeWorkspace.classList.remove("hidden");
    elements.practicalWorkspace.classList.add("hidden");
    setStartMode(currentMode);
  }

  async function fetchQuestions() {
    try {
      const data =
        currentMode === "knowledge"
          ? await loadQuestions(currentCategory)
          : await loadPracticalQuestions(currentCategory);

      questions =
        currentMode === "knowledge"
          ? data.map((question: Question) => ({
              ...question,
              choices: createChoiceSet(question.choices, question.answer),
            }))
          : data;

      selectedQuestions = shuffleArray(questions).slice(
        0,
        Math.min(QUESTION_COUNT, questions.length)
      );

      if (selectedQuestions.length === 0) {
        showEmptyQuizState();
        return;
      }

      showQuestion();
    } catch (error) {
      console.error("データ読み込み失敗:", error);
      showEmptyQuizState("問題の読み込みに失敗しました。スタート画面に戻ってやり直してください。");
    }
  }

  function showEmptyQuizState(message = "出題できる問題がありません。") {
    elements.knowledgeWorkspace.classList.remove("hidden");
    elements.practicalWorkspace.classList.add("hidden");
    elements.questionEl.textContent = message;
    elements.choicesEl.innerHTML = "";
  }

  function showQuestion() {
    if (currentQuestionIndex >= selectedQuestions.length) {
      showFinalResult();
      return;
    }

    const modeLabel = reviewMode ? "（復習）" : "";
    elements.progressEl.textContent = `第${currentQuestionIndex + 1}問 / ${
      selectedQuestions.length
    }問 ${modeLabel}`;

    const currentQuestion = selectedQuestions[currentQuestionIndex];
    if (isPracticalQuestion(currentQuestion)) {
      showPracticalQuestion(practicalQuizElements, currentQuestion);
    } else {
      showKnowledgeQuestion(currentQuestion);
    }

    questionStartAt = performance.now();
  }

  function showKnowledgeQuestion(currentQuestion: Question) {
    elements.knowledgeWorkspace.classList.remove("hidden");
    elements.practicalWorkspace.classList.add("hidden");
    elements.questionEl.innerHTML = renderMarkedText(currentQuestion.question);

    elements.choicesEl.innerHTML = "";
    currentQuestion.choices.forEach((choice) => {
      const button = document.createElement("button");
      button.textContent = choice;
      button.onclick = () => checkKnowledgeAnswer(choice);
      elements.choicesEl.appendChild(button);
    });
  }

  function syncPracticalAnswerPreview() {
    syncPracticalPreview(practicalQuizElements, selectedQuestions[currentQuestionIndex]);
  }

  function submitPracticalAnswer() {
    const currentQuestion = selectedQuestions[currentQuestionIndex];
    if (!isPracticalQuestion(currentQuestion)) {
      return;
    }

    const selected = elements.practicalAnswerInput.value;
    const isCorrect = gradePracticalAnswer(currentQuestion, selected);

    recordAnswer(selected, isCorrect);
  }

  function checkKnowledgeAnswer(selected: string) {
    const currentQuestion = selectedQuestions[currentQuestionIndex];
    const isCorrect = selected === currentQuestion.answer;
    recordAnswer(selected, isCorrect);
  }

  function recordAnswer(selected: string, isCorrect: boolean) {
    const currentQuestion = selectedQuestions[currentQuestionIndex];

    correctList[currentQuestionIndex] = isCorrect;
    answerRecords.push({
      question: currentQuestion,
      selected,
      isCorrect,
      tags: extractTags(currentQuestion, currentCategory, categoryLabelMap),
      elapsedMs: Math.max(0, performance.now() - questionStartAt),
    });

    if (isCorrect) {
      score += 1;
      elements.scoreEl.textContent = `スコア: ${score}`;
    }

    currentQuestionIndex += 1;
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
    elements.wrongNoteText.value = createWrongNote(
      wrongRecords,
      score,
      total,
      currentCategory,
      categoryLabelMap
    );
    elements.retryWrongButton.style.display = wrongRecords.length > 0 ? "inline-block" : "none";

    if (reviewMode) {
      elements.finalMessageEl.textContent =
        wrongRecords.length === 0
          ? "復習クリア！苦手問題を克服できました"
          : "復習モード終了。もう一度復習できます";
    } else if (score <= 2) {
      elements.finalMessageEl.textContent = "出直してこい！";
      popupClass = "low-score";
    } else if (score <= 4) {
      elements.finalMessageEl.textContent = "う〜ん・・・";
      popupClass = "mid-score";
    } else if (score <= 6) {
      elements.finalMessageEl.textContent = "及第点";
      popupClass = "pass-score";
    } else if (score <= 8) {
      elements.finalMessageEl.textContent = "良い感じ！";
      popupClass = "pass-score";
    } else {
      elements.finalMessageEl.textContent = "素晴らしい！完璧！";
      popupClass = "high-score";
    }

    if (reviewMode && wrongRecords.length === 0) {
      popupClass = "high-score";
    }

    elements.finalScoreEl.textContent = `最終スコア: ${score} / ${total}`;
    elements.popup.className = `popup visible ${popupClass}`;
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
    elements.scoreEl.textContent = `スコア: ${score}`;

    elements.popup.className = "popup hidden";
    elements.quizContainer.classList.remove("hidden");
    elements.quizTitle.textContent = `${getCategoryLabel(currentCategory)} ${
      currentMode === "practical" ? "実技復習モード" : "復習モード"
    }`;

    showQuestion();
  }

  function refreshWeakTagAnalysis() {
    renderWeakTagAnalysis(weakTagElements, answerRecords);
  }

  function resetStats(): boolean {
    const confirmed = window.confirm(
      "分野別正答率の累積履歴をリセットします。よろしいですか？"
    );
    if (!confirmed) {
      return false;
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
    return true;
  }

  async function copyWrongNote() {
    if (!elements.wrongNoteText.value.trim()) {
      return;
    }

    try {
      await navigator.clipboard.writeText(elements.wrongNoteText.value);
    } catch (error) {
      console.error("コピーに失敗:", error);
    }
  }

  function downloadWrongNote() {
    if (!elements.wrongNoteText.value.trim()) {
      return;
    }

    const categoryLabel = getCategoryLabel(currentCategory) ?? "Quiz";
    const now = new Date();
    const dateText = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(now.getDate()).padStart(2, "0")}`;
    const blob = new Blob([elements.wrongNoteText.value], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `wrong-note-${categoryLabel}-${dateText}.md`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }

  function retryAll() {
    location.reload();
  }

  return {
    initializeApp,
    handleCategoriesChanged,
    setStartMode,
    returnToStartScreen,
    submitPracticalAnswer,
    syncPracticalAnswerPreview,
    startReviewMode,
    refreshWeakTagAnalysis,
    resetStats,
    copyWrongNote,
    downloadWrongNote,
    retryAll,
  };
}
