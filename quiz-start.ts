// 開始画面のモード切替とカテゴリーボタン描画
import { CategoryDefinition, QuizMode } from "./types.js";

export type StartModeElements = {
  showKnowledgeModeButton: HTMLButtonElement;
  showPracticalModeButton: HTMLButtonElement;
  knowledgeStartPanel: HTMLElement;
  practicalStartPanel: HTMLElement;
  quizContainer: HTMLElement;
  quizTitle: HTMLElement;
  startCategoryButtons: HTMLElement;
  practicalCategoryButtons: HTMLElement;
};

export function buildCategoryLabelMap(
  categories: CategoryDefinition[],
  practicalCategories: CategoryDefinition[]
): Record<string, string> {
  return Object.fromEntries(
    [...categories, ...practicalCategories].map((category) => [category.fileName, category.label])
  );
}

export function updateStartModeView(elements: StartModeElements, mode: QuizMode) {
  elements.showKnowledgeModeButton.classList.toggle("active", mode === "knowledge");
  elements.showPracticalModeButton.classList.toggle("active", mode === "practical");
  elements.knowledgeStartPanel.classList.toggle("hidden", mode !== "knowledge");
  elements.practicalStartPanel.classList.toggle("hidden", mode !== "practical");

  if (!elements.quizContainer.classList.contains("hidden")) {
    return;
  }

  elements.quizTitle.textContent =
    mode === "knowledge" ? "知識問題を選択してください" : "実技問題を選択してください";
}

export function renderStartCategoryButtons(
  elements: StartModeElements,
  categories: CategoryDefinition[],
  practicalCategories: CategoryDefinition[],
  onKnowledgeSelect: (category: CategoryDefinition) => void,
  onPracticalSelect: (category: CategoryDefinition) => void
) {
  renderKnowledgeCategoryButtons(elements.startCategoryButtons, categories, onKnowledgeSelect);
  renderPracticalCategoryButtons(
    elements.practicalCategoryButtons,
    practicalCategories,
    onPracticalSelect
  );
}

function renderKnowledgeCategoryButtons(
  container: HTMLElement,
  categories: CategoryDefinition[],
  onSelect: (category: CategoryDefinition) => void
) {
  container.innerHTML = "";

  if (categories.length === 0) {
    const message = document.createElement("p");
    message.textContent = "問題種別がありません。管理画面から追加してください。";
    container.appendChild(message);
    return;
  }

  categories.forEach((category) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = `${category.label}クイズ`;
    button.onclick = () => onSelect(category);
    container.appendChild(button);
  });
}

function renderPracticalCategoryButtons(
  container: HTMLElement,
  categories: CategoryDefinition[],
  onSelect: (category: CategoryDefinition) => void
) {
  container.innerHTML = "";

  categories.forEach((category) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = `${category.label}実技`;
    button.onclick = () => onSelect(category);
    container.appendChild(button);
  });
}
