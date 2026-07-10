import { PARTS, ITEMS } from "../data/curriculum.js";
import { todayISO } from "./storage.js";

// --- XP・レベル ---------------------------------------------------------
// 三角数ベースでレベルが上がるほど必要XPが増えていく、ゲームでよくある成長曲線。
export function totalXpForLevel(n) {
  return 50 * n * (n + 1);
}

export function levelInfo(xp) {
  let level = 1;
  while (totalXpForLevel(level) <= xp) level++;
  const base = totalXpForLevel(level - 1);
  const next = totalXpForLevel(level);
  return { level, base, next, progress: (xp - base) / (next - base) };
}

export function xpForAnswer({ correct, isNew, comboCount }) {
  if (!correct) return 1; // 不正解でも取り組んだ分の最低XPは付与（モチベーション維持）
  let xp = 10;
  if (isNew) xp += 5;
  if (comboCount >= 3) xp += Math.min(10, comboCount);
  return xp;
}

// --- ストリーク（連続学習日数） -------------------------------------------
function isoWeekKey(dateISO) {
  const d = new Date(dateISO + "T00:00:00");
  const day = (d.getDay() + 6) % 7; // 月曜=0
  d.setDate(d.getDate() - day + 3);
  const firstThursday = new Date(d.getFullYear(), 0, 4);
  const week = 1 + Math.round(((d - firstThursday) / 86400000 - 3 + ((firstThursday.getDay() + 6) % 7)) / 7);
  return `${d.getFullYear()}-W${week}`;
}

function daysBetween(aISO, bISO) {
  const a = new Date(aISO + "T00:00:00");
  const b = new Date(bISO + "T00:00:00");
  return Math.round((b - a) / 86400000);
}

// 1日の学習が発生した際に呼ぶ。同日2回目以降の呼び出しは無視される。
export function updateStreakOnStudy(streak) {
  const today = todayISO();
  const s = { ...streak };
  if (s.lastStudyDate === today) return s; // 本日分はすでに反映済み

  if (!s.lastStudyDate) {
    s.current = 1;
  } else {
    const gap = daysBetween(s.lastStudyDate, today);
    if (gap === 1) {
      s.current += 1;
    } else if (gap === 2 && s.freezeUsedWeek !== isoWeekKey(today)) {
      // ストリークフリーズ：週1回まで、1日休んでも継続扱いにする救済措置
      s.freezeUsedWeek = isoWeekKey(today);
    } else {
      s.current = 1;
    }
  }
  s.lastStudyDate = today;
  s.longest = Math.max(s.longest || 0, s.current);
  return s;
}

// --- 励まし・称賛メッセージ ------------------------------------------------
const CORRECT_MESSAGES = [
  "正解です！さすがです。",
  "その調子！",
  "ナイス判断！",
  "完璧です！",
  "よく理解できていますね。",
  "冴えてます！",
  "その知識、本番でも活きますよ。",
];

const WRONG_MESSAGES = [
  "惜しい！解説を確認して次に活かしましょう。",
  "大丈夫、間違いは伸びしろです。",
  "ここは差がつくポイント。復習リストに追加しました。",
  "焦らず一歩ずつ。次はきっと解けます。",
  "この問題、後でもう一度出題します。",
];

const COMBO_MESSAGES = {
  3: "3問連続正解！波に乗ってます🔥",
  5: "5連続正解！絶好調です🔥🔥",
  10: "10連続正解！これは自己ベスト級！🔥🔥🔥",
};

export function pickCorrectMessage() {
  return CORRECT_MESSAGES[Math.floor(Math.random() * CORRECT_MESSAGES.length)];
}
export function pickWrongMessage() {
  return WRONG_MESSAGES[Math.floor(Math.random() * WRONG_MESSAGES.length)];
}
export function comboMessage(count) {
  return COMBO_MESSAGES[count] || null;
}

// --- バッジ（実績） --------------------------------------------------------
export function partAccuracy(user, partId) {
  const items = PARTS.find((p) => p.id === partId).items;
  let asked = 0, correct = 0;
  items.forEach((it) => {
    const s = user.itemStats?.[it];
    if (s) { asked += s.asked; correct += s.correct; }
  });
  return { asked, correct, acc: asked > 0 ? correct / asked : 0 };
}

export const BADGES = [
  { id: "first_step", name: "はじめの一歩", icon: "🌱", desc: "最初の1問に回答した", cond: (u) => u.totals.answered >= 1 },
  { id: "ten_questions", name: "ウォームアップ完了", icon: "🔥", desc: "累計10問に回答した", cond: (u) => u.totals.answered >= 10 },
  { id: "hundred_questions", name: "百問突破", icon: "💯", desc: "累計100問に回答した", cond: (u) => u.totals.answered >= 100 },
  { id: "five_hundred_questions", name: "問題ハンター", icon: "🏹", desc: "累計500問に回答した", cond: (u) => u.totals.answered >= 500 },
  { id: "streak_3", name: "3日坊主克服", icon: "📅", desc: "3日連続で学習した", cond: (u) => (u.streak.longest || 0) >= 3 },
  { id: "streak_7", name: "1週間継続", icon: "🗓️", desc: "7日連続で学習した", cond: (u) => (u.streak.longest || 0) >= 7 },
  { id: "streak_30", name: "習慣の達人", icon: "🏆", desc: "30日連続で学習した", cond: (u) => (u.streak.longest || 0) >= 30 },
  { id: "accuracy_ace", name: "精度の鬼", icon: "🎯", desc: "50問以上回答して正答率80%以上を達成", cond: (u) => u.totals.answered >= 50 && u.totals.correct / u.totals.answered >= 0.8 },
  { id: "hour_of_study", name: "集中の1時間", icon: "⏱️", desc: "累計学習時間1時間を達成", cond: (u) => u.totals.studySeconds >= 3600 },
  { id: "five_hours_of_study", name: "コツコツ5時間", icon: "⏳", desc: "累計学習時間5時間を達成", cond: (u) => u.totals.studySeconds >= 18000 },
  { id: "mock_challenger", name: "模試チャレンジャー", icon: "📝", desc: "模擬試験を受験した", cond: (u) => (u.mockResults || []).length >= 1 },
  { id: "mock_passer", name: "合格ライン到達", icon: "🎓", desc: "模擬試験で合格基準を達成した", cond: (u) => (u.mockResults || []).some((r) => r.passed) },
  { id: "level_5", name: "レベル5到達", icon: "⭐", desc: "レベル5に到達した", cond: (u) => levelInfo(u.xp).level >= 5 },
  { id: "level_10", name: "レベル10到達", icon: "🌟", desc: "レベル10に到達した", cond: (u) => levelInfo(u.xp).level >= 10 },
  ...PARTS.map((p) => ({
    id: `part_master_${p.id}`,
    name: `${p.shortName}マスター`,
    icon: "📚",
    desc: `「${p.name}」で15問以上回答し正答率80%以上を達成`,
    cond: (u) => { const a = partAccuracy(u, p.id); return a.asked >= 15 && a.acc >= 0.8; },
  })),
];

export function checkNewBadges(user) {
  const owned = new Set(user.badges || []);
  const newly = BADGES.filter((b) => !owned.has(b.id) && b.cond(user));
  return newly.map((b) => b.id);
}
