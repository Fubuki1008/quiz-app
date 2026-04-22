// 実技問題の画面表示、入力補助、プレビュー更新
import { escapeHtml, renderMarkedText } from "./text-format.js";
import { isPracticalQuestion } from "./practical-grader.js";
import { PracticalLanguage, Question } from "./types.js";

export type PracticalQuizElements = {
  knowledgeWorkspace: HTMLElement;
  practicalWorkspace: HTMLElement;
  practicalQuestionText: HTMLElement;
  practicalInputLabel: HTMLElement;
  practicalCodeTemplate: HTMLElement;
  practicalAnswerInput: HTMLTextAreaElement;
  practicalPreviewFrame: HTMLIFrameElement;
  practicalPreviewStatus: HTMLElement;
};

export function showPracticalQuestion(
  elements: PracticalQuizElements,
  currentQuestion: Question
) {
  elements.knowledgeWorkspace.classList.add("hidden");
  elements.practicalWorkspace.classList.remove("hidden");
  elements.practicalQuestionText.innerHTML = renderMarkedText(currentQuestion.question);
  elements.practicalInputLabel.textContent = currentQuestion.inputLabel ?? "コードを入力";
  elements.practicalAnswerInput.placeholder =
    currentQuestion.inputPlaceholder ?? getPracticalInputPlaceholder(currentQuestion);
  elements.practicalAnswerInput.value = "";
  elements.practicalPreviewStatus.textContent = `正しい${formatPracticalLanguage(
    currentQuestion.practicalLanguage
  )} を入力するとプレビューに反映されます`;
  renderPracticalCodeTemplate(elements.practicalCodeTemplate, currentQuestion, "");
  updatePracticalPreview(elements.practicalPreviewFrame, currentQuestion, "");
}

export function syncPracticalPreview(
  elements: Pick<
    PracticalQuizElements,
    "practicalCodeTemplate" | "practicalAnswerInput" | "practicalPreviewFrame"
  >,
  currentQuestion: Question | undefined
) {
  if (!isPracticalQuestion(currentQuestion)) {
    return;
  }

  const input = elements.practicalAnswerInput.value;
  renderPracticalCodeTemplate(elements.practicalCodeTemplate, currentQuestion, input);
  updatePracticalPreview(elements.practicalPreviewFrame, currentQuestion, input);
}

function renderPracticalCodeTemplate(container: HTMLElement, question: Question, input: string) {
  const template = question.codeTemplate ?? "{{input}}";
  const marker = "__PRACTICAL_INPUT__";
  const hasInput = input.trim().length > 0;
  const displayValue = hasInput ? input : getPracticalTemplatePlaceholder(question);
  const escapedTemplate = escapeHtml(template.replace(/\{\{input\}\}/g, marker));

  container.innerHTML = escapedTemplate.replace(
    marker,
    `<span class="practical-code-token">${escapeHtml(displayValue)}</span>`
  );
}

function updatePracticalPreview(frame: HTMLIFrameElement, question: Question, input: string) {
  const template = question.previewTemplate ?? "{{input}}";
  frame.srcdoc = template.replace(/\{\{input\}\}/g, input);
}

function formatPracticalLanguage(language?: PracticalLanguage): string {
  if (language === "css") {
    return "CSS";
  }

  return "HTML";
}

function getPracticalInputPlaceholder(question: Question): string {
  if (question.practicalLanguage === "css") {
    return "例: プロパティ名: (値);";
  }

  return "例: <h1>見出し</h1>";
}

function getPracticalTemplatePlaceholder(question: Question): string {
  if (question.practicalLanguage === "css") {
    return "/* ここにCSSを入力 */";
  }

  return "<!-- ここにHTMLを入力 -->";
}
