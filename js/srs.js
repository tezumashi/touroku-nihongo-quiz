// Leitnerボックス方式の間隔反復（SRS）ロジック。
// box: 1〜5。正解するたびにboxが1つ上がり、次回復習までの間隔が伸びる。不正解ならbox1に戻り、次回すぐ復習対象になる。
import { todayISO } from "./storage.js";

export const BOX_INTERVAL_DAYS = { 1: 0, 2: 1, 3: 3, 4: 7, 5: 16 };
export const MAX_BOX = 5;

function addDays(iso, days) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return todayISO(d);
}

export function initSrsEntry() {
  return { box: 1, dueDate: todayISO(), seen: 0, correct: 0, wrong: 0, lastResult: null };
}

export function applyAnswerToSrs(entry, isCorrect) {
  const e = entry ? { ...entry } : initSrsEntry();
  e.seen += 1;
  if (isCorrect) {
    e.correct += 1;
    e.box = Math.min(MAX_BOX, e.box + 1);
  } else {
    e.wrong += 1;
    e.box = 1;
  }
  e.lastResult = isCorrect ? "correct" : "wrong";
  e.dueDate = addDays(todayISO(), BOX_INTERVAL_DAYS[e.box]);
  return e;
}

export function isDue(entry) {
  if (!entry) return true; // 未出題は常に「学習対象」
  return entry.dueDate <= todayISO();
}

export function accuracyOf(entry) {
  if (!entry || entry.seen === 0) return null;
  return entry.correct / entry.seen;
}
