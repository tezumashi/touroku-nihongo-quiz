import { Storage } from "../storage.js";
import { qs, qsa, fmtDateJP } from "../dom.js";
import { navigate } from "../router.js";
import { ALL_QUESTIONS } from "../../data/questions.js";

export function renderMock(root) {
  const username = Storage.getCurrentUsername();
  const user = Storage.getUser(username);
  if (!user) { navigate("/onboarding"); return; }

  const history = (user.mockResults || []).slice(-5).reverse();

  root.innerHTML = `
    <div class="mock-view">
      <h2 class="page-title">模擬試験</h2>
      <p class="muted small">基礎試験の形式（5区分から出題・各区分6割以上&総合8割以上で合格）を模したモードです。</p>

      <div class="card mock-option">
        <div class="mock-option-title">🏃 ショート模試</div>
        <div class="muted small">25問・時間制限30分。実力確認にぴったり。</div>
        <button class="btn btn-primary btn-block" data-mode="short">ショート模試を始める</button>
      </div>

      <div class="card mock-option">
        <div class="mock-option-title">🏆 フル模試</div>
        <div class="muted small">${Math.min(60, ALL_QUESTIONS.length)}問・時間制限70分。本番に近い集中力で挑戦しましょう。</div>
        <button class="btn btn-primary btn-block" data-mode="full">フル模試を始める</button>
      </div>

      ${history.length > 0 ? `
      <div class="card">
        <div class="card-title">これまでの模試結果</div>
        ${history.map((r) => `
          <div class="mock-history-row">
            <span>${fmtDateJP(r.date)}</span>
            <span>${r.correct}/${r.totalQ}問</span>
            <span class="${r.passed ? "ok" : "warn"}">${r.passed ? "合格ライン到達" : "対策継続"}</span>
          </div>`).join("")}
      </div>` : ""}
    </div>
  `;

  qsa("[data-mode]", root).forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.dataset.mode === "short") navigate("/quiz?mode=mock&limit=25&time=1800");
      else navigate(`/quiz?mode=mock&limit=${Math.min(60, ALL_QUESTIONS.length)}&time=4200`);
    });
  });
}
