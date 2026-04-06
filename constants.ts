import { TimeStats } from "./types.js";

export const LOCAL_STORAGE_KEY = "quiz-app2-category-stats-v1";
export const LOCAL_STORAGE_KEY_TAG_STATS = "quiz-app2-weak-tag-stats-v1";
export const LOCAL_STORAGE_KEY_TIME_STATS = "quiz-app2-time-stats-v1";
export const QUESTION_COUNT = 10;
export const EXCLUDED_WEAK_TAGS = new Set(["html", "css", "js", "javascript"]);
export const CATEGORY_DEFINITIONS_FILE = "categories.json";

export function createEmptyTimeStats(): TimeStats {
  return {
    sessions: 0,
    totalAnswers: 0,
    totalMs: 0,
    correctAnswers: 0,
    correctMs: 0,
    fastestMs: 0,
    slowestMs: 0,
    fastCount: 0,
    normalCount: 0,
    slowCount: 0,
  };
}