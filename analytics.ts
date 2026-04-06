import {
  EXCLUDED_WEAK_TAGS,
  LOCAL_STORAGE_KEY,
  LOCAL_STORAGE_KEY_TAG_STATS,
  LOCAL_STORAGE_KEY_TIME_STATS,
  createEmptyTimeStats,
} from "./constants.js";
import { escapeHtml, renderMarkedText, stripMarkup } from "./text-format.js";
import {
  AnswerRecord,
  Question,
  QuestionFileName,
  ResultTabKey,
  StatsStore,
  TagStat,
  TagStatsStore,
  TimeStats,
  WeakTagItem,
  WeakTagTabKey,
} from "./types.js";

export type ResultTabElements = {
  tabAnalyticsButton: HTMLButtonElement;
  tabExplanationButton: HTMLButtonElement;
  tabWrongNoteButton: HTMLButtonElement;
  analyticsPanel: HTMLElement;
  explanationPanel: HTMLElement;
  wrongNotePanel: HTMLElement;
};

export type WeakTagTabElements = {
  weakTagHistoryTabButton: HTMLButtonElement;
  weakTagCurrentTabButton: HTMLButtonElement;
  weakTagHistoryPanel: HTMLElement;
  weakTagCurrentPanel: HTMLElement;
};

export type ExplanationElements = {
  explanationList: HTMLElement;
  explanationItems: HTMLElement;
};

export type CategoryAccuracyElements = {
  categoryAccuracyList: HTMLElement;
};

export type WeakTagAnalysisElements = WeakTagTabElements & {
  weakTagList: HTMLElement;
  currentWeakTagList: HTMLElement;
  weakTagSortSelect: HTMLSelectElement;
  collapsePerfectTagsToggle: HTMLInputElement;
  perfectTagSummary: HTMLElement;
  currentPerfectTagSummary: HTMLElement;
};

export type DashboardElements = {
  dashboardSummary: HTMLElement;
  averageTimeChart: HTMLElement;
  masterySummary: HTMLElement;
  masteryLevelList: HTMLElement;
};

export function setActiveResultTab(elements: ResultTabElements, tab: ResultTabKey) {
  const tabs: Array<{ key: ResultTabKey; button: HTMLButtonElement; panel: HTMLElement }> = [
    { key: "analytics", button: elements.tabAnalyticsButton, panel: elements.analyticsPanel },
    {
      key: "explanation",
      button: elements.tabExplanationButton,
      panel: elements.explanationPanel,
    },
    { key: "wrongNote", button: elements.tabWrongNoteButton, panel: elements.wrongNotePanel },
  ];

  tabs.forEach(({ key, button, panel }) => {
    const isActive = key === tab;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", isActive ? "true" : "false");
    panel.classList.toggle("active", isActive);
  });
}

export function setActiveWeakTagTab(elements: WeakTagTabElements, tab: WeakTagTabKey) {
  const tabs: Array<{
    key: WeakTagTabKey;
    button: HTMLButtonElement;
    panel: HTMLElement;
  }> = [
    {
      key: "history",
      button: elements.weakTagHistoryTabButton,
      panel: elements.weakTagHistoryPanel,
    },
    {
      key: "current",
      button: elements.weakTagCurrentTabButton,
      panel: elements.weakTagCurrentPanel,
    },
  ];

  tabs.forEach(({ key, button, panel }) => {
    const isActive = key === tab;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", isActive ? "true" : "false");
    panel.classList.toggle("active", isActive);
  });
}

export function renderExplanationList(
  elements: ExplanationElements,
  selectedQuestions: Question[],
  correctList: boolean[],
  answerRecords: AnswerRecord[]
) {
  elements.explanationItems.innerHTML = "";

  selectedQuestions.forEach((question, index) => {
    const isCorrect = correctList[index];
    const answered = answerRecords[index];
    const selected = answered?.selected ?? "未回答";

    const li = document.createElement("li");
    li.className = isCorrect ? "correct-item" : "wrong-item";
    li.innerHTML = `
      <div class="q-contents">
        <div class="q-text"><strong class="q-label">第${index + 1}問:</strong> ${renderMarkedText(
      question.question
    )}</div><br>
        <div class="a-text"><strong class="a-label">あなたの回答:</strong> ${escapeHtml(
          selected
        )}</div><br>
        <div class="a-text"><strong class="a-label">正解:</strong> ${escapeHtml(
          question.answer
        )}</div><br>
        <div class="e-text"><strong class="e-label">解説:</strong> ${renderMarkedText(
          question.explanation
        )}</div><br>
      </div>
    `;

    elements.explanationItems.appendChild(li);
  });

  elements.explanationList.style.display = "block";
}

export function renderCategoryAccuracy(
  elements: CategoryAccuracyElements,
  categoryLabelMap: Record<string, string>,
  categoryFile: QuestionFileName,
  currentCorrect: number,
  currentTotal: number
) {
  elements.categoryAccuracyList.innerHTML = "";

  const stats = loadCategoryStats();
  const categories = Object.keys(categoryLabelMap) as QuestionFileName[];

  categories.forEach((category) => {
    const label = categoryLabelMap[category];
    const stat = stats[category] ?? { correct: 0, total: 0 };
    const accuracy = stat.total === 0 ? 0 : (stat.correct / stat.total) * 100;

    const li = document.createElement("li");
    li.textContent = `${label}: ${accuracy.toFixed(1)}% (${stat.correct}/${stat.total})`;
    elements.categoryAccuracyList.appendChild(li);
  });

  const currentLabel = categoryLabelMap[categoryFile] ?? "選択分野";
  const currentAccuracy = currentTotal === 0 ? 0 : (currentCorrect / currentTotal) * 100;
  const currentLi = document.createElement("li");
  currentLi.textContent = `今回 ${currentLabel}: ${currentAccuracy.toFixed(1)}% (${currentCorrect}/${currentTotal})`;
  elements.categoryAccuracyList.appendChild(currentLi);
}

export function renderWeakTagAnalysis(
  elements: WeakTagAnalysisElements,
  answerRecords: AnswerRecord[]
) {
  const historyTagMap = loadWeakTagStats();
  const currentChallengeTagMap = buildTagStatsFromRecords(answerRecords);

  renderWeakTagList(
    elements.weakTagList,
    elements.perfectTagSummary,
    historyTagMap,
    elements.weakTagSortSelect.value,
    elements.collapsePerfectTagsToggle.checked,
    "履歴データがありません"
  );
  renderWeakTagList(
    elements.currentWeakTagList,
    elements.currentPerfectTagSummary,
    currentChallengeTagMap,
    elements.weakTagSortSelect.value,
    elements.collapsePerfectTagsToggle.checked,
    "今回の挑戦データがありません"
  );
}

export function renderLearningDashboard(
  elements: DashboardElements,
  records: AnswerRecord[]
) {
  elements.dashboardSummary.innerHTML = "";
  elements.averageTimeChart.innerHTML = "";

  const storedTime = loadTimeStats();
  const currentAnswers = records.length;
  const currentTotalMs = records.reduce((sum, record) => sum + record.elapsedMs, 0);
  const currentAvgMs = currentAnswers === 0 ? 0 : currentTotalMs / currentAnswers;
  const currentFastestMs =
    currentAnswers === 0 ? 0 : Math.min(...records.map((record) => record.elapsedMs));
  const currentSlowestMs =
    currentAnswers === 0 ? 0 : Math.max(...records.map((record) => record.elapsedMs));
  const categoryStats = loadCategoryStats();
  const categoryTotals = Object.values(categoryStats).reduce(
    (acc, value) => {
      acc.correct += value.correct;
      acc.total += value.total;
      return acc;
    },
    { correct: 0, total: 0 }
  );
  const totalAccuracy =
    categoryTotals.total === 0 ? 0 : (categoryTotals.correct / categoryTotals.total) * 100;

  const cards = [
    {
      label: "累計チャレンジ数",
      value: `${storedTime.sessions} 回`,
      hint: "通常モードのみ集計",
    },
    {
      label: "累計正答率",
      value: `${totalAccuracy.toFixed(1)}%`,
      hint: `${categoryTotals.correct}/${categoryTotals.total}`,
    },
    {
      label: "累計平均回答時間",
      value:
        storedTime.totalAnswers === 0
          ? "データなし"
          : formatMs(storedTime.totalMs / storedTime.totalAnswers),
      hint: `${storedTime.totalAnswers} 問分`,
    },
    {
      label: "今回の平均回答時間",
      value: currentAnswers === 0 ? "データなし" : formatMs(currentAvgMs),
      hint: `${currentAnswers} 問分`,
    },
    {
      label: "今回の最速 / 最遅",
      value:
        currentAnswers === 0
          ? "データなし"
          : `${formatMs(currentFastestMs)} / ${formatMs(currentSlowestMs)}`,
      hint: "1問あたり",
    },
  ];

  cards.forEach((card) => {
    const article = document.createElement("article");
    article.className = "dashboard-card";
    article.innerHTML = `
      <p class="dashboard-card-label">${card.label}</p>
      <p class="dashboard-card-value">${card.value}</p>
      <p class="dashboard-card-hint">${card.hint}</p>
    `;
    elements.dashboardSummary.appendChild(article);
  });

  const cumulativeAvgMs =
    storedTime.totalAnswers === 0 ? 0 : storedTime.totalMs / storedTime.totalAnswers;
  const avgMax = Math.max(currentAvgMs, cumulativeAvgMs, 1);
  renderBarChart(
    elements.averageTimeChart,
    "平均回答時間（今回 / 累計）",
    [
      {
        label: "今回の平均",
        value: currentAvgMs,
        valueText: formatMs(currentAvgMs),
        scope: "current",
      },
      {
        label: "累計の平均",
        value: cumulativeAvgMs,
        valueText: formatMs(cumulativeAvgMs),
        scope: "history",
      },
    ],
    avgMax
  );

  renderMasteryLevels(elements, loadWeakTagStats());
}

export function createWrongNote(
  wrongRecords: AnswerRecord[],
  currentScore: number,
  total: number,
  currentCategory: QuestionFileName,
  categoryLabelMap: Record<string, string>
): string {
  const label = categoryLabelMap[currentCategory] ?? "Unknown";
  const now = new Date();
  const headerDate = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(
    2,
    "0"
  )}/${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(
    2,
    "0"
  )}:${String(now.getMinutes()).padStart(2, "0")}`;
  const accuracy = total === 0 ? 0 : (currentScore / total) * 100;

  const lines: string[] = [];
  lines.push(`# 間違いノート (${label})`);
  lines.push(`- 作成日時: ${headerDate}`);
  lines.push(`- スコア: ${currentScore}/${total} (${accuracy.toFixed(1)}%)`);
  lines.push(`- 間違い数: ${wrongRecords.length}`);
  lines.push("");

  if (wrongRecords.length === 0) {
    lines.push("全問正解です。復習対象はありません。");
    return lines.join("\n");
  }

  wrongRecords.forEach((record, index) => {
    lines.push(`## ${index + 1}. ${stripMarkup(record.question.question)}`);
    lines.push(`- あなたの回答: ${record.selected}`);
    lines.push(`- 正解: ${record.question.answer}`);
    lines.push(`- タグ: ${(record.tags.length > 0 ? record.tags : ["general"]).join(", ")}`);
    lines.push(`- 解説: ${stripMarkup(record.question.explanation)}`);
    lines.push("");
  });

  return lines.join("\n");
}

export function extractTags(
  question: Question,
  currentCategory: QuestionFileName,
  categoryLabelMap: Record<string, string>
): string[] {
  if (question.tags && question.tags.length > 0) {
    return question.tags.map(normalizeTag).filter((tag) => tag.length > 0);
  }

  const text = `${question.question} ${question.explanation}`;
  const tags = new Set<string>();

  const bracketTokens = text.match(/\[([^\]]+)\]/g) ?? [];
  bracketTokens.forEach((token) => {
    tags.add(token.replace(/\[|\]/g, "").trim());
  });

  const underlineTokens = text.match(/__([^_]+)__/g) ?? [];
  underlineTokens.forEach((token) => {
    tags.add(token.replace(/__/g, "").trim());
  });

  const answerToken = question.answer.trim();
  if (/^[a-zA-Z0-9:#().\-\s]+$/.test(answerToken) && answerToken.length <= 24) {
    tags.add(answerToken);
  }

  const categoryLabel = categoryLabelMap[currentCategory];
  if (categoryLabel) {
    tags.add(categoryLabel);
  }

  return Array.from(tags).map(normalizeTag).filter((tag) => tag.length > 0);
}

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

function renderBarChart(
  container: HTMLElement,
  title: string,
  items: Array<{
    label: string;
    value: number;
    valueText: string;
    scope: "current" | "history";
  }>,
  maxValue: number
) {
  container.innerHTML = "";

  const titleEl = document.createElement("p");
  titleEl.className = "bar-chart-title";
  titleEl.textContent = title;
  container.appendChild(titleEl);

  items.forEach((item) => {
    const row = document.createElement("div");
    row.className = "bar-row";

    const label = document.createElement("span");
    label.className = "bar-label";
    label.textContent = item.label;

    const track = document.createElement("div");
    track.className = "bar-track";

    const fill = document.createElement("div");
    fill.className = `bar-fill ${item.scope}`;
    const ratio = maxValue === 0 ? 0 : (item.value / maxValue) * 100;
    fill.style.width = `${Math.max(0, Math.min(100, ratio)).toFixed(1)}%`;
    track.appendChild(fill);

    const value = document.createElement("span");
    value.className = "bar-value";
    value.textContent = item.valueText;

    row.appendChild(label);
    row.appendChild(track);
    row.appendChild(value);

    container.appendChild(row);
  });
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

function renderMasteryLevels(elements: DashboardElements, tagMap: TagStatsStore) {
  elements.masteryLevelList.innerHTML = "";
  elements.masterySummary.textContent = "";

  const masteryItems = (Object.entries(tagMap) as [string, TagStat][])
    .map(([tag, stat]) => {
      const accuracy = stat.total === 0 ? 0 : (stat.correct / stat.total) * 100;
      const level = getMasteryLevel(stat.total, accuracy);
      return {
        tag,
        total: stat.total,
        correct: stat.correct,
        accuracy,
        level,
      };
    })
    .filter((item) => item.total > 0)
    .sort((a, b) => {
      if (b.level.value !== a.level.value) {
        return b.level.value - a.level.value;
      }
      return b.accuracy - a.accuracy;
    });

  if (masteryItems.length === 0) {
    const li = document.createElement("li");
    li.textContent = "習熟度データがありません";
    elements.masteryLevelList.appendChild(li);
    return;
  }

  const levelCounts = masteryItems.reduce((acc, item) => {
    acc[item.level.value] = (acc[item.level.value] ?? 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  elements.masterySummary.textContent = `L5:${levelCounts[5] ?? 0} / L4:${
    levelCounts[4] ?? 0
  } / L3:${levelCounts[3] ?? 0} / L2:${levelCounts[2] ?? 0} / L1:${
    levelCounts[1] ?? 0
  }`;

  masteryItems.forEach((item) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span class="mastery-badge mastery-lv-${item.level.value}">${item.level.label}</span>
      <strong>${item.tag}</strong>: 正答率 ${item.accuracy.toFixed(1)}% (${item.correct}/${
      item.total
    })
    `;
    elements.masteryLevelList.appendChild(li);
  });
}

function getMasteryLevel(total: number, accuracy: number): { value: number; label: string } {
  if (total >= 15 && accuracy >= 90) {
    return { value: 5, label: "Lv5 達人" };
  }
  if (total >= 10 && accuracy >= 80) {
    return { value: 4, label: "Lv4 上級" };
  }
  if (total >= 6 && accuracy >= 65) {
    return { value: 3, label: "Lv3 標準" };
  }
  if (total >= 3 && accuracy >= 50) {
    return { value: 2, label: "Lv2 入門" };
  }
  return { value: 1, label: "Lv1 要復習" };
}

function formatMs(ms: number): string {
  return `${(ms / 1000).toFixed(1)}秒`;
}

function renderWeakTagList(
  listEl: HTMLElement,
  summaryEl: HTMLElement,
  tagMap: TagStatsStore,
  sortOrder: string,
  collapsePerfect: boolean,
  emptyMessage: string
) {
  listEl.innerHTML = "";
  summaryEl.textContent = "";

  const items: WeakTagItem[] = (Object.entries(tagMap) as [string, TagStat][])
    .map(([tag, value]) => ({
      tag,
      total: value.total,
      correct: value.correct,
      accuracy: value.total === 0 ? 0 : (value.correct / value.total) * 100,
    }))
    .filter((item) => item.total > 0);

  const sorted = items.sort((a, b) => {
    if (sortOrder === "high") {
      return b.accuracy - a.accuracy || b.total - a.total;
    }
    return a.accuracy - b.accuracy || b.total - a.total;
  });

  if (sorted.length === 0) {
    const li = document.createElement("li");
    li.textContent = emptyMessage;
    listEl.appendChild(li);
    return;
  }

  const visibleItems = collapsePerfect ? sorted.filter((item) => item.accuracy < 100) : sorted;
  const hiddenPerfectCount = sorted.length - visibleItems.length;
  if (collapsePerfect && hiddenPerfectCount > 0) {
    summaryEl.textContent = `正答率100%のタグを ${hiddenPerfectCount} 件折りたたみ中`;
  }

  if (visibleItems.length === 0) {
    const li = document.createElement("li");
    li.textContent = "表示対象のタグがありません（正答率100%タグを折りたたみ中）";
    listEl.appendChild(li);
    return;
  }

  visibleItems.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = `${item.tag}: 正答率 ${item.accuracy.toFixed(1)}% (${item.correct}/${
      item.total
    })`;
    listEl.appendChild(li);
  });
}

function buildTagStatsFromRecords(records: AnswerRecord[]): TagStatsStore {
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

function normalizeTag(tag: string): string {
  return tag.replace(/\s+/g, " ").trim().toLowerCase();
}

function loadCategoryStats(): StatsStore {
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

function loadWeakTagStats(): TagStatsStore {
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

function loadTimeStats(): TimeStats {
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