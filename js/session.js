// 回答記録・セッション集計のロジック。Storage / SRS / Gamify をつなぐハブ。
import { Storage, todayISO } from "./storage.js";
import { applyAnswerToSrs } from "./srs.js";
import { xpForAnswer, updateStreakOnStudy, checkNewBadges } from "./gamify.js";

export function answerQuestion(username, { question, isCorrect, comboCount }) {
  let xpGained = 0;
  let newBadges = [];

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

    // SRS更新
    u.questionSrs[question.id] = applyAnswerToSrs(u.questionSrs[question.id], isCorrect);

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

  return { user, xpGained, newBadges };
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
