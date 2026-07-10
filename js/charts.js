import { escapeHtml } from "./dom.js";
import { todayISO } from "./storage.js";

// 5軸レーダーチャート（各部の正答率を可視化。0.6ラインを合格基準の目安として点線表示）
export function radarChartSVG(axes, { size = 260, threshold = 0.6 } = {}) {
  const n = axes.length;
  const center = size / 2;
  const radius = size / 2 - 46;
  const angleFor = (i) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const pt = (i, r) => {
    const a = angleFor(i);
    return [center + r * Math.cos(a), center + r * Math.sin(a)];
  };

  const gridLevels = [0.25, 0.5, 0.75, 1];
  const gridPolys = gridLevels
    .map((lv) => {
      const pts = axes.map((_, i) => pt(i, radius * lv).join(",")).join(" ");
      return `<polygon points="${pts}" class="radar-grid" />`;
    })
    .join("");

  const axisLines = axes
    .map((ax, i) => {
      const [x, y] = pt(i, radius);
      const [lx, ly] = pt(i, radius + 22);
      return `<line x1="${center}" y1="${center}" x2="${x}" y2="${y}" class="radar-axis" />
        <text x="${lx}" y="${ly}" class="radar-label" text-anchor="middle" dominant-baseline="middle">${escapeHtml(ax.label)}</text>`;
    })
    .join("");

  const thresholdPts = axes.map((_, i) => pt(i, radius * threshold).join(",")).join(" ");
  const valuePts = axes.map((ax, i) => pt(i, radius * Math.max(0, Math.min(1, ax.value))).join(",")).join(" ");

  const dots = axes
    .map((ax, i) => {
      const [x, y] = pt(i, radius * Math.max(0, Math.min(1, ax.value)));
      return `<circle cx="${x}" cy="${y}" r="4" class="radar-dot" />`;
    })
    .join("");

  return `<svg viewBox="0 0 ${size} ${size}" class="radar-svg" role="img" aria-label="分野別正答率レーダーチャート">
    ${gridPolys}${axisLines}
    <polygon points="${thresholdPts}" class="radar-threshold" />
    <polygon points="${valuePts}" class="radar-value" />
    ${dots}
  </svg>`;
}

// 学習カレンダーヒートマップ（直近84日、GitHub風）
export function heatmapSVG(dailyLog, { weeks = 12 } = {}) {
  const days = weeks * 7;
  const cell = 12, gap = 3;
  const w = weeks * (cell + gap);
  const h = 7 * (cell + gap);
  const today = new Date(todayISO() + "T00:00:00");
  const start = new Date(today);
  start.setDate(start.getDate() - (days - 1));
  // 開始日を週の月曜に揃える
  const startDow = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - startDow);

  let rects = "";
  for (let w2 = 0; w2 < weeks + 1; w2++) {
    for (let d = 0; d < 7; d++) {
      const date = new Date(start);
      date.setDate(date.getDate() + w2 * 7 + d);
      if (date > today) continue;
      const iso = todayISO(date);
      const log = dailyLog[iso];
      const count = log ? log.answered : 0;
      let level = 0;
      if (count > 0) level = 1;
      if (count >= 5) level = 2;
      if (count >= 10) level = 3;
      if (count >= 20) level = 4;
      rects += `<rect x="${w2 * (cell + gap)}" y="${d * (cell + gap)}" width="${cell}" height="${cell}" rx="3" class="heat-lv${level}"><title>${iso}: ${count}問</title></rect>`;
    }
  }
  return `<svg viewBox="0 0 ${w} ${h}" class="heatmap-svg" role="img" aria-label="学習カレンダー">${rects}</svg>`;
}

export function progressRing(value, { size = 64, stroke = 7, colorClass = "" } = {}) {
  const r = size / 2 - stroke;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return `<svg viewBox="0 0 ${size} ${size}" class="ring-svg ${colorClass}">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="ring-bg" stroke-width="${stroke}" fill="none" />
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="ring-fg" stroke-width="${stroke}" fill="none"
      stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - v)}" transform="rotate(-90 ${size / 2} ${size / 2})" />
  </svg>`;
}
