// 「登録日本語教員 実践研修・養成課程コアカリキュラム」(令和6年4月1日 日本語教育部会決定) の
// 5部構成・50必須項目に対応するメタデータ。
// この分類体系は文化庁が公開している公的な制度情報であり、条文・告示等と同様に構成のみを参照している。
// 各項目の説明文・設問はすべてオリジナルで作成したものである。

export const PARTS = [
  {
    id: "bu1",
    order: 1,
    name: "社会・文化・地域",
    shortName: "社会・文化・地域",
    color: "#e0724a",
    description: "日本語教師として、様々な国・地域からの学習者と関係を築き、教育実践を行うための背景知識。",
    items: [1, 2, 3, 4, 5, 6, 7],
  },
  {
    id: "bu2",
    order: 2,
    name: "言語と社会",
    shortName: "言語と社会",
    color: "#4a90a4",
    description: "学習者を取り巻く社会とことばの関係、相互理解・相互尊重のためのコミュニケーション。",
    items: [8, 9, 10, 11, 12, 13],
  },
  {
    id: "bu3",
    order: 3,
    name: "言語と心理",
    shortName: "言語と心理",
    color: "#8a5fb0",
    description: "学習過程で起こる現象や問題、異文化適応に関する言語習得・心理の基礎知識。",
    items: [14, 15, 16, 17, 18, 19],
  },
  {
    id: "bu4",
    order: 4,
    name: "言語と教育",
    shortName: "言語と教育",
    color: "#3f9a5c",
    description: "学習者のニーズに応じた教授法・評価・授業設計など、教育実践に直結する知識。",
    items: [20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36],
  },
  {
    id: "bu5",
    order: 5,
    name: "言語",
    shortName: "言語",
    color: "#c2467e",
    description: "日本語及び言語一般に関する構造的な基礎知識と、コミュニケーション能力に関する体系。",
    items: [37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50],
  },
];

// 必須の教育内容 1〜50（項目名は公式カリキュラム表に基づく）
export const ITEMS = {
  1: { name: "世界と日本の社会と文化", part: "bu1" },
  2: { name: "日本の在留外国人施策", part: "bu1" },
  3: { name: "多文化共生（地域社会における共生）", part: "bu1" },
  4: { name: "日本語教育史", part: "bu1" },
  5: { name: "言語政策", part: "bu1" },
  6: { name: "日本語の試験", part: "bu1" },
  7: { name: "世界と日本の日本語教育事情", part: "bu1" },
  8: { name: "社会言語学", part: "bu2" },
  9: { name: "言語政策と「ことば」", part: "bu2" },
  10: { name: "コミュニケーションストラテジー", part: "bu2" },
  11: { name: "待遇・敬意表現", part: "bu2" },
  12: { name: "言語・非言語行動", part: "bu2" },
  13: { name: "多文化・多言語主義", part: "bu2" },
  14: { name: "談話理解", part: "bu3" },
  15: { name: "言語学習", part: "bu3" },
  16: { name: "習得過程（第一言語・第二言語）", part: "bu3" },
  17: { name: "学習ストラテジー", part: "bu3" },
  18: { name: "異文化受容・適応", part: "bu3" },
  19: { name: "日本語の学習・教育の情意的側面", part: "bu3" },
  20: { name: "日本語教師の資質・能力", part: "bu4" },
  21: { name: "日本語教育プログラムの理解と実践", part: "bu4" },
  22: { name: "教室・言語環境の設定", part: "bu4" },
  23: { name: "コースデザイン", part: "bu4" },
  24: { name: "教授法", part: "bu4" },
  25: { name: "教材分析・作成・開発", part: "bu4" },
  26: { name: "評価法", part: "bu4" },
  27: { name: "授業計画", part: "bu4" },
  28: { name: "教育実習", part: "bu4" },
  29: { name: "中間言語分析", part: "bu4" },
  30: { name: "授業分析・自己点検能力", part: "bu4" },
  31: { name: "目的・対象別日本語教育法", part: "bu4" },
  32: { name: "異文化間教育", part: "bu4" },
  33: { name: "異文化コミュニケーション", part: "bu4" },
  34: { name: "コミュニケーション教育", part: "bu4" },
  35: { name: "日本語教育とICT", part: "bu4" },
  36: { name: "著作権", part: "bu4" },
  37: { name: "一般言語学", part: "bu5" },
  38: { name: "対照言語学", part: "bu5" },
  39: { name: "日本語教育のための日本語分析", part: "bu5" },
  40: { name: "日本語教育のための音韻・音声体系", part: "bu5" },
  41: { name: "日本語教育のための文字と表記", part: "bu5" },
  42: { name: "日本語教育のための形態・語彙体系", part: "bu5" },
  43: { name: "日本語教育のための文法体系", part: "bu5" },
  44: { name: "日本語教育のための意味体系", part: "bu5" },
  45: { name: "日本語教育のための語用論的規範", part: "bu5" },
  46: { name: "受容・理解能力", part: "bu5" },
  47: { name: "言語運用能力", part: "bu5" },
  48: { name: "社会文化能力", part: "bu5" },
  49: { name: "対人関係能力", part: "bu5" },
  50: { name: "異文化調整能力", part: "bu5" },
};

export function partOf(itemNo) {
  return ITEMS[itemNo]?.part;
}

export function getPart(partId) {
  return PARTS.find((p) => p.id === partId);
}
