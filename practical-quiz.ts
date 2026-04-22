// 実技問題機能の公開窓口として UI と採点処理をまとめる。
export {
  showPracticalQuestion,
  syncPracticalPreview,
  type PracticalQuizElements,
} from "./practical-ui.js";
export { gradePracticalAnswer, isPracticalQuestion } from "./practical-grader.js";


