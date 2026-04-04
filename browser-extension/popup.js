const LANGUAGE_STORAGE_KEY = "uiLanguage";

const UI_TEXT = {
  zh: {
    eyebrow: "Bower 扩展",
    title: "设置",
    subhead: "设置扩展界面的系统语言。分析结果里的中英文切换仍然由分析面板内的开关控制。",
    languageLabel: "系统语言",
    languageDescription: "这个设置会影响扩展的界面文案，包括悬浮分析面板中的系统标签和提示文字。",
    optionAutoTitle: "跟随浏览器",
    optionAutoDescription: "根据浏览器当前语言自动选择中文或英文。",
    optionZhTitle: "中文",
    optionZhDescription: "固定使用中文界面。",
    optionEnTitle: "English",
    optionEnDescription: "固定使用英文界面。",
    saved: "系统语言已更新。",
  },
  en: {
    eyebrow: "Bower Extension",
    title: "Settings",
    subhead: "Set the extension interface language. The Chinese / English toggle inside the analysis panel still controls only the analysis content.",
    languageLabel: "System Language",
    languageDescription: "This affects extension UI copy, including system labels and hints in the floating analysis panel.",
    optionAutoTitle: "Follow Browser",
    optionAutoDescription: "Automatically choose Chinese or English from the browser language.",
    optionZhTitle: "中文",
    optionZhDescription: "Always use a Chinese interface.",
    optionEnTitle: "English",
    optionEnDescription: "Always use an English interface.",
    saved: "System language updated.",
  },
};

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

function detectLanguage(storedLanguage) {
  if (storedLanguage === "zh" || storedLanguage === "en") {
    return storedLanguage;
  }
  return navigator.language.toLowerCase().startsWith("zh") ? "zh" : "en";
}

function selectedValue(storedLanguage) {
  return storedLanguage === "zh" || storedLanguage === "en" ? storedLanguage : "auto";
}

function render(language) {
  const text = UI_TEXT[language];
  document.getElementById("eyebrow").textContent = text.eyebrow;
  document.getElementById("title").textContent = text.title;
  document.getElementById("subhead").textContent = text.subhead;
  document.getElementById("language-label").textContent = text.languageLabel;
  document.getElementById("language-description").textContent = text.languageDescription;
  document.getElementById("option-auto-title").textContent = text.optionAutoTitle;
  document.getElementById("option-auto-description").textContent = text.optionAutoDescription;
  document.getElementById("option-zh-title").textContent = text.optionZhTitle;
  document.getElementById("option-zh-description").textContent = text.optionZhDescription;
  document.getElementById("option-en-title").textContent = text.optionEnTitle;
  document.getElementById("option-en-description").textContent = text.optionEnDescription;
}

async function initialize() {
  const storage = await getStorage([LANGUAGE_STORAGE_KEY]);
  const storedLanguage = storage[LANGUAGE_STORAGE_KEY];
  const language = detectLanguage(storedLanguage);
  const currentValue = selectedValue(storedLanguage);
  const status = document.getElementById("status");

  render(language);

  const radios = Array.from(document.querySelectorAll('input[name="ui-language"]'));
  for (const radio of radios) {
    radio.checked = radio.value === currentValue;
    radio.addEventListener("change", async () => {
      const nextValue = radio.value;
      await setStorage({
        [LANGUAGE_STORAGE_KEY]: nextValue,
      });
      const nextLanguage = detectLanguage(nextValue);
      render(nextLanguage);
      status.textContent = UI_TEXT[nextLanguage].saved;
      status.classList.add("is-saved");
      window.setTimeout(() => {
        status.textContent = "";
        status.classList.remove("is-saved");
      }, 1400);
    });
  }
}

void initialize();
