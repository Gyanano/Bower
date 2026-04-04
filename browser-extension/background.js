const CONTEXT_MENU_ID = "bower-analyze-image";
const LANGUAGE_STORAGE_KEY = "uiLanguage";
const ANALYSIS_CACHE_STORAGE_KEY = "analysisCache";
const ANALYSIS_CACHE_LIMIT = 5;
const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000";
const ANALYZE_ENDPOINT = "/api/v1/image-analysis/analyze";
const CLIP_ENDPOINT = "/api/v1/image-analysis/clip";

function createContextMenu() {
  chrome.contextMenus.remove(CONTEXT_MENU_ID, () => {
    void chrome.runtime.lastError;
    chrome.contextMenus.create({
      id: CONTEXT_MENU_ID,
      title: "分析图片 / Analyze Image",
      contexts: ["image"],
    });
  });
}

function getStorage(keys) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(keys, (result) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(result);
    });
  });
}

function setStorage(values) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(values, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve();
    });
  });
}

function sendToTab(tabId, message, frameId, options = {}) {
  return new Promise((resolve) => {
    const sendOptions = typeof frameId === "number" && frameId >= 0 ? { frameId } : undefined;
    chrome.tabs.sendMessage(tabId, message, sendOptions, (response) => {
      if (chrome.runtime.lastError) {
        const errorMessage = chrome.runtime.lastError.message || "";
        if (!options.requireResponse && errorMessage.includes("The message port closed before a response was received")) {
          resolve({
            delivered: true,
            error: null,
            response: null,
          });
          return;
        }
        resolve({
          delivered: false,
          error: errorMessage,
          response: null,
        });
        return;
      }
      resolve({
        delivered: true,
        error: null,
        response: response ?? null,
      });
    });
  });
}

function ensureContentScript(tabId, frameId) {
  return new Promise((resolve, reject) => {
    const target = { tabId };
    if (typeof frameId === "number" && frameId >= 0) {
      target.frameIds = [frameId];
    }

    chrome.scripting.executeScript(
      {
        target,
        files: ["content.js"],
      },
      () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve();
      }
    );
  });
}

async function dispatchToContent(tabId, message, frameId) {
  const ping = await sendToTab(tabId, { type: "analysis:ping" }, frameId, { requireResponse: true });
  if (!ping.delivered) {
    await ensureContentScript(tabId, frameId);
  }

  const result = await sendToTab(tabId, message, frameId, { requireResponse: true });
  if (!result.delivered) {
    throw new Error(result.error || "Unable to communicate with the page");
  }

  return result.response;
}

async function postToContent(tabId, message, frameId) {
  const ping = await sendToTab(tabId, { type: "analysis:ping" }, frameId, { requireResponse: true });
  if (!ping.delivered) {
    await ensureContentScript(tabId, frameId);
  }

  const result = await sendToTab(tabId, message, frameId, { requireResponse: false });
  if (!result.delivered) {
    throw new Error(result.error || "Unable to communicate with the page");
  }
}

function requestContentImage(tabId, srcUrl, frameId) {
  return new Promise((resolve, reject) => {
    dispatchToContent(tabId, { type: "analysis:extract-image", srcUrl }, frameId)
      .then((response) => {
      if (!response?.ok) {
        reject(new Error(response?.error || "Unable to access the selected image"));
        return;
      }
      resolve(response);
      })
      .catch(reject);
  });
}

async function getPreferredLanguage() {
  const { [LANGUAGE_STORAGE_KEY]: storedLanguage } = await getStorage([LANGUAGE_STORAGE_KEY]);
  if (storedLanguage === "zh" || storedLanguage === "en") {
    return storedLanguage;
  }

  const uiLanguage = (chrome.i18n.getUILanguage() || "").toLowerCase();
  return uiLanguage.startsWith("zh") ? "zh" : "en";
}

async function getApiBaseUrl() {
  const { bowerApiBaseUrl } = await getStorage(["bowerApiBaseUrl"]);
  if (typeof bowerApiBaseUrl === "string" && bowerApiBaseUrl.trim()) {
    return bowerApiBaseUrl.trim().replace(/\/+$/, "");
  }
  return DEFAULT_API_BASE_URL;
}

async function readCacheEntries() {
  const { [ANALYSIS_CACHE_STORAGE_KEY]: entries } = await getStorage([ANALYSIS_CACHE_STORAGE_KEY]);
  return Array.isArray(entries) ? entries : [];
}

async function writeCacheEntries(entries) {
  await setStorage({
    [ANALYSIS_CACHE_STORAGE_KEY]: entries.slice(0, ANALYSIS_CACHE_LIMIT),
  });
}

function normalizeSourceKey(srcUrl) {
  if (typeof srcUrl !== "string" || !srcUrl.trim()) {
    return "";
  }

  try {
    const parsed = new URL(srcUrl);
    parsed.hash = "";
    return parsed.toString();
  } catch (_error) {
    void _error;
    return srcUrl.trim();
  }
}

function findCachedEntry(entries, { sourceKey, contentHash }) {
  if (sourceKey) {
    const sourceMatch = entries.find((entry) => entry.sourceKey === sourceKey);
    if (sourceMatch) {
      return sourceMatch;
    }
  }

  if (contentHash) {
    return entries.find((entry) => entry.contentHash === contentHash) || null;
  }

  return null;
}

async function persistCacheEntry(entry) {
  const entries = await readCacheEntries();
  const deduped = entries.filter((item) => {
    if (entry.sourceKey && item.sourceKey === entry.sourceKey) {
      return false;
    }
    if (entry.contentHash && item.contentHash === entry.contentHash) {
      return false;
    }
    return true;
  });

  deduped.unshift(entry);
  await writeCacheEntries(deduped);
}

function makeRequestId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `req_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function filenameFromUrl(urlString, mimeType) {
  try {
    const url = new URL(urlString);
    const lastSegment = url.pathname.split("/").filter(Boolean).pop();
    if (lastSegment && /\.[a-z0-9]{2,8}$/i.test(lastSegment)) {
      return lastSegment;
    }
  } catch (_error) {
    void _error;
  }

  const extension = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
  return `image.${extension}`;
}

function base64ToBlob(base64, mimeType) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: mimeType || "application/octet-stream" });
}

async function hashBlob(blob) {
  const arrayBuffer = await blob.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", arrayBuffer);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function fetchImageFile(srcUrl) {
  const response = await fetch(srcUrl, { credentials: "omit" });
  if (!response.ok) {
    throw new Error(`Unable to download image (${response.status})`);
  }

  const blob = await response.blob();
  const mimeType = blob.type || response.headers.get("content-type") || "application/octet-stream";
  return {
    blob,
    mimeType,
    filename: filenameFromUrl(srcUrl, mimeType),
  };
}

function parseDataUrl(dataUrl) {
  const matched = /^data:([^;,]+)?(;base64)?,(.*)$/i.exec(dataUrl);
  if (!matched) {
    throw new Error("Unsupported data URL");
  }

  const mimeType = matched[1] || "application/octet-stream";
  const payload = matched[3] || "";
  const binary = matched[2] ? atob(payload) : decodeURIComponent(payload);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return {
    blob: new Blob([bytes], { type: mimeType }),
    mimeType,
    filename: filenameFromUrl("data://image", mimeType),
  };
}

async function resolveImageFile(tabId, srcUrl, frameId) {
  if (srcUrl.startsWith("data:")) {
    return parseDataUrl(srcUrl);
  }

  if (srcUrl.startsWith("blob:")) {
    const response = await requestContentImage(tabId, srcUrl, frameId);
    return {
      blob: base64ToBlob(response.base64, response.mimeType),
      mimeType: response.mimeType,
      filename: response.filename || filenameFromUrl(srcUrl, response.mimeType),
    };
  }

  return fetchImageFile(srcUrl);
}

async function analyzeImage(filePayload) {
  const apiBaseUrl = await getApiBaseUrl();
  const formData = new FormData();
  formData.append("file", filePayload.blob, filePayload.filename);

  const response = await fetch(`${apiBaseUrl}${ANALYZE_ENDPOINT}`, {
    method: "POST",
    body: formData,
  });

  const responseBody = await response.json().catch(() => null);
  if (!response.ok) {
    const message = responseBody?.error?.message || `Analyze request failed (${response.status})`;
    throw new Error(message);
  }

  if (!responseBody?.data) {
    throw new Error("AI service returned an empty analysis payload");
  }

  return responseBody.data;
}

async function saveAnalysisClip(filePayload, payload) {
  const apiBaseUrl = await getApiBaseUrl();
  const formData = new FormData();
  formData.append("file", filePayload.blob, filePayload.filename);

  if (payload.sourceUrl) {
    formData.append("source_url", payload.sourceUrl);
  }

  if (payload.title) {
    formData.append("title", payload.title);
  }

  if (payload.notes) {
    formData.append("notes", payload.notes);
  }

  formData.append("summary", payload.result.summary || payload.result.summary_en || payload.result.summary_zh || "");
  formData.append("summary_en", payload.result.summary_en || payload.result.summary || "");
  formData.append("summary_zh", payload.result.summary_zh || payload.result.summary || "");
  formData.append("prompt_en", payload.result.prompt_en || "");
  formData.append("prompt_zh", payload.result.prompt_zh || "");
  formData.append("tags_en", JSON.stringify(Array.isArray(payload.result.tags_en) ? payload.result.tags_en : []));
  formData.append("tags_zh", JSON.stringify(Array.isArray(payload.result.tags_zh) ? payload.result.tags_zh : []));
  formData.append("colors", JSON.stringify(Array.isArray(payload.result.colors) ? payload.result.colors : []));

  const response = await fetch(`${apiBaseUrl}${CLIP_ENDPOINT}`, {
    method: "POST",
    body: formData,
  });

  const responseBody = await response.json().catch(() => null);
  if (!response.ok) {
    const message = responseBody?.error?.message || `Clip request failed (${response.status})`;
    throw new Error(message);
  }

  if (!responseBody?.data) {
    throw new Error("Bower returned an empty clip payload");
  }

  return responseBody.data;
}

async function sendAnalysisStart(tabId, payload) {
  await postToContent(tabId, { type: "analysis:start", ...payload }, payload.frameId);
}

async function sendAnalysisStage(tabId, payload) {
  await postToContent(tabId, { type: "analysis:stage", ...payload }, payload.frameId);
}

async function sendAnalysisResult(tabId, payload) {
  await postToContent(tabId, { type: "analysis:result", ...payload }, payload.frameId);
}

async function sendAnalysisError(tabId, payload) {
  try {
    await postToContent(tabId, { type: "analysis:error", ...payload }, payload.frameId);
  } catch (_error) {
    void _error;
  }
}

chrome.runtime.onInstalled.addListener(() => {
  createContextMenu();
});

chrome.runtime.onStartup.addListener(() => {
  createContextMenu();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message !== "object") {
    return false;
  }

  if (message.type !== "analysis:clip-save") {
    return false;
  }

  const tabId = sender.tab?.id;
  const frameId = typeof sender.frameId === "number" ? sender.frameId : 0;
  const sourceUrl = typeof message.sourceUrl === "string" ? message.sourceUrl : "";
  const result = message.result && typeof message.result === "object" ? message.result : null;

  if (!tabId || !sourceUrl || !result) {
    sendResponse({ ok: false, error: "Missing image or analysis result for clipping" });
    return false;
  }

  resolveImageFile(tabId, sourceUrl, frameId)
    .then((filePayload) =>
      saveAnalysisClip(filePayload, {
        sourceUrl,
        title: typeof message.title === "string" ? message.title : "",
        notes: typeof message.notes === "string" ? message.notes : "",
        result,
      })
    )
    .then((data) => {
      sendResponse({ ok: true, data });
    })
    .catch((error) => {
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    });

  return true;
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== CONTEXT_MENU_ID || !info.srcUrl || !tab?.id) {
    return;
  }

  const requestId = makeRequestId();
  const language = await getPreferredLanguage();
  const sourceKey = normalizeSourceKey(info.srcUrl);
  const frameId = typeof info.frameId === "number" ? info.frameId : 0;

  try {
    await sendAnalysisStart(tab.id, {
      requestId,
      language,
      sourceUrl: info.srcUrl,
      frameId,
    });

    const cacheEntries = await readCacheEntries();
    const cachedBySource = findCachedEntry(cacheEntries, { sourceKey, contentHash: "" });
    if (cachedBySource) {
      await sendAnalysisResult(tab.id, {
        requestId,
        language,
        sourceUrl: info.srcUrl,
        cached: true,
        result: cachedBySource.result,
        frameId,
      });
      return;
    }

    await sendAnalysisStage(tab.id, { requestId, language, stage: "downloading", frameId });
    const filePayload = await resolveImageFile(tab.id, info.srcUrl, frameId);

    await sendAnalysisStage(tab.id, { requestId, language, stage: "cache", frameId });
    const contentHash = await hashBlob(filePayload.blob);
    const cachedByHash = findCachedEntry(cacheEntries, { sourceKey: "", contentHash });
    if (cachedByHash) {
      await persistCacheEntry({
        sourceKey,
        contentHash,
        analyzedAt: cachedByHash.analyzedAt,
        result: cachedByHash.result,
      });
      await sendAnalysisResult(tab.id, {
        requestId,
        language,
        sourceUrl: info.srcUrl,
        cached: true,
        result: cachedByHash.result,
        frameId,
      });
      return;
    }

    await sendAnalysisStage(tab.id, { requestId, language, stage: "analyzing", frameId });
    const result = await analyzeImage(filePayload);

    await persistCacheEntry({
      sourceKey,
      contentHash,
      analyzedAt: new Date().toISOString(),
      result,
    });

    await sendAnalysisResult(tab.id, {
      requestId,
      language,
      sourceUrl: info.srcUrl,
      cached: false,
      result,
      frameId,
    });
  } catch (error) {
    await sendAnalysisError(tab.id, {
      requestId,
      language,
      detail: error instanceof Error ? error.message : String(error),
      frameId,
    });
  }
});
