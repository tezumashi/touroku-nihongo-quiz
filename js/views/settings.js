import { Storage } from "../storage.js";
import { escapeHtml, qs, qsa } from "../dom.js";
import { navigate } from "../router.js";

export function renderSettings(root) {
  const username = Storage.getCurrentUsername();
  const user = Storage.getUser(username);
  if (!user) { navigate("/onboarding"); return; }

  const others = Storage.listUsers().filter((u) => u !== username);
  const notifSupported = "Notification" in window;
  const notifStatus = notifSupported ? Notification.permission : "unsupported";

  root.innerHTML = `
    <div class="settings-view">
      <h2 class="page-title">設定</h2>

      <div class="card">
        <div class="card-title">プロフィール</div>
        <label class="field"><span>ユーザー名</span><div class="static-value">${escapeHtml(username)}</div></label>
        <label class="field"><span>受験予定日</span><input id="examDate" type="date" value="${user.examDate || ""}" /></label>
        <label class="field"><span>1日の目標問題数</span>
          <select id="dailyGoal">
            <option value="5" ${user.dailyGoal === 5 ? "selected" : ""}>5問</option>
            <option value="10" ${user.dailyGoal === 10 ? "selected" : ""}>10問</option>
            <option value="20" ${user.dailyGoal === 20 ? "selected" : ""}>20問</option>
          </select>
        </label>
        <button class="btn btn-primary btn-block" id="save-profile">保存する</button>
      </div>

      <div class="card">
        <div class="card-title">通知</div>
        <p class="muted small">アプリを開いている間、学習をリマインドする通知を許可できます（対応ブラウザのみ）。</p>
        <button class="btn btn-block" id="notif-btn" ${!notifSupported ? "disabled" : ""}>
          ${notifStatus === "granted" ? "通知は有効です ✓" : notifSupported ? "通知を許可する" : "このブラウザは非対応です"}
        </button>
      </div>

      <div class="card">
        <div class="card-title">ユーザー切り替え</div>
        ${others.length === 0 ? `<div class="muted small">他のユーザーはいません。</div>` : `
          <div class="user-chip-list">${others.map((u) => `<button class="chip user-chip" data-switch="${escapeHtml(u)}">👤 ${escapeHtml(u)}</button>`).join("")}</div>
        `}
        <button class="btn btn-ghost btn-block" id="add-user">新しいユーザーを追加</button>
      </div>

      <div class="card">
        <div class="card-title">データ管理</div>
        <p class="muted small">アプリを更新しても学習記録が自動で消えることはありませんが、機種変更や万一の破損に備えて、ときどきバックアップの保存をおすすめします。</p>
        <button class="btn btn-block" id="export-btn">学習データをバックアップ（JSON書き出し）</button>
        <button class="btn btn-block" id="import-btn">バックアップから復元する</button>
        <input type="file" id="import-file" accept="application/json" class="hidden" />
        <div id="import-msg" class="muted small"></div>
        <button class="btn btn-block btn-danger" id="reset-btn">この端末の学習記録をリセット</button>
      </div>
    </div>
  `;

  qs("#save-profile", root).addEventListener("click", () => {
    const examDate = qs("#examDate", root).value || null;
    const dailyGoal = Number(qs("#dailyGoal", root).value);
    Storage.updateUser(username, (u) => { u.examDate = examDate; u.dailyGoal = dailyGoal; return u; });
    navigate("/home");
  });

  const notifBtn = qs("#notif-btn", root);
  if (notifBtn && notifSupported) {
    notifBtn.addEventListener("click", async () => {
      const perm = await Notification.requestPermission();
      if (perm === "granted") new Notification("通知を有効にしました", { body: "毎日の学習を応援します！" });
      renderSettings(root);
    });
  }

  qsa("[data-switch]", root).forEach((btn) => {
    btn.addEventListener("click", () => { Storage.setCurrentUsername(btn.dataset.switch); navigate("/home"); });
  });

  qs("#add-user", root).addEventListener("click", () => {
    Storage.setCurrentUsername(null);
    navigate("/onboarding");
  });

  qs("#export-btn", root).addEventListener("click", () => {
    const data = Storage.exportUser(username);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `touroku-nihongo-${username}-${Storage.todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  const importBtn = qs("#import-btn", root);
  const importFile = qs("#import-file", root);
  const importMsg = qs("#import-msg", root);
  importBtn.addEventListener("click", () => importFile.click());
  importFile.addEventListener("change", () => {
    const file = importFile.files[0];
    if (!file) return;
    if (!confirm(`「${file.name}」の内容で、現在のユーザー「${username}」のデータを上書きします。よろしいですか？`)) {
      importFile.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        Storage.importUser(username, reader.result);
        importMsg.textContent = "復元しました。ホームに戻ります…";
        importMsg.classList.add("ok");
        setTimeout(() => navigate("/home"), 800);
      } catch (e) {
        importMsg.textContent = `復元に失敗しました：${e.message}`;
        importMsg.classList.add("warn");
      }
    };
    reader.readAsText(file);
  });

  qs("#reset-btn", root).addEventListener("click", () => {
    if (confirm("本当にこの端末の学習記録をすべてリセットしますか？この操作は取り消せません。")) {
      Storage.resetUserProgress(username);
      navigate("/home");
    }
  });
}
