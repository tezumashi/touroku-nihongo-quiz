// 回答記録・セッション集計のロジック。Storage / SRS / Gamify をつなぐハブ。
import { Storage, todayISO } from "./storage.js";
import { applyAnswerToSrs, isHesitant as computeIsHesitant, RESPONSE_HISTORY_SIZE } from "./srs.js";
import { xpForAnswer, updateStreakOnStudy, checkNewBadges } from "./gamify.js";

export function answerQuestion(username, { question, isCorrect, comboCount, elapsedSeconds = 0 }) {
  let xpGained = 0;
  let newBadges = [];
  let hesitant = false;

  const user = Storage.updateUser(username, (u) => {
    const today = todayISO();
    const wasSeenBefore = !!u.questionSrs[question.id];

    // 総計・日次ログ
    u.totals.answered += 1;
    if (isCorrect) u.totals.correct += 1;
    if (!u.dailyLog[today]) u.dailyLog[today] = { answered: 0, correct: 0, seconds: 0 };
    u.dailyLog[today].answered += 1;
    if (isCorrect) u.dailyLog[today].correct += 1;

    // 項目別正答率
    const itemStat = u.itemStats[question.item] || { asked: 0, correct: 0 };
    itemStat.asked += 1;
    if (isCorrect) itemStat.correct += 1;
    u.itemStats[question.item] = itemStat;

    // 「迷った末の正解」判定：このユーザー自身が正解できた時の直近の回答速度と比べて
    // 明らかに遅い場合のみ迷ったとみなす（絶対的な秒数の基準ではなく相対評価）
    if (!u.responseTimes) u.responseTimes = [];
    hesitant = isCorrect && computeIsHesitant(elapsedSeconds, u.responseTimes);

    // SRS更新（迷った末の正解は復習の優先度を上げる）
    u.questionSrs[question.id] = applyAnswerToSrs(u.questionSrs[question.id], isCorrect, hesitant);

    // 個人の回答速度の基準値を更新（正解時のみ、直近N件を保持）
    if (isCorrect) {
      u.responseTimes = [...u.responseTimes, elapsedSeconds].slice(-RESPONSE_HISTORY_SIZE);
    }

    // 早起き・夜型バッジ用の記録（一度検知したらフラグは保持し続ける）
    const hour = new Date().getHours();
    if (!u.timeFlags) u.timeFlags = { earlyBird: false, nightOwl: false };
    if (hour >= 5 && hour < 8) u.timeFlags.earlyBird = true;
    if (hour >= 22 || hour < 4) u.timeFlags.nightOwl = true;

    // XP
    xpGained = xpForAnswer({ correct: isCorrect, isNew: !wasSeenBefore, comboCount });
    u.xp += xpGained;

    // ストリーク（同日2回目以降は内部で無視される）
    u.streak = updateStreakOnStudy(u.streak);

    // バッジ判定
    newBadges = checkNewBadges(u);
    u.badges = [...(u.badges || []), ...newBadges];

    return u;
  });

  return { user, xpGained, newBadges, isHesitant: hesitant };
}

export function recordStudySeconds(username, seconds) {
  return Storage.updateUser(username, (u) => {
    const today = todayISO();
    u.totals.studySeconds += seconds;
    if (!u.dailyLog[today]) u.dailyLog[today] = { answered: 0, correct: 0, seconds: 0 };
    u.dailyLog[today].seconds += seconds;
    return u;
  });
}

export function recordMockResult(username, result) {
  return Storage.updateUser(username, (u) => {
    u.mockResults = [...(u.mockResults || []), result];
    const newBadges = checkNewBadges(u);
    u.badges = [...(u.badges || []), ...newBadges];
    return u;
  });
}

export function todayProgress(user) {
  const today = todayISO();
  const log = user.dailyLog[today] || { answered: 0, correct: 0, seconds: 0 };
  return { ...log, goal: user.dailyGoal || 10 };
}
