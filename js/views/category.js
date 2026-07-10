import { Storage } from "../storage.js";
import { escapeHtml, qs, qsa } from "../dom.js";
import { navigate } from "../router.js";
import { partAccuracy } from "../gamify.js";
import { PARTS, ITEMS } from "../../data/curriculum.js";
import { getQuestionsByItem } from "../../data/questions.js";

export function renderCategory(root) {
  const username = Storage.getCurrentUsername();
  const user = Storage.getUser(username);
  if (!user) { navigate("/onboarding"); return; }

  const partsHtml = PARTS.map((p) => {
    const a = partAccuracy(user, p.id);
    const pct = a.asked > 0 ? Math.round(a.acc * 100) : null;
    const itemsHtml = p.items.map((itemNo) => {
      const st = user.itemStats[itemNo];
      const iAcc = st && st.asked > 0 ? Math.round((st.correct / st.asked) * 100) : null;
      const qCount = getQuestionsByItem(itemNo).length;
      return `
        <button class="item-row" data-item="${itemNo}">
          <span class="item-num">${itemNo}</span>
          <span class="item-name">${escapeHtml(ITEMS[itemNo].name)}</span>
          <span class="item-acc ${iAcc === null ? "muted" : iAcc >= 60 ? "ok" : "warn"}">${iAcc === null ? `${qCount}問` : iAcc + "%"}</span>
        </button>`;
    }).join("");

    return `
      <div class="part-accordion">
        <button class="part-head" data-part="${p.id}" style="border-left:5px solid ${p.color}">
          <div class="part-head-text">
            <div class="part-name">${escapeHtml(p.name)}</div>
            <div class="muted small">${escapeHtml(p.description)}</div>
          </div>
          <div class="part-acc-wrap">
            <span class="${pct === null ? "muted" : pct >= 60 ? "ok" : "warn"}">${pct === null ? "未着手" : pct + "%"}</span>
            <button class="btn btn-small" data-start-part="${p.id}">この部で学習</button>
          </div>
        </button>
        <div class="part-body hidden" id="body-${p.id}">${itemsHtml}</div>
      </div>`;
  }).join("");

  root.innerHTML = `
    <div class="category-view">
      <h2 class="page-title">分野を選んで学習</h2>
      <p class="muted small">公式コアカリキュラム5部・50必須項目に対応しています。項目をタップすると集中トレーニングが始まります。</p>
      ${partsHtml}
    </div>
  `;

  qsa(".part-head", root).forEach((btn) => {
    btn.addEventListener("click", (e) => {
      if (e.target.closest("[data-start-part]")) return;
      const body = qs(`#body-${btn.dataset.part}`, root);
      body.classList.toggle("hidden");
    });
  });

  qsa("[data-start-part]", root).forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      navigate(`/quiz?mode=category&part=${btn.dataset.startPart}&limit=12`);
    });
  });

  qsa(".item-row", root).forEach((btn) => {
    btn.addEventListener("click", () => {
      navigate(`/quiz?mode=category&item=${btn.dataset.item}&limit=8`);
    });
  });
}
