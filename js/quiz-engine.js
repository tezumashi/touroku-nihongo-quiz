import { ALL_QUESTIONS } from "../data/questions.js";
import { PARTS } from "../data/curriculum.js";
import { isDue } from "./srs.js";

// --- 選択肢のシャッフル ---------------------------------------------------
// 各設問は「正解1つ」＋「誤答プール(3〜5個)」を持つ。
// 毎回プールから最大3つをランダム抽出し、正解と合わせて並び順もランダム化することで、
// ①同じ位置に正解が固定されない、②誤答の組み合わせ自体も出題のたびに変わる、を両立する。
function pickRandom(arr, n) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

export function buildChoices(question) {
  const distractorCount = Math.min(3, question.pool.length);
  const distractors = pickRandom(question.pool, distractorCount);
  const choices = pickRandom([question.correct, ...distractors], distractorCount + 1);
  const correctIndex = choices.indexOf(question.correct);
  return { choices, correctIndex };
}

// --- 加重ランダム抽出（A-Res法：重みが大きいほど選ばれやすい） -------------
function weightedSampleWithoutReplacement(items, weightFn, count) {
  const keyed = items.map((it) => {
    const w = Math.max(weightFn(it), 0.0001);
    const key = Math.pow(Math.random(), 1 / w);
    return { it, key };
  });
  keyed.sort((a, b) => b.key - a.key);
  return keyed.slice(0, count).map((k) => k.it);
}

function itemAccuracy(user, itemNo) {
  const s = user.itemStats?.[itemNo];
  if (!s || s.asked === 0) return 0.5; // 未学習は中立値
  return s.correct / s.asked;
}

// --- 出題モード -------------------------------------------------------------

// 「今日の学習」おすすめ出題：復習期日が来た問題・苦手分野・未学習の問題を優先的に混ぜる
export function selectSmart(user, count = 10) {
  return weightedSampleWithoutReplacement(ALL_QUESTIONS, (q) => {
    const srs = user.questionSrs?.[q.id];
    const dueW = isDue(srs) ? (srs ? 3 : 2.2) : 0.15;
    const acc = itemAccuracy(user, q.item);
    const weaknessW = (1 - acc) * 2 + 0.2;
    return dueW * weaknessW + 0.05;
  }, Math.min(count, ALL_QUESTIONS.length));
}

// 「復習すべき」判定：期日到来／直近不正解／正解はしたが迷いが長かった（当てずっぽうの疑いあり）
function needsReview(srs) {
  if (!srs) return false;
  return isDue(srs) || srs.lastResult === "wrong" || srs.lastResult === "hesitant";
}

export function dueReviewCount(user) {
  return ALL_QUESTIONS.filter((q) => needsReview(user.questionSrs?.[q.id])).length;
}

// 苦手克服モード：SRS上「復習期日が来ている」問題、直近不正解の問題、
// および「正解だが迷いが長く当てずっぽうの疑いがある」問題を対象にする
export function selectReview(user, count = 20) {
  const targets = ALL_QUESTIONS.filter((q) => needsReview(user.questionSrs?.[q.id]));
  if (targets.length === 0) return [];
  return weightedSampleWithoutReplacement(targets, (q) => {
    const srs = user.questionSrs[q.id];
    if (srs.lastResult === "wrong") return 3;
    if (srs.lastResult === "hesitant") return 2.2;
    return 1.5;
  }, Math.min(count, targets.length));
}

// カテゴリ集中学習：指定した部（part）または項目（item）から出題
export function selectByCategory(user, { partId = null, itemNo = null }, count = 10) {
  let pool = ALL_QUESTIONS;
  if (itemNo != null) pool = pool.filter((q) => q.item === itemNo);
  else if (partId) pool = pool.filter((q) => q.part === partId);
  return weightedSampleWithoutReplacement(pool, (q) => {
    const acc = itemAccuracy(user, q.item);
    return (1 - acc) * 2 + 0.3;
  }, Math.min(count, pool.length));
}

// 模擬試験モード：5部の必須項目数に比例した問題数を各部からバランスよく抽出
export function selectMock(count = 25) {
  const totalItems = PARTS.reduce((s, p) => s + p.items.length, 0);
  let remaining = count;
  const selected = [];
  PARTS.forEach((part, idx) => {
    const isLast = idx === PARTS.length - 1;
    const partPool = ALL_QUESTIONS.filter((q) => q.part === part.id);
    const share = isLast ? remaining : Math.round((part.items.length / totalItems) * count);
    const n = Math.min(share, partPool.length);
    selected.push(...pickRandom(partPool, n));
    remaining -= n;
  });
  return pickRandom(selected, selected.length); // 部の順にならないようさらにシャッフル
}

export function selectRandom(count = 10) {
  return pickRandom(ALL_QUESTIONS, Math.min(count, ALL_QUESTIONS.length));
}
