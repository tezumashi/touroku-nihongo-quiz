import { Storage } from "../storage.js";
import { escapeHtml, qs, qsa } from "../dom.js";
import { navigate } from "../router.js";

export function renderOnboarding(root) {
  const existingUsers = Storage.listUsers();

  root.innerHTML = `
    <div class="onboarding">
      <div class="onboarding-hero">
        <div class="onboarding-badge">登録日本語教員試験対策</div>
        <h1>コアカリ<br>マスタークエスト</h1>
        <p class="onboarding-sub">公式コアカリキュラム50項目に対応。<br>スキマ時間でコツコツ、合格ラインまで伴走します。</p>
      </div>

      <form id="onboard-form" class="card onboarding-card">
        <label class="field">
          <span>ユーザー名（ニックネームでOK）</span>
          <input id="username" type="text" maxlength="20" placeholder="例：たなか" required autocomplete="off" />
        </label>
        <label class="field">
          <span>受験予定日（任意・後で変更できます）</span>
          <input id="examDate" type="date" />
        </label>
        <label class="field">
          <span>1日の目標問題数</span>
          <select id="dailyGoal">
            <option value="5">5問（すきま時間コース）</option>
            <option value="10" selected>10問（標準コース）</option>
            <option value="20">20問（がっつりコース）</option>
          </select>
        </label>
        <button type="submit" class="btn btn-primary btn-block">学習をはじめる</button>
      </form>

      ${existingUsers.length > 0 ? `
      <div class="card">
        <div class="card-title">前回のユーザーで続ける</div>
        <div class="user-chip-list">
          ${existingUsers.map((u) => `<button class="chip user-chip" data-user="${escapeHtml(u)}">👤 ${escapeHtml(u)}</button>`).join("")}
        </div>
      </div>` : ""}
    </div>
  `;

  qs("#onboard-form", root).addEventListener("submit", (e) => {
    e.preventDefault();
    const name = qs("#username", root).value.trim();
    if (!name) return;
    const examDate = qs("#examDate", root).value || null;
    const dailyGoal = Number(qs("#dailyGoal", root).value);
    Storage.ensureUser(name);
    Storage.updateUser(name, (u) => {
      u.examDate = examDate;
      u.dailyGoal = dailyGoal;
      return u;
    });
    Storage.setCurrentUsername(name);
    navigate("/home");
  });

  qsa(".user-chip", root).forEach((btn) => {
    btn.addEventListener("click", () => {
      Storage.setCurrentUsername(btn.dataset.user);
      navigate("/home");
    });
  });
}
