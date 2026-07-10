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
  return { box: 1, dueDate: todayISO(), seen: 0, correct: 0, wrong: 0, hesitant: 0, lastResult: null };
}

// 出題から回答までの時間をもとに「迷った末の回答」かどうかを判定する。
// 文章量から一律のしきい値を計算する絶対値方式ではなく、そのユーザー自身が
// 「わかっている問題」に正解したときに実際にどれくらいの速さで回答しているかを
// 直近の履歴から観測し、そこから大きく外れて遅い場合にのみ「迷った」と判定する（相対値方式）。
// こうすることで、読むのが速い人・遅い人それぞれの地の速さを基準にでき、
// 一律の絶対時間を課すよりも公平に「いつもより明らかに遅い」を検出できる。
const MIN_HISTORY_FOR_BASELINE = 5; // これ未満の履歴では基準が不安定なため判定を行わない
const HESITATION_MULTIPLIER = 2.2; // 普段の何倍の時間がかかったら「迷った」とみなすか
const MIN_HESITATION_SECONDS = 3; // 基準値が極端に小さい場合の下限（誤検知防止）
export const RESPONSE_HISTORY_SIZE = 20; // 基準値の算出に使う直近の正解回答数

function median(numbers) {
  if (numbers.length === 0) return null;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

// personalCorrectTimes: そのユーザーが直近に正解したときの回答所要秒数の履歴（今回の回答は含まない）
export function isHesitant(elapsedSeconds, personalCorrectTimes) {
  if (!personalCorrectTimes || personalCorrectTimes.length < MIN_HISTORY_FOR_BASELINE) return false;
  const baseline = median(personalCorrectTimes);
  const threshold = Math.max(MIN_HESITATION_SECONDS, baseline * HESITATION_MULTIPLIER);
  return elapsedSeconds > threshold;
}

export function applyAnswerToSrs(entry, isCorrect, hesitant = false) {
  const e = entry ? { ...entry } : initSrsEntry();
  e.seen += 1;
  if (isCorrect) {
    e.correct += 1;
    if (hesitant) {
      // 正解はしたが迷いが長かった＝当てずっぽうの可能性があるため、
      // 箱を進めるのではなく1段階戻し、復習の優先度を上げる。
      e.hesitant = (e.hesitant || 0) + 1;
      e.box = Math.max(1, e.box - 1);
    } else {
      e.box = Math.min(MAX_BOX, e.box + 1);
    }
  } else {
    e.wrong += 1;
    e.box = 1;
  }
  e.lastResult = isCorrect ? (hesitant ? "hesitant" : "correct") : "wrong";
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
