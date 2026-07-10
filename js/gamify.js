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

// 正答率が高い水準に達している必須項目の数（asked回数・正答率のしきい値付き）
export function itemMasteryCount(user, minAsked, minAcc) {
  return Object.values(user.itemStats || {}).filter(
    (s) => s.asked >= minAsked && s.correct / s.asked >= minAcc
  ).length;
}

// SRSの箱がminBox以上に到達した（＝十分に定着したとみなせる）設問数
export function srsMasteryCount(user, minBox) {
  return Object.values(user.questionSrs || {}).filter((s) => (s.box || 1) >= minBox).length;
}

// 直近7日間（本日を含む）、毎日「1日の目標問題数」を達成できているか
export function perfectWeekAchieved(user) {
  const goal = user.dailyGoal || 10;
  for (let i = 0; i < 7; i++) {
    const iso = todayISO(new Date(Date.now() - i * 86400000));
    const log = user.dailyLog?.[iso];
    if (!log || log.answered < goal) return false;
  }
  return true;
}

const PART_TIERS = [
  { key: "bronze", icon: "🥉", label: "ブロンズ", minAsked: 15, minAcc: 0.6 },
  { key: "silver", icon: "🥈", label: "シルバー", minAsked: 30, minAcc: 0.8 },
  { key: "gold", icon: "🥇", label: "ゴールド", minAsked: 60, minAcc: 0.95 },
];

const ITEM_MILESTONES = [5, 15, 25, 40, 50];
const MASTERY_MILESTONES = [10, 30, 60, 100, 200];
const MAX_BOX_FOR_MASTERY = 5;

export const BADGES = [
  // --- はじめの一歩 ---
  { id: "first_step", name: "はじめの一歩", icon: "🌱", category: "はじめの一歩", desc: "最初の1問に回答した", cond: (u) => u.totals.answered >= 1 },
  { id: "ten_questions", name: "ウォームアップ完了", icon: "🔥", category: "はじめの一歩", desc: "累計10問に回答した", cond: (u) => u.totals.answered >= 10 },

  // --- 累計問題数 ---
  { id: "hundred_questions", name: "百問突破", icon: "💯", category: "累計問題数", desc: "累計100問に回答した", cond: (u) => u.totals.answered >= 100 },
  { id: "five_hundred_questions", name: "問題ハンター", icon: "🏹", category: "累計問題数", desc: "累計500問に回答した", cond: (u) => u.totals.answered >= 500 },
  { id: "thousand_questions", name: "千本ノック", icon: "🎯", category: "累計問題数", desc: "累計1,000問に回答した", cond: (u) => u.totals.answered >= 1000 },
  { id: "two_thousand_questions", name: "問題コレクター", icon: "🗃️", category: "累計問題数", desc: "累計2,000問に回答した", cond: (u) => u.totals.answered >= 2000 },
  { id: "three_thousand_questions", name: "鉄人", icon: "🦾", category: "累計問題数", desc: "累計3,000問に回答した", cond: (u) => u.totals.answered >= 3000 },
  { id: "five_thousand_questions", name: "生ける問題集", icon: "📖", category: "累計問題数", desc: "累計5,000問に回答した", cond: (u) => u.totals.answered >= 5000 },

  // --- 連続学習日数 ---
  { id: "streak_3", name: "3日坊主克服", icon: "📅", category: "連続学習日数", desc: "3日連続で学習した", cond: (u) => (u.streak.longest || 0) >= 3 },
  { id: "streak_7", name: "1週間継続", icon: "🗓️", category: "連続学習日数", desc: "7日連続で学習した", cond: (u) => (u.streak.longest || 0) >= 7 },
  { id: "streak_14", name: "2週間継続", icon: "🗓️", category: "連続学習日数", desc: "14日連続で学習した", cond: (u) => (u.streak.longest || 0) >= 14 },
  { id: "streak_30", name: "習慣の達人", icon: "🏆", category: "連続学習日数", desc: "30日連続で学習した", cond: (u) => (u.streak.longest || 0) >= 30 },
  { id: "streak_60", name: "揺るがぬ習慣", icon: "🏵️", category: "連続学習日数", desc: "60日連続で学習した", cond: (u) => (u.streak.longest || 0) >= 60 },
  { id: "streak_100", name: "継続は力なり", icon: "💪", category: "連続学習日数", desc: "100日連続で学習した", cond: (u) => (u.streak.longest || 0) >= 100 },
  { id: "streak_200", name: "不屈の学習者", icon: "🛡️", category: "連続学習日数", desc: "200日連続で学習した", cond: (u) => (u.streak.longest || 0) >= 200 },
  { id: "streak_365", name: "皆勤の一年", icon: "👑", category: "連続学習日数", desc: "365日連続で学習した", cond: (u) => (u.streak.longest || 0) >= 365 },

  // --- 正答率 ---
  { id: "accuracy_ace", name: "精度の鬼", icon: "🎯", category: "正答率", desc: "50問以上回答して正答率80%以上を達成", cond: (u) => u.totals.answered >= 50 && u.totals.correct / u.totals.answered >= 0.8 },
  { id: "accuracy_master", name: "精密射撃手", icon: "🏹", category: "正答率", desc: "300問以上回答して正答率85%以上を達成", cond: (u) => u.totals.answered >= 300 && u.totals.correct / u.totals.answered >= 0.85 },
  { id: "accuracy_legend", name: "生きる正答率", icon: "💎", category: "正答率", desc: "1,000問以上回答して正答率90%以上を達成", cond: (u) => u.totals.answered >= 1000 && u.totals.correct / u.totals.answered >= 0.9 },

  // --- 学習時間 ---
  { id: "hour_of_study", name: "集中の1時間", icon: "⏱️", category: "学習時間", desc: "累計学習時間1時間を達成", cond: (u) => u.totals.studySeconds >= 3600 },
  { id: "five_hours_of_study", name: "コツコツ5時間", icon: "⏳", category: "学習時間", desc: "累計学習時間5時間を達成", cond: (u) => u.totals.studySeconds >= 18000 },
  { id: "ten_hours_of_study", name: "積み上げ10時間", icon: "🕰️", category: "学習時間", desc: "累計学習時間10時間を達成", cond: (u) => u.totals.studySeconds >= 36000 },
  { id: "twenty_five_hours", name: "四半世紀の集中", icon: "🧭", category: "学習時間", desc: "累計学習時間25時間を達成", cond: (u) => u.totals.studySeconds >= 90000 },
  { id: "fifty_hours", name: "研鑽の50時間", icon: "⚒️", category: "学習時間", desc: "累計学習時間50時間を達成", cond: (u) => u.totals.studySeconds >= 180000 },
  { id: "hundred_hours", name: "百時間の求道者", icon: "🕯️", category: "学習時間", desc: "累計学習時間100時間を達成", cond: (u) => u.totals.studySeconds >= 360000 },

  // --- 模擬試験 ---
  { id: "mock_challenger", name: "模試チャレンジャー", icon: "📝", category: "模擬試験", desc: "模擬試験を受験した", cond: (u) => (u.mockResults || []).length >= 1 },
  { id: "mock_passer", name: "合格ライン到達", icon: "🎓", category: "模擬試験", desc: "模擬試験で合格基準を達成した", cond: (u) => (u.mockResults || []).some((r) => r.passed) },
  { id: "mock_passer_3", name: "安定の合格力", icon: "🎓", category: "模擬試験", desc: "模擬試験で3回、合格基準を達成した", cond: (u) => (u.mockResults || []).filter((r) => r.passed).length >= 3 },
  { id: "mock_passer_5", name: "合格の常連", icon: "🏅", category: "模擬試験", desc: "模擬試験で5回、合格基準を達成した", cond: (u) => (u.mockResults || []).filter((r) => r.passed).length >= 5 },
  { id: "mock_perfect", name: "模試パーフェクト", icon: "🌟", category: "模擬試験", desc: "模擬試験で全問正解を達成した", cond: (u) => (u.mockResults || []).some((r) => r.totalQ > 0 && r.correct === r.totalQ) },
  { id: "mock_veteran", name: "模試ベテラン", icon: "🎖️", category: "模擬試験", desc: "模擬試験を10回受験した", cond: (u) => (u.mockResults || []).length >= 10 },

  // --- レベル ---
  { id: "level_5", name: "レベル5到達", icon: "⭐", category: "レベル", desc: "レベル5に到達した", cond: (u) => levelInfo(u.xp).level >= 5 },
  { id: "level_10", name: "レベル10到達", icon: "🌟", category: "レベル", desc: "レベル10に到達した", cond: (u) => levelInfo(u.xp).level >= 10 },
  { id: "level_15", name: "レベル15到達", icon: "✨", category: "レベル", desc: "レベル15に到達した", cond: (u) => levelInfo(u.xp).level >= 15 },
  { id: "level_20", name: "レベル20到達", icon: "🌠", category: "レベル", desc: "レベル20に到達した", cond: (u) => levelInfo(u.xp).level >= 20 },
  { id: "level_30", name: "レベル30到達", icon: "☄️", category: "レベル", desc: "レベル30に到達した", cond: (u) => levelInfo(u.xp).level >= 30 },
  { id: "level_50", name: "レベル50到達", icon: "🌌", category: "レベル", desc: "レベル50に到達した", cond: (u) => levelInfo(u.xp).level >= 50 },

  // --- 分野マスター（部ごとにブロンズ・シルバー・ゴールドの3段階） ---
  ...PARTS.flatMap((p) => PART_TIERS.map((tier) => ({
    id: `part_${tier.key}_${p.id}`,
    name: `${p.shortName}マスター${tier.label}`,
    icon: tier.icon,
    category: "分野マスター",
    desc: `「${p.name}」で${tier.minAsked}問以上回答し正答率${Math.round(tier.minAcc * 100)}%以上を達成`,
    cond: (u) => { const a = partAccuracy(u, p.id); return a.asked >= tier.minAsked && a.acc >= tier.minAcc; },
  }))),

  // --- 項目制覇（50必須項目のうち、正答率80%以上に達した項目数） ---
  ...ITEM_MILESTONES.map((n) => ({
    id: `items_${n}`,
    name: n >= 50 ? "全項目制覇" : `項目制覇 ${n}`,
    icon: n >= 50 ? "🏯" : "🚩",
    category: "項目制覇",
    desc: `50必須項目のうち${n}項目で、3問以上回答し正答率80%以上を達成`,
    cond: (u) => itemMasteryCount(u, 3, 0.8) >= n,
  })),

  // --- 苦手克服（間隔反復で十分に定着した設問の数） ---
  ...MASTERY_MILESTONES.map((n) => ({
    id: `mastery_${n}`,
    name: `苦手克服 ${n}`,
    icon: "🧠",
    category: "苦手克服",
    desc: `間隔反復で${n}問の設問を十分に定着させた`,
    cond: (u) => srsMasteryCount(u, MAX_BOX_FOR_MASTERY) >= n,
  })),

  // --- 習慣 ---
  { id: "perfect_week", name: "パーフェクトウィーク", icon: "📆", category: "習慣", desc: "直近7日間、毎日目標問題数を達成した", cond: perfectWeekAchieved },
  { id: "early_bird", name: "早起きは三文の徳", icon: "🌅", category: "習慣", desc: "朝5時〜8時の時間帯に学習した", cond: (u) => !!u.timeFlags?.earlyBird },
  { id: "night_owl", name: "夜型学習者", icon: "🌙", category: "習慣", desc: "22時以降の時間帯に学習した", cond: (u) => !!u.timeFlags?.nightOwl },

  // --- 総仕上げ ---
  {
    id: "grand_master",
    name: "コアカリ グランドマスター",
    icon: "🏛️",
    category: "総仕上げ",
    desc: "レベル30以上・累計3,000問以上・学習時間50時間以上・全50項目で正答率85%以上（各5問以上）を達成",
    cond: (u) =>
      levelInfo(u.xp).level >= 30 &&
      u.totals.answered >= 3000 &&
      u.totals.studySeconds >= 180000 &&
      itemMasteryCount(u, 5, 0.85) >= 50,
  },
];

export function checkNewBadges(user) {
  const owned = new Set(user.badges || []);
  const newly = BADGES.filter((b) => !owned.has(b.id) && b.cond(user));
  return newly.map((b) => b.id);
}
