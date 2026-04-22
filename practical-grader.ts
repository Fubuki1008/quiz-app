// 実技問題の正誤判定と CSS・HTML 条件評価
import {
  PracticalCssRequirement,
  PracticalHtmlAttributeRequirement,
  PracticalHtmlRequirement,
  PracticalLanguage,
  Question,
} from "./types.js";

export function isPracticalQuestion(question: Question | undefined): question is Question {
  return question?.questionType === "practical";
}

export function gradePracticalAnswer(question: Question, selected: string): boolean {
  if (question.practicalLanguage === "css" && question.cssRequirements?.length) {
    return evaluateCssRequirements(selected, question.cssRequirements);
  }

  if (question.practicalLanguage === "html" && question.htmlRequirements?.length) {
    return evaluateHtmlRequirements(selected, question.htmlRequirements);
  }

  const normalizedSelected = normalizePracticalAnswer(selected, question.practicalLanguage);
  const answerCandidates = [question.answer, ...(question.acceptedAnswers ?? [])];

  return answerCandidates.some(
    (candidate) =>
      normalizePracticalAnswer(candidate, question.practicalLanguage) === normalizedSelected
  );
}

function evaluateCssRequirements(
  selected: string,
  requirements: PracticalCssRequirement[]
): boolean {
  const declarationMap = parseCssDeclarations(selected);
  const ruleMap = parseCssRules(selected);

  if (declarationMap.size === 0 && ruleMap.size === 0) {
    return false;
  }

  return requirements.every((requirement) => {
    const targetDeclarationMap = requirement.selector
      ? ruleMap.get(normalizeCssSelector(requirement.selector))
      : declarationMap;
    const propertyName = normalizeCssProperty(requirement.property);
    const actualValues = targetDeclarationMap?.get(propertyName);

    if (!actualValues || actualValues.length === 0) {
      return false;
    }

    const expectedValues = toStringArray(requirement.value).map((value) => normalizeCssValue(value));
    return actualValues.some((actualValue) => expectedValues.includes(actualValue));
  });
}

function parseCssRules(source: string): Map<string, Map<string, string[]>> {
  const ruleMap = new Map<string, Map<string, string[]>>();
  let searchStart = 0;

  while (searchStart < source.length) {
    const blockStart = source.indexOf("{", searchStart);
    if (blockStart < 0) {
      break;
    }

    const selectorText = source.slice(searchStart, blockStart).trim();
    const blockEnd = findCssBlockEnd(source, blockStart);

    if (blockEnd < 0) {
      break;
    }

    if (selectorText) {
      const declarations = parseCssDeclarations(source.slice(blockStart + 1, blockEnd));
      const selectors = splitCssSegments(selectorText, ",").map((selector) =>
        normalizeCssSelector(selector)
      );

      selectors.forEach((selector) => {
        if (!selector) {
          return;
        }

        const existingDeclarations = ruleMap.get(selector) ?? new Map<string, string[]>();
        mergeCssDeclarationMaps(existingDeclarations, declarations);
        ruleMap.set(selector, existingDeclarations);
      });
    }

    searchStart = blockEnd + 1;
  }

  return ruleMap;
}

function findCssBlockEnd(source: string, blockStart: number): number {
  let braceDepth = 0;
  let quote: string | null = null;

  for (let index = blockStart; index < source.length; index += 1) {
    const character = source[index];

    if (quote) {
      if (character === quote && source[index - 1] !== "\\") {
        quote = null;
      }
      continue;
    }

    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }

    if (character === "{") {
      braceDepth += 1;
      continue;
    }

    if (character === "}") {
      braceDepth -= 1;
      if (braceDepth === 0) {
        return index;
      }
    }
  }

  return -1;
}

function mergeCssDeclarationMaps(
  target: Map<string, string[]>,
  source: Map<string, string[]>
): Map<string, string[]> {
  source.forEach((values, propertyName) => {
    const existingValues = target.get(propertyName) ?? [];
    target.set(propertyName, [...existingValues, ...values]);
  });

  return target;
}

function parseCssDeclarations(source: string): Map<string, string[]> {
  const declarationMap = new Map<string, string[]>();
  const declarationBlock = extractCssDeclarationBlock(source);
  const declarationEntries = splitCssSegments(declarationBlock, ";");

  declarationEntries.forEach((entry) => {
    const pair = splitCssPropertyAndValue(entry);
    if (!pair) {
      return;
    }

    const propertyName = normalizeCssProperty(pair.property);
    const value = normalizeCssValue(pair.value);
    const existingValues = declarationMap.get(propertyName) ?? [];

    existingValues.push(value);
    declarationMap.set(propertyName, existingValues);
  });

  return declarationMap;
}

function extractCssDeclarationBlock(source: string): string {
  const startIndex = source.indexOf("{");
  const endIndex = source.lastIndexOf("}");

  if (startIndex >= 0 && endIndex > startIndex) {
    return source.slice(startIndex + 1, endIndex);
  }

  return source;
}

function splitCssSegments(source: string, separator: string): string[] {
  const segments: string[] = [];
  let current = "";
  let parenDepth = 0;
  let bracketDepth = 0;
  let quote: string | null = null;

  for (const character of source) {
    if (quote) {
      current += character;
      if (character === quote) {
        quote = null;
      }
      continue;
    }

    if (character === '"' || character === "'") {
      quote = character;
      current += character;
      continue;
    }

    if (character === "(") {
      parenDepth += 1;
      current += character;
      continue;
    }

    if (character === ")") {
      parenDepth = Math.max(0, parenDepth - 1);
      current += character;
      continue;
    }

    if (character === "[") {
      bracketDepth += 1;
      current += character;
      continue;
    }

    if (character === "]") {
      bracketDepth = Math.max(0, bracketDepth - 1);
      current += character;
      continue;
    }

    if (character === separator && parenDepth === 0 && bracketDepth === 0) {
      const trimmed = current.trim();
      if (trimmed) {
        segments.push(trimmed);
      }
      current = "";
      continue;
    }

    current += character;
  }

  const tail = current.trim();
  if (tail) {
    segments.push(tail);
  }

  return segments;
}

function splitCssPropertyAndValue(source: string): { property: string; value: string } | null {
  let parenDepth = 0;
  let bracketDepth = 0;
  let quote: string | null = null;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];

    if (quote) {
      if (character === quote) {
        quote = null;
      }
      continue;
    }

    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }

    if (character === "(") {
      parenDepth += 1;
      continue;
    }

    if (character === ")") {
      parenDepth = Math.max(0, parenDepth - 1);
      continue;
    }

    if (character === "[") {
      bracketDepth += 1;
      continue;
    }

    if (character === "]") {
      bracketDepth = Math.max(0, bracketDepth - 1);
      continue;
    }

    if (character === ":" && parenDepth === 0 && bracketDepth === 0) {
      const property = source.slice(0, index).trim();
      const value = source.slice(index + 1).trim();

      if (!property || !value) {
        return null;
      }

      return { property, value };
    }
  }

  return null;
}

function normalizeCssProperty(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeCssSelector(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function normalizeCssValue(value: string): string {
  return value
    .trim()
    .replace(/\s*,\s*/g, ",")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function evaluateHtmlRequirements(
  selected: string,
  requirements: PracticalHtmlRequirement[]
): boolean {
  const template = document.createElement("template");
  template.innerHTML = selected.trim();

  return requirements.every((requirement) => {
    const candidates = Array.from(template.content.querySelectorAll(requirement.tag));
    return candidates.some((candidate) => elementMatchesHtmlRequirement(candidate, requirement));
  });
}

function elementMatchesHtmlRequirement(
  element: Element,
  requirement: PracticalHtmlRequirement
): boolean {
  if (!matchesHtmlTextRequirement(element, requirement.text)) {
    return false;
  }

  return (requirement.attributes ?? []).every((attribute) =>
    matchesHtmlAttributeRequirement(element, attribute)
  );
}

function matchesHtmlTextRequirement(
  element: Element,
  expectedText: PracticalHtmlRequirement["text"]
): boolean {
  if (!expectedText) {
    return true;
  }

  const actualText = normalizeHtmlText(element.textContent ?? "");
  return toStringArray(expectedText).some((value) => normalizeHtmlText(value) === actualText);
}

function matchesHtmlAttributeRequirement(
  element: Element,
  attribute: PracticalHtmlAttributeRequirement
): boolean {
  if (!element.hasAttribute(attribute.name)) {
    return false;
  }

  if (attribute.value === undefined) {
    return true;
  }

  const actualValue = normalizeHtmlAttributeValue(element.getAttribute(attribute.name) ?? "");
  return toStringArray(attribute.value).some(
    (value) => normalizeHtmlAttributeValue(value) === actualValue
  );
}

function normalizeHtmlText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeHtmlAttributeValue(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function toStringArray(value: string | string[]): string[] {
  return Array.isArray(value) ? value : [value];
}

function normalizePracticalAnswer(value: string, language?: PracticalLanguage): string {
  const normalized = value
    .trim()
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n");

  if (language === "html") {
    return normalized.replace(/>\s+</g, "><");
  }

  return normalized;
}
