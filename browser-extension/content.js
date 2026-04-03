if (!globalThis.__BOWER_ANALYZER_CONTENT_LOADED__) {
globalThis.__BOWER_ANALYZER_CONTENT_LOADED__ = true;

const BOWER_PANEL_ID = "bower-image-analysis-panel";
const COPY_ICON = `
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M9 9h9v11H9z"></path>
    <path d="M6 4h9v2H8v9H6z"></path>
  </svg>
`;
const PIN_ICON = `
  <svg viewBox="0 0 1024 1024" aria-hidden="true" focusable="false">
    <path d="M878.3 392.1L631.9 145.7c-6.5-6.5-15-9.7-23.5-9.7s-17 3.2-23.5 9.7L423.8 306.9c-12.2-1.4-24.5-2-36.8-2-73.2 0-146.4 24.1-206.5 72.3-15.4 12.3-16.7 35.4-2.7 49.4l181.7 181.7-215.4 215.2c-2.6 2.6-4.3 6.1-4.6 9.8l-3.4 37.2c-0.9 9.4 6.6 17.4 15.9 17.4 0.5 0 1 0 1.5-0.1l37.2-3.4c3.7-0.3 7.2-2 9.8-4.6l215.4-215.4 181.7 181.7c6.5 6.5 15 9.7 23.5 9.7 9.7 0 19.3-4.2 25.9-12.4 56.3-70.3 79.7-158.3 70.2-243.4l161.1-161.1c12.9-12.8 12.9-33.8 0-46.8zM666.2 549.3l-24.5 24.5 3.8 34.4c3.7 33.7 1 67.2-8.2 99.7-5.4 19-12.8 37.1-22.2 54.2L262 408.8c12.9-7.1 26.3-13.1 40.3-17.9 27.2-9.4 55.7-14.1 84.7-14.1 9.6 0 19.3 0.5 28.9 1.6l34.4 3.8 24.5-24.5L608.5 224 800 415.5 666.2 549.3z"></path>
  </svg>
`;

const CONTENT_TEXT = {
  zh: {
    stage_initial: "准备分析图片",
    stage_downloading: "正在读取图片数据",
    stage_cache: "正在检查缓存",
    stage_analyzing: "正在发送到 Bower AI",
    stage_finishing: "正在整理结果",
    stage_cached: "已命中缓存",
    stage_error: "分析失败",
    stage_hint: "耗时受模型和网络环境影响。",
    stage_hint_cached: "使用最近缓存的分析结果。",
    result_title: "图片解析",
    result_cached: "缓存",
    result_live: "实时",
    summary: "摘要",
    prompt: "提示词",
    tags: "标签",
    colors: "颜色",
    copy_all_tags: "复制全部标签",
    copy_all_colors: "复制全部颜色",
    copy_card: "复制",
    clip_save: "一键摘录",
    clip_saving: "摘录中",
    clip_saved: "已摘录",
    clip_retry: "重试摘录",
    clip_failed: "摘录失败",
    lang_zh: "中文",
    lang_en: "English",
    pin: "固定",
    unpin: "取消固定",
    close: "关闭",
    copied: "已复制",
    empty: "暂无可显示结果",
  },
  en: {
    stage_initial: "Preparing image analysis",
    stage_downloading: "Loading image data",
    stage_cache: "Checking cache",
    stage_analyzing: "Sending to Bower AI",
    stage_finishing: "Formatting result",
    stage_cached: "Cache hit",
    stage_error: "Analysis failed",
    stage_hint: "Processing time depends on the model and network conditions.",
    stage_hint_cached: "Using the most recent cached analysis result.",
    result_title: "Image Analysis",
    result_cached: "Cached",
    result_live: "Live",
    summary: "SUMMARY",
    prompt: "PROMPT",
    tags: "TAGS",
    colors: "COLORS",
    copy_all_tags: "Copy All Tags",
    copy_all_colors: "Copy All Colors",
    copy_card: "Copy",
    clip_save: "Clip",
    clip_saving: "Saving",
    clip_saved: "Saved",
    clip_retry: "Retry",
    clip_failed: "Save failed",
    lang_zh: "中文",
    lang_en: "English",
    pin: "Pin",
    unpin: "Unpin",
    close: "Close",
    copied: "Copied",
    empty: "No analysis result to display",
  },
};

const state = {
  requestId: null,
  uiLanguage: detectLanguage(),
  contentLanguage: detectLanguage(),
  currentStage: "initial",
  progress: 0,
  progressTimer: null,
  progressPause: false,
  lastContextImage: null,
  panel: null,
  result: null,
  cached: false,
  pinned: false,
  sourceUrl: "",
  clipState: "idle",
  clipError: "",
  clippedInspirationId: null,
};

function detectLanguage(explicitLanguage) {
  if (explicitLanguage === "zh" || explicitLanguage === "en") {
    return explicitLanguage;
  }
  return navigator.language.toLowerCase().startsWith("zh") ? "zh" : "en";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function sanitizeColor(color) {
  const normalized = String(color || "").trim().toUpperCase();
  return /^#[0-9A-F]{6}$/.test(normalized) ? normalized : "#D9CFC2";
}

function rememberContextImage(event) {
  const target = event.target instanceof Element ? event.target.closest("img") : null;
  if (!target) {
    state.lastContextImage = null;
    return;
  }

  state.lastContextImage = {
    srcUrl: target.currentSrc || target.src || "",
    filename: target.getAttribute("alt") || "",
    x: event.clientX,
    y: event.clientY,
  };
}

function findImageCandidate(srcUrl) {
  if (state.lastContextImage?.srcUrl === srcUrl) {
    return state.lastContextImage;
  }

  const images = Array.from(document.images || []);
  for (const image of images) {
    const currentSrc = image.currentSrc || image.src || "";
    if (currentSrc !== srcUrl) {
      continue;
    }

    const rect = image.getBoundingClientRect();
    return {
      srcUrl: currentSrc,
      filename: image.getAttribute("alt") || "",
      x: rect.left + Math.min(rect.width, 36),
      y: rect.top + Math.min(rect.height, 36),
    };
  }

  return null;
}

function ensurePanel() {
  if (state.panel) {
    return state.panel;
  }

  const panel = document.createElement("section");
  panel.id = BOWER_PANEL_ID;
  panel.setAttribute("aria-live", "polite");
  panel.innerHTML = `
    <div class="bower-utility-buttons">
      <button class="bower-pin" type="button" data-action="pin" aria-label="Pin">
        ${PIN_ICON}
      </button>
      <button class="bower-close" type="button" data-action="close" aria-label="Close">×</button>
    </div>
    <div class="bower-shell">
      <div class="bower-glow"></div>
      <div class="bower-compact">
        <div class="bower-status-row">
          <div class="bower-status-copy">
            <div class="bower-status-title"></div>
            <div class="bower-status-hint"></div>
          </div>
        </div>
        <div class="bower-progress-shell">
          <div class="bower-progress-value">0%</div>
          <div class="bower-progress-track">
            <div class="bower-progress-bar"></div>
          </div>
        </div>
      </div>
      <div class="bower-expanded">
        <div class="bower-expanded-header">
          <div class="bower-expanded-copy">
            <div class="bower-result-title"></div>
          <div class="bower-result-subtitle"></div>
          </div>
          <div class="bower-controls">
            <button class="bower-clip-action" type="button" data-action="clip-save"></button>
            <div class="bower-language-toggle">
              <button type="button" data-action="language" data-language="zh"></button>
              <button type="button" data-action="language" data-language="en"></button>
            </div>
          </div>
        </div>
        <div class="bower-result-content"></div>
      </div>
    </div>
  `;

  const style = document.createElement("style");
  style.textContent = `
    #${BOWER_PANEL_ID} {
      position: fixed;
      z-index: 2147483647;
      width: min(360px, calc(100vw - 24px));
      opacity: 0;
      transform: translate3d(0, 18px, 0) scale(0.96);
      transform-origin: top left;
      transition:
        opacity 220ms ease,
        transform 320ms cubic-bezier(0.22, 1, 0.36, 1),
        width 320ms cubic-bezier(0.22, 1, 0.36, 1),
        max-height 320ms cubic-bezier(0.22, 1, 0.36, 1);
      pointer-events: none;
      max-height: 170px;
      color: #f7f1e8;
      font-family: "SF Pro Text", "PingFang SC", "Noto Sans SC", sans-serif;
    }

    #${BOWER_PANEL_ID}.is-visible {
      opacity: 1;
      transform: translate3d(0, 0, 0) scale(1);
      pointer-events: auto;
    }

    #${BOWER_PANEL_ID}.is-expanded {
      width: min(560px, calc(100vw - 24px));
      max-height: min(78vh, 760px);
    }

    #${BOWER_PANEL_ID} .bower-shell {
      position: relative;
      overflow: hidden;
      border-radius: 28px;
      border: 1px solid rgba(255, 255, 255, 0.18);
      background:
        linear-gradient(155deg, rgba(248, 224, 194, 0.2), transparent 32%),
        radial-gradient(circle at top right, rgba(128, 156, 129, 0.24), transparent 26%),
        linear-gradient(160deg, rgba(43, 48, 56, 0.72), rgba(24, 28, 35, 0.82));
      box-shadow:
        0 22px 70px rgba(12, 15, 19, 0.24),
        inset 0 1px 0 rgba(255, 255, 255, 0.12);
      backdrop-filter: blur(28px) saturate(130%);
      -webkit-backdrop-filter: blur(28px) saturate(130%);
    }

    #${BOWER_PANEL_ID} .bower-glow {
      position: absolute;
      inset: -10% auto auto -12%;
      width: 220px;
      height: 220px;
      border-radius: 999px;
      background: radial-gradient(circle, rgba(225, 171, 88, 0.28), transparent 64%);
      pointer-events: none;
      filter: blur(6px);
    }

    #${BOWER_PANEL_ID} .bower-utility-buttons {
      position: absolute;
      top: 12px;
      right: 12px;
      z-index: 2;
      display: grid;
      grid-auto-flow: column;
      grid-auto-columns: 30px;
      align-items: center;
      gap: 6px;
    }

    #${BOWER_PANEL_ID} .bower-pin,
    #${BOWER_PANEL_ID} .bower-close {
      width: 30px;
      height: 30px;
      display: grid;
      place-items: center;
      padding: 0;
      border: 0;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.08);
      color: rgba(247, 241, 232, 0.78);
      font-size: 17px;
      line-height: 1;
      cursor: pointer;
      opacity: 0;
      transform: translateY(-4px);
      transition: opacity 180ms ease, transform 180ms ease, background 180ms ease;
    }

    #${BOWER_PANEL_ID} .bower-pin {
      display: grid;
      place-items: center;
      font-size: 0;
    }

    #${BOWER_PANEL_ID} .bower-pin svg {
      width: 14px;
      height: 14px;
      fill: currentColor;
    }

    #${BOWER_PANEL_ID}.is-visible:hover .bower-close,
    #${BOWER_PANEL_ID}.is-visible:hover .bower-pin,
    #${BOWER_PANEL_ID}.is-expanded .bower-close,
    #${BOWER_PANEL_ID}.is-expanded .bower-pin,
    #${BOWER_PANEL_ID}.is-pinned .bower-close,
    #${BOWER_PANEL_ID}.is-pinned .bower-pin {
      opacity: 1;
      transform: translateY(0);
    }

    #${BOWER_PANEL_ID} .bower-pin.is-active {
      background: rgba(240, 181, 100, 0.18);
      color: #ffd9ac;
      opacity: 1;
      transform: translateY(0);
    }

    #${BOWER_PANEL_ID} .bower-pin:hover,
    #${BOWER_PANEL_ID} .bower-close:hover {
      background: rgba(255, 255, 255, 0.14);
    }

    #${BOWER_PANEL_ID} .bower-compact {
      padding: 20px 20px 18px;
      transition: opacity 220ms ease, transform 320ms ease;
    }

    #${BOWER_PANEL_ID}.is-expanded .bower-compact {
      opacity: 0.92;
    }

    #${BOWER_PANEL_ID} .bower-status-row {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      padding-right: 88px;
    }

    #${BOWER_PANEL_ID} .bower-status-title {
      font-size: 15px;
      font-weight: 700;
      line-height: 1.4;
      letter-spacing: 0.01em;
    }

    #${BOWER_PANEL_ID} .bower-status-hint {
      margin-top: 6px;
      color: rgba(247, 241, 232, 0.68);
      font-size: 12px;
      line-height: 1.55;
    }

    #${BOWER_PANEL_ID} .bower-progress-shell {
      position: relative;
      margin-top: 16px;
      padding-top: 22px;
    }

    #${BOWER_PANEL_ID} .bower-progress-value {
      position: absolute;
      top: 0;
      right: 2px;
      font-size: 12px;
      font-weight: 700;
      color: rgba(247, 241, 232, 0.8);
      white-space: nowrap;
    }

    #${BOWER_PANEL_ID} .bower-progress-track {
      height: 8px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.09);
      overflow: hidden;
      position: relative;
    }

    #${BOWER_PANEL_ID} .bower-progress-track::after {
      content: "";
      position: absolute;
      inset: 0;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.12), transparent);
      transform: translateX(-100%);
      animation: bower-progress-sheen 1.8s linear infinite;
      pointer-events: none;
    }

    #${BOWER_PANEL_ID} .bower-progress-bar {
      height: 100%;
      width: 0%;
      border-radius: inherit;
      background: linear-gradient(90deg, #f0b564, #e7d4a0 52%, #90c5a1);
      box-shadow: 0 0 24px rgba(236, 189, 113, 0.36);
      transition: width 220ms cubic-bezier(0.22, 1, 0.36, 1);
    }

    #${BOWER_PANEL_ID} .bower-expanded {
      display: grid;
      gap: 14px;
      padding: 0 18px 18px;
      opacity: 0;
      max-height: 0;
      overflow: hidden;
      transform: translateY(12px);
      transition:
        opacity 240ms ease,
        max-height 320ms cubic-bezier(0.22, 1, 0.36, 1),
        transform 320ms cubic-bezier(0.22, 1, 0.36, 1);
    }

    #${BOWER_PANEL_ID}.is-expanded .bower-expanded {
      opacity: 1;
      max-height: min(60vh, 560px);
      transform: translateY(0);
      overflow: auto;
      padding-bottom: 20px;
    }

    #${BOWER_PANEL_ID} .bower-expanded::-webkit-scrollbar {
      width: 10px;
    }

    #${BOWER_PANEL_ID} .bower-expanded::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.12);
      border-radius: 999px;
    }

    #${BOWER_PANEL_ID} .bower-expanded-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      padding-top: 4px;
    }

    #${BOWER_PANEL_ID} .bower-result-title {
      font-size: 15px;
      font-weight: 800;
      line-height: 1.4;
      letter-spacing: 0.01em;
    }

    #${BOWER_PANEL_ID} .bower-result-subtitle {
      margin-top: 4px;
      color: rgba(247, 241, 232, 0.62);
      font-size: 12px;
      line-height: 1.5;
    }

    #${BOWER_PANEL_ID} .bower-controls {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      justify-content: flex-end;
    }

    #${BOWER_PANEL_ID} .bower-language-toggle {
      display: inline-flex;
      gap: 4px;
      padding: 4px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.08);
    }

    #${BOWER_PANEL_ID} .bower-language-toggle button,
    #${BOWER_PANEL_ID} .bower-copy-all,
    #${BOWER_PANEL_ID} .bower-icon-button,
    #${BOWER_PANEL_ID} .bower-clip-action {
      border: 0;
      cursor: pointer;
      transition: background 160ms ease, opacity 160ms ease, transform 160ms ease;
      color: inherit;
      font: inherit;
    }

    #${BOWER_PANEL_ID} .bower-language-toggle button {
      min-width: 58px;
      padding: 8px 10px;
      border-radius: 999px;
      background: transparent;
      color: rgba(247, 241, 232, 0.66);
      font-size: 12px;
      font-weight: 700;
    }

    #${BOWER_PANEL_ID} .bower-language-toggle button.is-active {
      background: rgba(255, 255, 255, 0.14);
      color: #fff5ea;
    }

    #${BOWER_PANEL_ID} .bower-clip-action {
      min-width: 108px;
      padding: 10px 14px;
      border-radius: 999px;
      background: rgba(240, 181, 100, 0.16);
      color: #fff1de;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.01em;
    }

    #${BOWER_PANEL_ID} .bower-clip-action:hover {
      background: rgba(240, 181, 100, 0.22);
      transform: translateY(-1px);
    }

    #${BOWER_PANEL_ID} .bower-clip-action.is-busy,
    #${BOWER_PANEL_ID} .bower-clip-action:disabled {
      cursor: default;
      transform: none;
      opacity: 0.86;
    }

    #${BOWER_PANEL_ID} .bower-clip-action.is-saved {
      background: rgba(144, 197, 161, 0.2);
      color: #eefbef;
    }

    #${BOWER_PANEL_ID} .bower-clip-action.is-error {
      background: rgba(214, 122, 99, 0.18);
      color: #ffe8e2;
    }

    #${BOWER_PANEL_ID} .bower-result-content {
      display: grid;
      gap: 12px;
    }

    #${BOWER_PANEL_ID} .bower-card,
    #${BOWER_PANEL_ID} .bower-section {
      position: relative;
      border-radius: 22px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      background: rgba(255, 255, 255, 0.06);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
    }

    #${BOWER_PANEL_ID} .bower-card {
      padding: 18px;
    }

    #${BOWER_PANEL_ID} .bower-card-label,
    #${BOWER_PANEL_ID} .bower-section-label {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: rgba(247, 241, 232, 0.58);
    }

    #${BOWER_PANEL_ID} .bower-card-copy {
      margin-top: 12px;
      padding-right: 28px;
      font-size: 14px;
      line-height: 1.7;
      color: #fff5ea;
      white-space: pre-wrap;
      word-break: break-word;
    }

    #${BOWER_PANEL_ID} .bower-card .bower-icon-button {
      position: absolute;
      top: 14px;
      right: 14px;
    }

    #${BOWER_PANEL_ID} .bower-section {
      padding: 16px;
    }

    #${BOWER_PANEL_ID} .bower-section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }

    #${BOWER_PANEL_ID} .bower-copy-all {
      padding: 8px 10px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.08);
      color: rgba(247, 241, 232, 0.78);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.01em;
    }

    #${BOWER_PANEL_ID} .bower-copy-all:hover,
    #${BOWER_PANEL_ID} .bower-icon-button:hover {
      background: rgba(255, 255, 255, 0.14);
      transform: translateY(-1px);
    }

    #${BOWER_PANEL_ID} .bower-icon-button {
      width: 28px;
      height: 28px;
      display: grid;
      place-items: center;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.08);
      color: rgba(247, 241, 232, 0.78);
      opacity: 0;
      transform: translateY(4px);
    }

    #${BOWER_PANEL_ID} .bower-card:hover .bower-icon-button,
    #${BOWER_PANEL_ID} .bower-pill:hover .bower-icon-button {
      opacity: 1;
      transform: translateY(0);
    }

    #${BOWER_PANEL_ID} .bower-icon-button svg {
      width: 14px;
      height: 14px;
      fill: currentColor;
    }

    #${BOWER_PANEL_ID} .bower-chip-list {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 14px;
    }

    #${BOWER_PANEL_ID} .bower-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      max-width: 100%;
      padding: 10px 10px 10px 12px;
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.08);
      color: #fff5ea;
      font-size: 12px;
      line-height: 1.4;
    }

    #${BOWER_PANEL_ID} .bower-pill-text {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    #${BOWER_PANEL_ID} .bower-color-swatch {
      width: 16px;
      height: 16px;
      border-radius: 999px;
      border: 1px solid rgba(255, 255, 255, 0.18);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.18);
      flex: none;
    }

    #${BOWER_PANEL_ID} .bower-empty {
      padding: 24px 0 6px;
      color: rgba(247, 241, 232, 0.66);
      font-size: 14px;
      line-height: 1.6;
    }

    @keyframes bower-progress-sheen {
      to {
        transform: translateX(100%);
      }
    }

    @media (max-width: 720px) {
      #${BOWER_PANEL_ID},
      #${BOWER_PANEL_ID}.is-expanded {
        width: min(92vw, 560px);
      }

      #${BOWER_PANEL_ID} .bower-expanded-header {
        flex-direction: column;
      }

      #${BOWER_PANEL_ID} .bower-controls {
        width: 100%;
        justify-content: space-between;
      }
    }
  `;

  document.documentElement.appendChild(style);
  document.documentElement.appendChild(panel);
  panel.addEventListener("click", handlePanelClick);
  state.panel = panel;
  return panel;
}

function handlePanelClick(event) {
  const actionTarget = event.target instanceof Element ? event.target.closest("[data-action]") : null;
  if (!actionTarget) {
    return;
  }

  const action = actionTarget.getAttribute("data-action");
  if (action === "close") {
    hidePanel();
    return;
  }

  if (action === "language") {
    const language = actionTarget.getAttribute("data-language");
    state.contentLanguage = detectLanguage(language);
    renderExpandedResult();
    return;
  }

  if (action === "pin") {
    state.pinned = !state.pinned;
    syncUtilityButtons();
    return;
  }

  if (action === "clip-save") {
    void triggerClipSave();
    return;
  }

  if (action === "copy") {
    const value = actionTarget.getAttribute("data-copy") || "";
    copyText(value, actionTarget);
    return;
  }

  if (action === "copy-all-tags" && state.result) {
    const tags = state.contentLanguage === "zh" ? state.result.tags_zh : state.result.tags_en;
    copyText(tags.join(", "), actionTarget);
    return;
  }

  if (action === "copy-all-colors" && state.result) {
    copyText(state.result.colors.join(", "), actionTarget);
  }
}

function copyText(value, trigger) {
  navigator.clipboard.writeText(value).then(() => {
    const originalTitle = trigger.getAttribute("title") || "";
    trigger.setAttribute("title", CONTENT_TEXT[state.uiLanguage].copied);
    trigger.classList.add("is-copied");
    window.setTimeout(() => {
      trigger.setAttribute("title", originalTitle);
      trigger.classList.remove("is-copied");
    }, 1200);
  });
}

function syncUtilityButtons() {
  const panel = ensurePanel();
  const pinButton = panel.querySelector(".bower-pin");
  const closeButton = panel.querySelector(".bower-close");
  const text = CONTENT_TEXT[state.uiLanguage];
  pinButton.classList.toggle("is-active", state.pinned);
  pinButton.setAttribute("aria-label", state.pinned ? text.unpin : text.pin);
  pinButton.setAttribute("title", state.pinned ? text.unpin : text.pin);
  closeButton.setAttribute("aria-label", text.close);
  closeButton.setAttribute("title", text.close);
  panel.classList.toggle("is-pinned", state.pinned);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function clipTitleFromResult() {
  if (!state.result) {
    return "";
  }

  const preferred =
    state.contentLanguage === "zh"
      ? state.result.summary_zh || state.result.summary || state.result.summary_en || ""
      : state.result.summary_en || state.result.summary || state.result.summary_zh || "";
  const normalized = String(preferred || "").replace(/\s+/g, " ").trim();
  return normalized.length > 88 ? `${normalized.slice(0, 88).trim()}…` : normalized;
}

function positionPanel(expanded = false) {
  const panel = ensurePanel();
  const anchor = state.lastContextImage || { x: window.innerWidth - 360, y: 80 };
  const width = Math.min(expanded ? 560 : 360, window.innerWidth - 24);
  const estimatedHeight = expanded ? Math.min(window.innerHeight * 0.78, 760) : 170;
  const left = clamp(anchor.x + 14, 12, window.innerWidth - width - 12);
  const top = clamp(anchor.y + 18, 12, window.innerHeight - estimatedHeight - 12);
  panel.style.left = `${left}px`;
  panel.style.top = `${top}px`;
}

function clearProgressTimer() {
  if (state.progressTimer) {
    window.clearInterval(state.progressTimer);
    state.progressTimer = null;
  }
}

function updateProgress(progress) {
  const panel = ensurePanel();
  const progressBar = panel.querySelector(".bower-progress-bar");
  const progressValue = panel.querySelector(".bower-progress-value");
  state.progress = clamp(progress, 0, 1);
  progressBar.style.width = `${Math.round(state.progress * 1000) / 10}%`;
  progressValue.textContent = `${Math.round(state.progress * 100)}%`;
}

function stageText(stage, language, cached) {
  const text = CONTENT_TEXT[language];
  const titleMap = {
    initial: text.stage_initial,
    downloading: text.stage_downloading,
    cache: text.stage_cache,
    analyzing: text.stage_analyzing,
    finishing: text.stage_finishing,
    error: text.stage_error,
  };

  return {
    title: cached ? text.stage_cached : titleMap[stage] || text.stage_initial,
    hint: cached ? text.stage_hint_cached : text.stage_hint,
  };
}

function updateCompactStatus() {
  const panel = ensurePanel();
  const titleNode = panel.querySelector(".bower-status-title");
  const hintNode = panel.querySelector(".bower-status-hint");
  const labels = stageText(state.currentStage, state.uiLanguage, state.cached);
  titleNode.textContent = labels.title;
  hintNode.textContent = labels.hint;
}

function syncClipButton() {
  const panel = ensurePanel();
  const button = panel.querySelector(".bower-clip-action");
  const text = CONTENT_TEXT[state.uiLanguage];
  const clipLabels = {
    idle: text.clip_save,
    saving: text.clip_saving,
    saved: text.clip_saved,
    error: text.clip_retry,
  };
  const stateKey = clipLabels[state.clipState] ? state.clipState : "idle";
  button.textContent = clipLabels[stateKey];
  button.disabled = !state.result || state.clipState === "saving" || state.clipState === "saved";
  button.classList.toggle("is-busy", state.clipState === "saving");
  button.classList.toggle("is-saved", state.clipState === "saved");
  button.classList.toggle("is-error", state.clipState === "error");
  button.setAttribute("title", state.clipState === "error" && state.clipError ? state.clipError : button.textContent);
}

function startProgressSimulation() {
  clearProgressTimer();
  state.progressPause = false;
  updateProgress(0.08);
  state.progressTimer = window.setInterval(() => {
    if (state.progressPause || state.progress >= 0.95) {
      return;
    }

    let increment = 0.024;
    if (state.progress >= 0.55) {
      increment = 0.012;
    }
    if (state.progress >= 0.78) {
      increment = 0.004;
    }
    if (state.progress >= 0.9) {
      increment = 0.0015;
    }

    updateProgress(Math.min(0.95, state.progress + increment));
  }, 120);
}

function showPanel() {
  const panel = ensurePanel();
  positionPanel(false);
  panel.classList.remove("is-expanded", "is-error");
  panel.classList.add("is-visible");
  syncUtilityButtons();
}

function hidePanel() {
  clearProgressTimer();
  const panel = ensurePanel();
  panel.classList.remove("is-visible", "is-expanded", "is-error");
}

function renderItemPill(value, options = {}) {
  const safeValue = escapeHtml(value);
  const prefix = options.color
    ? `<span class="bower-color-swatch" style="background:${sanitizeColor(options.color)}"></span>`
    : "";
  return `
    <span class="bower-pill">
      ${prefix}
      <span class="bower-pill-text">${safeValue}</span>
      <button
        class="bower-icon-button"
        type="button"
        data-action="copy"
        data-copy="${escapeHtml(value)}"
        title="${escapeHtml(CONTENT_TEXT[state.uiLanguage].copy_card)}"
      >
        ${COPY_ICON}
      </button>
    </span>
  `;
}

function renderCard(label, value) {
  return `
    <article class="bower-card">
      <div class="bower-card-label">${escapeHtml(label)}</div>
      <button
        class="bower-icon-button"
        type="button"
        data-action="copy"
        data-copy="${escapeHtml(value)}"
        title="${escapeHtml(CONTENT_TEXT[state.uiLanguage].copy_card)}"
      >
        ${COPY_ICON}
      </button>
      <div class="bower-card-copy">${escapeHtml(value)}</div>
    </article>
  `;
}

function renderExpandedResult() {
  const panel = ensurePanel();
  const text = CONTENT_TEXT[state.uiLanguage];
  const contentNode = panel.querySelector(".bower-result-content");
  const titleNode = panel.querySelector(".bower-result-title");
  const subtitleNode = panel.querySelector(".bower-result-subtitle");
  const zhButton = panel.querySelector('[data-language="zh"]');
  const enButton = panel.querySelector('[data-language="en"]');
  syncUtilityButtons();
  syncClipButton();
  zhButton.textContent = text.lang_zh;
  enButton.textContent = text.lang_en;
  zhButton.classList.toggle("is-active", state.contentLanguage === "zh");
  enButton.classList.toggle("is-active", state.contentLanguage === "en");

  titleNode.textContent = text.result_title;
  subtitleNode.textContent = state.cached ? text.stage_hint_cached : text.stage_hint;

  if (!state.result) {
    contentNode.innerHTML = `<div class="bower-empty">${escapeHtml(text.empty)}</div>`;
    return;
  }

  const summary =
    state.contentLanguage === "zh"
      ? state.result.summary_zh || state.result.summary || state.result.summary_en || ""
      : state.result.summary_en || state.result.summary || state.result.summary_zh || "";
  const prompt =
    state.contentLanguage === "zh"
      ? state.result.prompt_zh || state.result.prompt_en || ""
      : state.result.prompt_en || state.result.prompt_zh || "";
  const tags =
    state.contentLanguage === "zh"
      ? state.result.tags_zh || state.result.tags_en || []
      : state.result.tags_en || state.result.tags_zh || [];
  const colors = Array.isArray(state.result.colors) ? state.result.colors : [];

  contentNode.innerHTML = [
    renderCard(text.summary, summary),
    renderCard(text.prompt, prompt),
    `
      <section class="bower-section">
        <div class="bower-section-header">
          <div class="bower-section-label">${escapeHtml(text.tags)}</div>
          <button class="bower-copy-all" type="button" data-action="copy-all-tags">${escapeHtml(text.copy_all_tags)}</button>
        </div>
        <div class="bower-chip-list">${tags.map((tag) => renderItemPill(tag)).join("")}</div>
      </section>
    `,
    `
      <section class="bower-section">
        <div class="bower-section-header">
          <div class="bower-section-label">${escapeHtml(text.colors)}</div>
          <button class="bower-copy-all" type="button" data-action="copy-all-colors">${escapeHtml(text.copy_all_colors)}</button>
        </div>
        <div class="bower-chip-list">${colors.map((color) => renderItemPill(color, { color })).join("")}</div>
      </section>
    `,
  ].join("");
}

function completeAndExpand(cached) {
  state.cached = Boolean(cached);
  state.currentStage = cached ? "cache" : "finishing";
  updateCompactStatus();
  clearProgressTimer();
  updateProgress(1);

  window.setTimeout(() => {
    const panel = ensurePanel();
    panel.classList.add("is-expanded");
    positionPanel(true);
    renderExpandedResult();
  }, 220);
}

function showError(detail) {
  state.currentStage = "error";
  state.cached = false;
  clearProgressTimer();
  const panel = ensurePanel();
  panel.classList.add("is-visible", "is-error");
  panel.classList.remove("is-expanded");
  positionPanel(false);
  updateCompactStatus();
  panel.querySelector(".bower-status-title").textContent = `${CONTENT_TEXT[state.uiLanguage].stage_error}`;
  panel.querySelector(".bower-status-hint").textContent = detail || "";
}

function handleAnalysisStart(message) {
  state.requestId = message.requestId;
  state.uiLanguage = detectLanguage(message.language);
  state.contentLanguage = state.uiLanguage;
  state.currentStage = "initial";
  state.cached = false;
  state.result = null;
  state.sourceUrl = message.sourceUrl || "";
  state.clipState = "idle";
  state.clipError = "";
  state.clippedInspirationId = null;
  state.lastContextImage = findImageCandidate(state.sourceUrl) || state.lastContextImage;
  showPanel();
  updateCompactStatus();
  startProgressSimulation();
}

function handleAnalysisStage(message) {
  if (message.requestId !== state.requestId) {
    return;
  }
  state.uiLanguage = detectLanguage(message.language || state.uiLanguage);
  state.currentStage = message.stage || "analyzing";
  updateCompactStatus();
}

function handleAnalysisResult(message) {
  if (message.requestId !== state.requestId) {
    return;
  }
  state.uiLanguage = detectLanguage(message.language || state.uiLanguage);
  state.result = message.result || null;
  state.clipState = "idle";
  state.clipError = "";
  state.clippedInspirationId = null;
  completeAndExpand(message.cached);
}

function handleAnalysisError(message) {
  if (message.requestId !== state.requestId) {
    return;
  }
  state.uiLanguage = detectLanguage(message.language || state.uiLanguage);
  showError(message.detail || "");
}

function handleDocumentPointerDown(event) {
  if (state.pinned || !state.panel || !state.panel.classList.contains("is-visible")) {
    return;
  }

  const target = event.target;
  if (target instanceof Node && state.panel.contains(target)) {
    return;
  }

  hidePanel();
}

async function imageToBase64(srcUrl) {
  const response = await fetch(srcUrl);
  if (!response.ok) {
    throw new Error(`Unable to read page image (${response.status})`);
  }

  const blob = await response.blob();
  const arrayBuffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";
  for (let index = 0; index < bytes.byteLength; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }

  return {
    base64: btoa(binary),
    mimeType: blob.type || "application/octet-stream",
  };
}

function requestClipSave(payload) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        type: "analysis:clip-save",
        ...payload,
      },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        if (!response?.ok) {
          reject(new Error(response?.error || CONTENT_TEXT[state.uiLanguage].clip_failed));
          return;
        }

        resolve(response.data);
      }
    );
  });
}

async function triggerClipSave() {
  if (!state.result || !state.sourceUrl || state.clipState === "saving" || state.clipState === "saved") {
    return;
  }

  state.clipState = "saving";
  state.clipError = "";
  syncClipButton();

  try {
    const saved = await requestClipSave({
      sourceUrl: state.sourceUrl,
      title: clipTitleFromResult(),
      result: state.result,
    });
    state.clipState = "saved";
    state.clippedInspirationId = saved?.id || null;
    state.clipError = "";
  } catch (error) {
    state.clipState = "error";
    state.clipError = error instanceof Error ? error.message : String(error);
  }

  syncClipButton();
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message !== "object") {
    return false;
  }

  if (message.type === "analysis:ping") {
    sendResponse({ ok: true });
    return false;
  }

  if (message.type === "analysis:start") {
    handleAnalysisStart(message);
    return false;
  }

  if (message.type === "analysis:stage") {
    handleAnalysisStage(message);
    return false;
  }

  if (message.type === "analysis:result") {
    handleAnalysisResult(message);
    return false;
  }

  if (message.type === "analysis:error") {
    handleAnalysisError(message);
    return false;
  }

  if (message.type === "analysis:extract-image") {
    const imageCandidate = findImageCandidate(message.srcUrl);
    if (!imageCandidate) {
      sendResponse({ ok: false, error: "Selected image is no longer available on the page" });
      return false;
    }

    state.lastContextImage = imageCandidate;
    imageToBase64(imageCandidate.srcUrl)
      .then(({ base64, mimeType }) => {
        sendResponse({
          ok: true,
          base64,
          mimeType,
          filename: imageCandidate.filename || "",
        });
      })
      .catch((error) => {
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        });
      });

    return true;
  }

  return false;
});

window.addEventListener("resize", () => {
  if (state.panel && state.panel.classList.contains("is-visible")) {
    positionPanel(state.panel.classList.contains("is-expanded"));
  }
});

document.addEventListener("contextmenu", rememberContextImage, true);
document.addEventListener("pointerdown", handleDocumentPointerDown, true);
}
