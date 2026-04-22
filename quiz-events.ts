import {
  setActiveResultTab,
  setActiveWeakTagTab,
  type ResultTabElements,
  type WeakTagAnalysisElements,
} from "./analytics.js";
import { CategoryDefinition, QuizMode } from "./types.js";

export type QuizEventElements = {
  backToStartButton: HTMLButtonElement;
  showKnowledgeModeButton: HTMLButtonElement;
  showPracticalModeButton: HTMLButtonElement;
  practicalSubmitButton: HTMLButtonElement;
  practicalAnswerInput: HTMLTextAreaElement;
  copyNoteButton: HTMLButtonElement;
  downloadNoteButton: HTMLButtonElement;
  retryWrongButton: HTMLButtonElement;
  retryAllButton: HTMLButtonElement;
  resetStatsButton: HTMLButtonElement;
};

export type QuizEventHandlers = {
  onReturnToStart: () => void;
  onSetStartMode: (mode: QuizMode) => void;
  onSubmitPracticalAnswer: () => void;
  onSyncPracticalPreview: () => void;
  onStartReviewMode: () => void;
  onRetryAll: () => void;
  onRefreshWeakTagAnalysis: () => void;
  onResetStats: () => boolean;
  onCopyWrongNote: () => void | Promise<void>;
  onDownloadWrongNote: () => void;
  onCategoriesChanged: (categories: CategoryDefinition[]) => void;
};

export function registerQuizEvents(
  elements: QuizEventElements,
  resultTabElements: ResultTabElements,
  weakTagElements: WeakTagAnalysisElements,
  handlers: QuizEventHandlers
) {
  elements.backToStartButton.onclick = () => handlers.onReturnToStart();
  elements.showKnowledgeModeButton.onclick = () => handlers.onSetStartMode("knowledge");
  elements.showPracticalModeButton.onclick = () => handlers.onSetStartMode("practical");
  elements.practicalSubmitButton.onclick = () => handlers.onSubmitPracticalAnswer();
  elements.practicalAnswerInput.oninput = () => handlers.onSyncPracticalPreview();

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
  weakTagElements.weakTagSortSelect.onchange = () => handlers.onRefreshWeakTagAnalysis();
  weakTagElements.collapsePerfectTagsToggle.onchange = () => handlers.onRefreshWeakTagAnalysis();

  elements.copyNoteButton.onclick = () => {
    void handlers.onCopyWrongNote();
    elements.copyNoteButton.textContent = "コピー完了";
    window.setTimeout(() => {
      elements.copyNoteButton.textContent = "ノートをコピー";
    }, 1200);
  };
  elements.downloadNoteButton.onclick = () => handlers.onDownloadWrongNote();
  elements.retryWrongButton.onclick = () => handlers.onStartReviewMode();
  elements.retryAllButton.onclick = () => handlers.onRetryAll();
  elements.resetStatsButton.onclick = () => {
    const didReset = handlers.onResetStats();
    if (!didReset) {
      return;
    }

    elements.resetStatsButton.textContent = "履歴をリセットしました";
    window.setTimeout(() => {
      elements.resetStatsButton.textContent = "履歴リセット";
    }, 1400);
  };

  setActiveWeakTagTab(weakTagElements, "current");
  window.addEventListener("quiz-categories-changed", (event) => {
    const customEvent = event as CustomEvent<{ categories: CategoryDefinition[] }>;
    handlers.onCategoriesChanged(customEvent.detail.categories);
  });
}
