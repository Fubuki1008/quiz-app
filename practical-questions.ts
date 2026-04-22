// 実技問題カテゴリの定義と読み込み処理をまとめる
import { loadBundledQuestions } from "./api.js";
import { CategoryDefinition, Question, QuestionFileName } from "./types.js";

const HTML_PRACTICAL_FILE = "practical-html-questions.json";
const CSS_PRACTICAL_FILE = "practical-css-questions.json";

export const PRACTICAL_CATEGORIES: CategoryDefinition[] = [
  {
    id: "practical-html",
    label: "HTML",
    fileName: HTML_PRACTICAL_FILE,
  },
  {
    id: "practical-css",
    label: "CSS",
    fileName: CSS_PRACTICAL_FILE,
  },
];

const HTML_PREVIEW_TEMPLATE =
  "<!doctype html><html lang=\"ja\"><head><meta charset=\"UTF-8\"><style>body{font-family:sans-serif;padding:0px;line-height:1;background:#fffef8;color:#222} a{color:#0b66c3} .card{padding:0px;border:1px solid #d8d1c0;border-radius:12px;background:#fff}</style></head><body>{{input}}</body></html>";

const PRACTICAL_FILE_SET = new Set(PRACTICAL_CATEGORIES.map((category) => category.fileName));

export async function loadPracticalQuestions(fileName: QuestionFileName): Promise<Question[]> {
  if (!PRACTICAL_FILE_SET.has(fileName)) {
    return [];
  }

  const rawQuestions = await loadBundledQuestions(fileName);
  return rawQuestions.map((question) => normalizePracticalQuestion(question));
}

function normalizePracticalQuestion(question: Question): Question {
  const practicalLanguage = question.practicalLanguage ?? "html";
  const inputLabel = question.inputLabel ?? `${practicalLanguage.toUpperCase()} を入力`;
  const inputPlaceholder =
    question.inputPlaceholder ??
    (practicalLanguage === "css" ? "例: プロパティ名: (値);" : "例: <h1>見出し</h1>");

  if (practicalLanguage === "css") {
    const selector = question.practicalSelector ?? ".demo-target";
    const baseHtml = question.practicalBaseHtml ?? '<div class="demo-target">Preview</div>';

    return {
      ...question,
      questionType: "practical",
      practicalLanguage,
      choices: Array.isArray(question.choices) ? [...question.choices] : [],
      acceptedAnswers: question.acceptedAnswers ? [...question.acceptedAnswers] : undefined,
      cssRequirements: question.cssRequirements?.map((requirement) => ({
        ...requirement,
        value: Array.isArray(requirement.value) ? [...requirement.value] : requirement.value,
      })),
      htmlRequirements: question.htmlRequirements?.map((requirement) => ({
        ...requirement,
        text: Array.isArray(requirement.text) ? [...requirement.text] : requirement.text,
        attributes: requirement.attributes?.map((attribute) => ({
          ...attribute,
          value: Array.isArray(attribute.value) ? [...attribute.value] : attribute.value,
        })),
      })),
      inputLabel,
      inputPlaceholder,
      codeTemplate: question.codeTemplate ?? `${selector} {\n  {{input}}\n}`,
      previewTemplate:
        question.previewTemplate ??
        "<!doctype html><html lang=\"ja\"><head><meta charset=\"UTF-8\"><style>body{font-family:sans-serif;padding:0px;background:#fffef8;color:#222}.demo-wrap{display:grid;place-items:center;min-height:220px;border:1px dashed #d8d1c0;background:#fff}.demo-box{width:100%;}.demo-card{padding:5px 5px;border:1px solid #ddd;background:#ffffff}.demo-grid{display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);}.demo-button{padding:12px 18px;border:1px solid #bbb;background:#f7f7f7}.demo-text{width:100%;}.demo-text-line{width:100%;line-height:0;}.demo-copy{}.demo-row{width:100%;}.demo-row>div{padding:12px 16px;border:1px solid #ddd;background:#fafafa}"
          + `${selector}{ {{input}} }</style></head><body><div class=\"demo-wrap\">${baseHtml}</div></body></html>`,
    };
  }

  return {
    ...question,
    questionType: "practical",
    practicalLanguage: "html",
    choices: Array.isArray(question.choices) ? [...question.choices] : [],
    acceptedAnswers: question.acceptedAnswers ? [...question.acceptedAnswers] : undefined,
    cssRequirements: question.cssRequirements?.map((requirement) => ({
      ...requirement,
      value: Array.isArray(requirement.value) ? [...requirement.value] : requirement.value,
    })),
    htmlRequirements: question.htmlRequirements?.map((requirement) => ({
      ...requirement,
      text: Array.isArray(requirement.text) ? [...requirement.text] : requirement.text,
      attributes: requirement.attributes?.map((attribute) => ({
        ...attribute,
        value: Array.isArray(attribute.value) ? [...attribute.value] : attribute.value,
      })),
    })),
    inputLabel,
    inputPlaceholder,
    codeTemplate: question.codeTemplate ?? "<body>\n  {{input}}\n</body>",
    previewTemplate: question.previewTemplate ?? HTML_PREVIEW_TEMPLATE,
  };
}