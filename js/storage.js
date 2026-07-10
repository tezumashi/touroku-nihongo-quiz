// localStorageベースの永続化レイヤー。ユーザーはユーザー名で切り替え可能なローカルプロフィールとして管理する。
//
// データの永続性について：
// - このアプリのコード（HTML/CSS/JS）を更新・再デプロイしても、localStorageの中身は消えない
//   （別々のブラウザストレージ機構であり、Service Workerのアセットキャッシュ更新とも無関係）。
// - ただし将来ユーザーオブジェクトの形（フィールド構成）を変更した場合に備え、
//   読み込み時は必ず normalizeUser() を通し、defaultUser() を土台に不足フィールドを補いながら
//   既存データを保持する（＝新しいフィールドが増えても、古いセーブデータが壊れて読めなくなることはない）。
const DB_KEY = "tnq:v1";
const SCHEMA_VERSION = 1;

function todayISO(d = new Date()) {
  const tz = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return tz.toISOString().slice(0, 10);
}

function loadDB() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) return { schemaVersion: SCHEMA_VERSION, currentUser: null, users: {} };
    const parsed = JSON.parse(raw);
    if (!parsed.users) parsed.users = {};
    if (!parsed.schemaVersion) parsed.schemaVersion = SCHEMA_VERSION;
    return parsed;
  } catch (e) {
    console.error("DB読み込みに失敗しました。データは保持されたままなので、上書き保存されるまでは失われません。", e);
    return { schemaVersion: SCHEMA_VERSION, currentUser: null, users: {} };
  }
}

function saveDB(db) {
  db.schemaVersion = SCHEMA_VERSION;
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

// defaults側の形を土台に、saved側の値で上書きしていく再帰マージ。
// - オブジェクトは再帰的にマージ（＝defaultsにしかないキーは補われ、savedの既存値は保持される）
// - 配列・プリミティブはsavedの値をそのまま採用（savedに存在しない場合のみdefaultsを使う）
function deepMergeDefaults(defaults, saved) {
  if (saved === undefined || saved === null) return structuredClone(defaults);
  if (Array.isArray(defaults) || Array.isArray(saved)) return saved;
  if (typeof defaults === "object" && typeof saved === "object") {
    const merged = { ...saved };
    for (const key of Object.keys(defaults)) {
      merged[key] = deepMergeDefaults(defaults[key], saved[key]);
    }
    return merged;
  }
  return saved;
}

// 保存済みユーザーデータを最新のデフォルト構造に合わせて補完する。
// 将来フィールドを追加・変更しても、この関数を通す限り古いセーブデータが破損して読めなくなることはない。
function normalizeUser(username, saved) {
  return deepMergeDefaults(defaultUser(username), saved || {});
}

function defaultUser(username) {
  return {
    username,
    createdAt: todayISO(),
    examDate: null,
    dailyGoal: 10,
    xp: 0,
    streak: { current: 0, longest: 0, lastStudyDate: null, freezeUsedWeek: null },
    totals: { answered: 0, correct: 0, studySeconds: 0 },
    dailyLog: {}, // dateISO -> {answered, correct, seconds}
    itemStats: {}, // itemNo -> {asked, correct}
    questionSrs: {}, // questionId -> {box, dueDate, seen, correct, wrong, lastResult}
    badges: [],
    mockResults: [],
  };
}

export const Storage = {
  todayISO,

  listUsers() {
    const db = loadDB();
    return Object.keys(db.users);
  },

  getCurrentUsername() {
    const db = loadDB();
    return db.currentUser;
  },

  setCurrentUsername(username) {
    const db = loadDB();
    db.currentUser = username;
    saveDB(db);
  },

  ensureUser(username) {
    const db = loadDB();
    if (!db.users[username]) {
      db.users[username] = defaultUser(username);
      saveDB(db);
    } else {
      // 既存データを最新の形に補完して保存し直す（新フィールド追加時の自動移行）
      const normalized = normalizeUser(username, db.users[username]);
      db.users[username] = normalized;
      saveDB(db);
    }
    return db.users[username];
  },

  getUser(username) {
    const db = loadDB();
    if (!db.users[username]) return null;
    return normalizeUser(username, db.users[username]);
  },

  updateUser(username, updaterFn) {
    const db = loadDB();
    const current = normalizeUser(username, db.users[username]);
    const next = updaterFn(structuredClone(current));
    db.users[username] = next;
    saveDB(db);
    return next;
  },

  // JSONバックアップ（エクスポート機能で出力したもの）からユーザーを復元する。
  // 端末の入れ替え・データ破損時などの復旧手段。既存の同名プロフィールは上書きされる。
  importUser(username, jsonString) {
    let parsed;
    try {
      parsed = JSON.parse(jsonString);
    } catch (e) {
      throw new Error("ファイルの形式が正しくありません（JSONとして読み込めませんでした）");
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("ファイルの内容がユーザーデータの形式と一致しません");
    }
    const db = loadDB();
    db.users[username] = normalizeUser(username, parsed);
    saveDB(db);
    return db.users[username];
  },

  deleteUser(username) {
    const db = loadDB();
    delete db.users[username];
    if (db.currentUser === username) db.currentUser = null;
    saveDB(db);
  },

  exportUser(username) {
    const db = loadDB();
    return JSON.stringify(db.users[username], null, 2);
  },

  resetUserProgress(username) {
    return this.updateUser(username, (u) => {
      const fresh = defaultUser(username);
      fresh.examDate = u.examDate;
      fresh.dailyGoal = u.dailyGoal;
      fresh.createdAt = u.createdAt;
      return fresh;
    });
  },
};

export { todayISO };
