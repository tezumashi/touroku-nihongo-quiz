import { QUESTIONS_BU1 } from "./questions_bu1.js";
import { QUESTIONS_BU2 } from "./questions_bu2.js";
import { QUESTIONS_BU3 } from "./questions_bu3.js";
import { QUESTIONS_BU4 } from "./questions_bu4.js";
import { QUESTIONS_BU5 } from "./questions_bu5.js";
import { partOf } from "./curriculum.js";

const RAW = [
  ...QUESTIONS_BU1.map((q) => ({ ...q, part: "bu1" })),
  ...QUESTIONS_BU2.map((q) => ({ ...q, part: "bu2" })),
  ...QUESTIONS_BU3.map((q) => ({ ...q, part: "bu3" })),
  ...QUESTIONS_BU4.map((q) => ({ ...q, part: "bu4" })),
  ...QUESTIONS_BU5.map((q) => ({ ...q, part: "bu5" })),
];

// 念のため、item番号からpartを再検証（データ不整合防止）
export const ALL_QUESTIONS = RAW.map((q) => ({ ...q, part: partOf(q.item) || q.part }));

export function getQuestionsByPart(partId) {
  return ALL_QUESTIONS.filter((q) => q.part === partId);
}

export function getQuestionsByItem(itemNo) {
  return ALL_QUESTIONS.filter((q) => q.item === itemNo);
}

export function getQuestionById(id) {
  return ALL_QUESTIONS.find((q) => q.id === id);
}
