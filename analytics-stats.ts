// 正答率・苦手タグ・回答時間の保存と更新
import {
  EXCLUDED_WEAK_TAGS,
  LOCAL_STORAGE_KEY,
  LOCAL_STORAGE_KEY_TAG_STATS,
  LOCAL_STORAGE_KEY_TIME_STATS,
  createEmptyTimeStats,
} from "./constants.js";
import {
  AnswerRecord,
  QuestionFileName,
  StatsStore,
  TagStatsStore,
  TimeStats,
} from "./types.js";

export function updateCategoryStats(category: QuestionFileName, correct: number, total: number) {
  const stats = loadCategoryStats();
  const existing = stats[category] ?? { correct: 0, total: 0 };

  stats[category] = {
    correct: existing.correct + correct,
    total: existing.total + total,
  };

  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stats));
}

export function updateWeakTagStats(records: AnswerRecord[]) {
  const stats = loadWeakTagStats();
  const current = buildTagStatsFromRecords(records);

  Object.entries(current).forEach(([tag, value]) => {
    if (!stats[tag]) {
      stats[tag] = { total: 0, correct: 0 };
    }
    stats[tag].total += value.total;
    stats[tag].correct += value.correct;
  });

  localStorage.setItem(LOCAL_STORAGE_KEY_TAG_STATS, JSON.stringify(stats));
}

export function updateTimeStats(records: AnswerRecord[]) {
  if (records.length === 0) {
    return;
  }

  const currentAnswers = records.length;
  const currentTotalMs = records.reduce((sum, record) => sum + record.elapsedMs, 0);
  const currentCorrectAnswers = records.filter((record) => record.isCorrect).length;
  const currentCorrectMs = records
    .filter((record) => record.isCorrect)
    .reduce((sum, record) => sum + record.elapsedMs, 0);
  const currentFastestMs = Math.min(...records.map((record) => record.elapsedMs));
  const currentSlowestMs = Math.max(...records.map((record) => record.elapsedMs));
  const distribution = createTimeDistribution(records.map((record) => record.elapsedMs));

  const stored = loadTimeStats();
  const updated: TimeStats = {
    sessions: stored.sessions + 1,
    totalAnswers: stored.totalAnswers + currentAnswers,
    totalMs: stored.totalMs + currentTotalMs,
    correctAnswers: stored.correctAnswers + currentCorrectAnswers,
    correctMs: stored.correctMs + currentCorrectMs,
    fastestMs:
      stored.fastestMs === 0 ? currentFastestMs : Math.min(stored.fastestMs, currentFastestMs),
    slowestMs: Math.max(stored.slowestMs, currentSlowestMs),
    fastCount: stored.fastCount + distribution.fast,
    normalCount: stored.normalCount + distribution.normal,
    slowCount: stored.slowCount + distribution.slow,
  };

  localStorage.setItem(LOCAL_STORAGE_KEY_TIME_STATS, JSON.stringify(updated));
}

export function resetStoredStats() {
  localStorage.removeItem(LOCAL_STORAGE_KEY);
  localStorage.removeItem(LOCAL_STORAGE_KEY_TAG_STATS);
  localStorage.removeItem(LOCAL_STORAGE_KEY_TIME_STATS);
}

export function buildTagStatsFromRecords(records: AnswerRecord[]): TagStatsStore {
  const stats: TagStatsStore = {};

  records.forEach((record) => {
    const uniqueTags = new Set(
      record.tags.map(normalizeTag).filter((tag) => tag.length > 0 && !EXCLUDED_WEAK_TAGS.has(tag))
    );

    uniqueTags.forEach((tag) => {
      if (!stats[tag]) {
        stats[tag] = { total: 0, correct: 0 };
      }
      stats[tag].total++;
      if (record.isCorrect) {
        stats[tag].correct++;
      }
    });
  });

  return stats;
}

export function normalizeTag(tag: string): string {
  return tag.replace(/\s+/g, " ").trim().toLowerCase();
}

export function loadCategoryStats(): StatsStore {
  const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw) as StatsStore;
  } catch (error) {
    console.error("統計データの読み込みに失敗:", error);
    return {};
  }
}

export function loadWeakTagStats(): TagStatsStore {
  const raw = localStorage.getItem(LOCAL_STORAGE_KEY_TAG_STATS);
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as TagStatsStore;
    const normalized: TagStatsStore = {};

    Object.entries(parsed).forEach(([tag, value]) => {
      const key = normalizeTag(tag);
      if (
        !EXCLUDED_WEAK_TAGS.has(key) &&
        typeof value?.total === "number" &&
        typeof value?.correct === "number"
      ) {
        normalized[key] = value;
      }
    });

    return normalized;
  } catch (error) {
    console.error("苦手タグ統計の読み込みに失敗:", error);
    return {};
  }
}

export function loadTimeStats(): TimeStats {
  const raw = localStorage.getItem(LOCAL_STORAGE_KEY_TIME_STATS);
  if (!raw) {
    return createEmptyTimeStats();
  }

  try {
    const parsed = JSON.parse(raw) as Partial<TimeStats>;
    return {
      sessions: typeof parsed.sessions === "number" ? parsed.sessions : 0,
      totalAnswers: typeof parsed.totalAnswers === "number" ? parsed.totalAnswers : 0,
      totalMs: typeof parsed.totalMs === "number" ? parsed.totalMs : 0,
      correctAnswers: typeof parsed.correctAnswers === "number" ? parsed.correctAnswers : 0,
      correctMs: typeof parsed.correctMs === "number" ? parsed.correctMs : 0,
      fastestMs: typeof parsed.fastestMs === "number" ? parsed.fastestMs : 0,
      slowestMs: typeof parsed.slowestMs === "number" ? parsed.slowestMs : 0,
      fastCount: typeof parsed.fastCount === "number" ? parsed.fastCount : 0,
      normalCount: typeof parsed.normalCount === "number" ? parsed.normalCount : 0,
      slowCount: typeof parsed.slowCount === "number" ? parsed.slowCount : 0,
    };
  } catch (error) {
    console.error("回答時間統計の読み込みに失敗:", error);
    return createEmptyTimeStats();
  }
}

export function formatMs(ms: number): string {
  return `${(ms / 1000).toFixed(1)}秒`;
}

function createTimeDistribution(elapsedMsList: number[]): {
  fast: number;
  normal: number;
  slow: number;
} {
  return elapsedMsList.reduce(
    (acc, ms) => {
      const sec = ms / 1000;
      if (sec < 5) {
        acc.fast++;
      } else if (sec < 10) {
        acc.normal++;
      } else {
        acc.slow++;
      }
      return acc;
    },
    { fast: 0, normal: 0, slow: 0 }
  );
}
