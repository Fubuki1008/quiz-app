// アプリ全体の初期化と DOM 要素の組み立てを管理
import {
  type CategoryAccuracyElements,
  type DashboardElements,
  type ExplanationElements,
  type ResultTabElements,
  type WeakTagAnalysisElements,
} from "./analytics.js";
import { registerQuizEvents } from "./quiz-events.js";
import { createQuestionEditor } from "./question-editor.js";
import {
  createQuizSession,
  type QuizSessionElements,
} from "./quiz-session.js";
import { type PracticalQuizElements } from "./practical-quiz.js";
import { type StartModeElements } from "./quiz-start.js";

const startScreen = document.getElementById("startScreen") as HTMLElement;
const backToStartButton = document.getElementById("backToStartButton") as HTMLButtonElement;
const startCategoryButtons = document.getElementById("startCategoryButtons") as HTMLElement;
const practicalCategoryButtons = document.getElementById(
  "practicalCategoryButtons"
) as HTMLElement;
const showKnowledgeModeButton = document.getElementById(
  "showKnowledgeModeButton"
) as HTMLButtonElement;
const showPracticalModeButton = document.getElementById(
  "showPracticalModeButton"
) as HTMLButtonElement;
const knowledgeStartPanel = document.getElementById("knowledgeStartPanel") as HTMLElement;
const practicalStartPanel = document.getElementById("practicalStartPanel") as HTMLElement;
const quizContainer = document.getElementById("quizContainer") as HTMLElement;
const knowledgeWorkspace = document.getElementById("knowledgeWorkspace") as HTMLElement;
const practicalWorkspace = document.getElementById("practicalWorkspace") as HTMLElement;
const questionEl = document.getElementById("question") as HTMLElement;
const choicesEl = document.getElementById("choices") as HTMLElement;
const practicalQuestionText = document.getElementById("practicalQuestionText") as HTMLElement;
const practicalInputLabel = document.getElementById("practicalInputLabel") as HTMLElement;
const practicalCodeTemplate = document.getElementById("practicalCodeTemplate") as HTMLElement;
const practicalAnswerInput = document.getElementById(
  "practicalAnswerInput"
) as HTMLTextAreaElement;
const practicalSubmitButton = document.getElementById(
  "practicalSubmitButton"
) as HTMLButtonElement;
const practicalPreviewFrame = document.getElementById(
  "practicalPreviewFrame"
) as HTMLIFrameElement;
const practicalPreviewStatus = document.getElementById(
  "practicalPreviewStatus"
) as HTMLElement;
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

const startModeElements: StartModeElements = {
  showKnowledgeModeButton,
  showPracticalModeButton,
  knowledgeStartPanel,
  practicalStartPanel,
  quizContainer,
  quizTitle,
  startCategoryButtons,
  practicalCategoryButtons,
};

const practicalQuizElements: PracticalQuizElements = {
  knowledgeWorkspace,
  practicalWorkspace,
  practicalQuestionText,
  practicalInputLabel,
  practicalCodeTemplate,
  practicalAnswerInput,
  practicalPreviewFrame,
  practicalPreviewStatus,
};

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

const quizSessionElements: QuizSessionElements = {
  startScreen,
  quizContainer,
  knowledgeWorkspace,
  practicalWorkspace,
  questionEl,
  choicesEl,
  scoreEl,
  popup,
  finalMessageEl,
  finalScoreEl,
  progressEl,
  quizTitle,
  wrongNoteText,
  retryWrongButton,
  practicalAnswerInput,
  startCategoryButtons,
};

const session = createQuizSession({
  elements: quizSessionElements,
  startModeElements,
  practicalQuizElements,
  resultTabElements,
  explanationElements,
  categoryAccuracyElements,
  dashboardElements,
  weakTagElements,
  questionEditor,
});

quizContainer.classList.add("hidden");
popup.classList.add("hidden");

registerQuizEvents(
  {
    backToStartButton,
    showKnowledgeModeButton,
    showPracticalModeButton,
    practicalSubmitButton,
    practicalAnswerInput,
    copyNoteButton,
    downloadNoteButton,
    retryWrongButton,
    retryAllButton,
    resetStatsButton,
  },
  resultTabElements,
  weakTagElements,
  {
    onReturnToStart: () => session.returnToStartScreen(),
    onSetStartMode: (mode) => session.setStartMode(mode),
    onSubmitPracticalAnswer: () => session.submitPracticalAnswer(),
    onSyncPracticalPreview: () => session.syncPracticalAnswerPreview(),
    onStartReviewMode: () => session.startReviewMode(),
    onRetryAll: () => session.retryAll(),
    onRefreshWeakTagAnalysis: () => session.refreshWeakTagAnalysis(),
    onResetStats: () => session.resetStats(),
    onCopyWrongNote: () => session.copyWrongNote(),
    onDownloadWrongNote: () => session.downloadWrongNote(),
    onCategoriesChanged: (categories) => session.handleCategoriesChanged(categories),
  }
);

void session.initializeApp();

