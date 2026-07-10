// リザルト画面用の応援マスコット。成績（正答率）に応じて表情・動き・演出のトーンを変える。
// 「okay」帯でも表情はネガティブにせず、常に前向きなトーンを保つ。

export function mascotMood(accuracy) {
  if (accuracy == null || Number.isNaN(accuracy)) return "okay";
  if (accuracy >= 0.8) return "excellent";
  if (accuracy >= 0.5) return "good";
  return "okay";
}

const MESSAGES = {
  excellent: [
    "すごい！パーフェクトに近い出来だよ！",
    "その調子、完全に波に乗ってる！",
    "これは自慢していいレベルの結果！",
    "今日のキミ、最強すぎる！",
    "合格がぐっと近づいた気がする！",
  ],
  good: [
    "よく頑張ったね、着実に力がついてる証拠だよ！",
    "いいペース！このまま続けよう。",
    "合格ラインが見えてきたよ、いい調子！",
    "今日もコツコツ、えらい！",
    "地道な積み重ね、ちゃんと結果に出てるよ。",
  ],
  okay: [
    "今日も机に向かえたことがまず勝ちだよ！",
    "間違えた問題は伸びしろのサイン。一緒に見直そう！",
    "焦らなくて大丈夫、着実に前進してる！",
    "今日の積み重ねが後で必ず効いてくるよ！",
    "ここからが伸びどき。次、一緒に見返してやろう！",
  ],
};

export function mascotMessage(mood) {
  const pool = MESSAGES[mood] || MESSAGES.okay;
  return pool[Math.floor(Math.random() * pool.length)];
}

function faceParts(mood) {
  if (mood === "excellent") {
    return {
      eyeL: `<path d="M56 64 Q64 54 72 64" stroke="#2b3a37" stroke-width="4.5" fill="none" stroke-linecap="round"/>`,
      eyeR: `<path d="M88 64 Q96 54 104 64" stroke="#2b3a37" stroke-width="4.5" fill="none" stroke-linecap="round"/>`,
      mouth: `<path d="M60 87 Q80 86 100 87 Q96 106 80 106 Q64 106 60 87 Z" fill="#2b3a37"/>
              <path d="M68 92 Q80 100 92 92" stroke="#ff9d9d" stroke-width="3" fill="none" stroke-linecap="round"/>`,
    };
  }
  if (mood === "good") {
    return {
      eyeL: `<path d="M57 64 Q64 56 71 64" stroke="#2b3a37" stroke-width="4.5" fill="none" stroke-linecap="round"/>`,
      eyeR: `<path d="M89 64 Q96 56 103 64" stroke="#2b3a37" stroke-width="4.5" fill="none" stroke-linecap="round"/>`,
      mouth: `<path d="M64 88 Q80 100 96 88" stroke="#2b3a37" stroke-width="4.5" fill="none" stroke-linecap="round"/>`,
    };
  }
  return {
    eyeL: `<circle cx="63" cy="66" r="5" fill="#2b3a37"/>`,
    eyeR: `<circle cx="97" cy="66" r="5" fill="#2b3a37"/>`,
    mouth: `<path d="M66 90 Q80 99 94 90" stroke="#2b3a37" stroke-width="4" fill="none" stroke-linecap="round"/>`,
  };
}

function armsMarkup(mood) {
  // 腕は肩付近を transform-origin にして、CSSアニメーション側で角度を振る
  return `
    <g class="mascot-armL" style="transform-origin: 38px 80px;">
      <ellipse cx="30" cy="86" rx="11" ry="19" fill="#7fc999" stroke="#4f9e73" stroke-width="2"/>
    </g>
    <g class="mascot-armR" style="transform-origin: 122px 80px;">
      <ellipse cx="130" cy="86" rx="11" ry="19" fill="#7fc999" stroke="#4f9e73" stroke-width="2"/>
    </g>`;
}

function sparkleMarkup(mood) {
  if (mood === "okay") return "";
  const count = mood === "excellent" ? 6 : 3;
  const positions = [
    [18, 30], [140, 26], [10, 90], [148, 96], [24, 130], [136, 132],
  ];
  let out = "";
  for (let i = 0; i < count; i++) {
    const [x, y] = positions[i % positions.length];
    const delay = (i * 0.22).toFixed(2);
    out += `<text x="${x}" y="${y}" class="mascot-sparkle" style="animation-delay:${delay}s">✦</text>`;
  }
  return out;
}

export function mascotSVG(mood) {
  const face = faceParts(mood);
  return `
  <svg viewBox="0 0 160 160" class="mascot-svg" role="img" aria-label="応援キャラクター">
    <ellipse cx="80" cy="145" rx="34" ry="7" class="mascot-shadow"/>
    ${sparkleMarkup(mood)}
    <g class="mascot-figure">
      ${armsMarkup(mood)}
      <ellipse cx="63" cy="128" rx="12" ry="8" fill="#4f9e73"/>
      <ellipse cx="97" cy="128" rx="12" ry="8" fill="#4f9e73"/>
      <ellipse cx="80" cy="82" rx="50" ry="52" fill="#8fd6a8" stroke="#4f9e73" stroke-width="2.5"/>
      <ellipse cx="80" cy="98" rx="27" ry="22" fill="#eef8f0" opacity="0.55"/>
      <circle cx="50" cy="80" r="7" fill="#ffb3b3" opacity="0.6"/>
      <circle cx="110" cy="80" r="7" fill="#ffb3b3" opacity="0.6"/>
      ${face.eyeL}${face.eyeR}${face.mouth}
      <g class="mascot-cap" style="transform-origin: 80px 40px;">
        <path d="M50 32 L80 18 L110 32 L80 46 Z" fill="#e0724a"/>
        <path d="M80 46 L80 34" stroke="#c25a35" stroke-width="2"/>
        <line x1="106" y1="33" x2="106" y2="52" stroke="#c25a35" stroke-width="2"/>
        <circle cx="106" cy="54" r="4" fill="#f2a26f"/>
      </g>
    </g>
  </svg>`;
}

export function mascotBlock(mood, message) {
  return `
    <div class="mascot-scene mascot-mood-${mood}">
      ${mascotSVG(mood)}
      <div class="mascot-bubble">${message}</div>
    </div>`;
}
