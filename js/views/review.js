import { Storage } from "../storage.js";
import { qs } from "../dom.js";
import { navigate } from "../router.js";
import { dueReviewCount } from "../quiz-engine.js";

export function renderReview(root) {
  const username = Storage.getCurrentUsername();
  const user = Storage.getUser(username);
  if (!user) { navigate("/onboarding"); return; }

  const due = dueReviewCount(user);
  const seenCount = Object.keys(user.questionSrs || {}).length;

  root.innerHTML = `
    <div class="review-view">
      <h2 class="page-title">苦手克服トレーニング</h2>
      <div class="card center-note">
        <div class="empty-emoji">${due > 0 ? "🧠" : "✨"}</div>
        <p>${due > 0
          ? `間隔反復アルゴリズムが選んだ、今まさに復習すべき問題が <strong>${due}問</strong> あります。`
          : "現在、復習期日が来ている問題はありません。よい状態をキープしています！"}</p>
        <p class="muted small">忘れかけた頃にもう一度出題する「間隔反復（SRS）」方式で、記憶の定着を助けます。間違えた問題は次回すぐに、正解が続いた問題は少しずつ間隔を空けて出題されます。</p>
        <button class="btn btn-primary btn-block" id="start-review" ${due === 0 ? "disabled" : ""}>${due > 0 ? "復習を始める" : "復習対象がありません"}</button>
        ${due === 0 ? `<button class="btn btn-ghost btn-block" id="go-smart">代わりに今日の学習をする</button>` : ""}
      </div>
      <div class="card">
        <div class="card-title">これまでに学習した問題</div>
        <div class="muted small">累計 ${seenCount}問 に一度は取り組みました。</div>
      </div>
    </div>
  `;

  const startBtn = qs("#start-review", root);
  if (due > 0) startBtn.addEventListener("click", () => navigate("/quiz?mode=review&limit=30"));
  const smartBtn = qs("#go-smart", root);
  if (smartBtn) smartBtn.addEventListener("click", () => navigate("/quiz?mode=smart&limit=10"));
}
