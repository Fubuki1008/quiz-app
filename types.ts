export type QuestionFileName = string;

export type CategoryDefinition = {
  id: string;
  label: string;
  fileName: QuestionFileName;
};

export type Question = {
  question: string;
  choices: string[];
  answer: string;
  explanation: string;
  tags?: string[];
};

export type AnswerRecord = {
  question: Question;
  selected: string;
  isCorrect: boolean;
  tags: string[];
  elapsedMs: number;
};

export type CategoryStat = {
  correct: number;
  total: number;
};

export type TagStat = {
  total: number;
  correct: number;
};

export type TimeStats = {
  sessions: number;
  totalAnswers: number;
  totalMs: number;
  correctAnswers: number;
  correctMs: number;
  fastestMs: number;
  slowestMs: number;
  fastCount: number;
  normalCount: number;
  slowCount: number;
};

export type WeakTagItem = {
  tag: string;
  total: number;
  correct: number;
  accuracy: number;
};

export type StorageInfo = {
  userDataPath: string;
  questionDataPath: string;
};

export type StatsStore = Record<string, CategoryStat>;
export type TagStatsStore = Record<string, TagStat>;
export type ResultTabKey = "analytics" | "explanation" | "wrongNote";
export type WeakTagTabKey = "history" | "current";

export type QuizAppApi = {
  loadCategories: () => Promise<CategoryDefinition[]>;
  loadQuestions: (fileName: string) => Promise<Question[]>;
  saveQuestions: (fileName: string, questions: Question[]) => Promise<{ ok: true }>;
  createCategory: (label: string) => Promise<CategoryDefinition>;
  renameCategory: (fileName: string, label: string) => Promise<CategoryDefinition>;
  deleteCategory: (fileName: string) => Promise<{ ok: true }>;
  getAdminAuthState: () => Promise<{ authenticated: boolean; username: string }>;
  getStorageInfo: () => Promise<StorageInfo>;
  clearUserData: () => Promise<{ ok: true }>;
  loginAdmin: (
    username: string,
    password: string
  ) => Promise<{ ok: boolean; message?: string }>;
  logoutAdmin: () => Promise<{ ok: true }>;
};