const STORAGE_KEY = "vocab-builder-entries";

const fallbackMeanings = {
  insist: "堅持",
  postpone: "延後",
  recommend: "推薦",
  authority: "職權；授權",
  shipment: "貨運；運送物",
  receipt: "收據",
  durable: "耐用的",
  confidential: "機密的",
  proceed: "繼續進行",
  lucrative: "有利可圖的",
};

const collocationHints = {
  insist: ["insist on", "insist that", "insist upon"],
  recommend: ["recommend that", "recommend doing", "recommend to"],
  postpone: ["postpone until", "postpone to"],
  apply: ["apply for", "apply to"],
  depend: ["depend on", "depend upon"],
  respond: ["respond to"],
  proceed: ["proceed with", "proceed to"],
  agree: ["agree with", "agree to", "agree on"],
  apologize: ["apologize for", "apologize to"],
  approve: ["approve of"],
  arrive: ["arrive at", "arrive in"],
  ask: ["ask for", "ask about"],
  believe: ["believe in"],
  belong: ["belong to"],
  benefit: ["benefit from"],
  care: ["care about", "care for"],
  complain: ["complain about", "complain to"],
  concentrate: ["concentrate on"],
  consist: ["consist of"],
  contribute: ["contribute to"],
  deal: ["deal with"],
  decide: ["decide on", "decide against"],
  differ: ["differ from"],
  engage: ["engage in", "engage with"],
  focus: ["focus on"],
  graduate: ["graduate from"],
  listen: ["listen to"],
  object: ["object to"],
  participate: ["participate in"],
  refer: ["refer to"],
  rely: ["rely on"],
  search: ["search for"],
  succeed: ["succeed in"],
  suffer: ["suffer from"],
  wait: ["wait for"],
};

const collocationFollowers = new Set([
  "about",
  "against",
  "as",
  "at",
  "by",
  "for",
  "from",
  "in",
  "into",
  "of",
  "on",
  "onto",
  "over",
  "through",
  "to",
  "upon",
  "with",
  "within",
  "without",
  "that",
]);

const collocationTranslations = {
  "insist on": "堅持",
  "insist that": "堅持認為",
  "insist upon": "堅持",
  "recommend that": "建議",
  "recommend doing": "建議做某事",
  "recommend to": "向某人推薦",
  "postpone until": "延後到",
  "postpone to": "延後到",
  "apply for": "申請",
  "apply to": "適用於；申請到",
  "depend on": "取決於；依靠",
  "depend upon": "取決於；依靠",
  "respond to": "回應",
  "proceed with": "繼續進行",
  "proceed to": "前往；繼續到",
  "agree with": "同意某人；符合",
  "agree to": "同意某事",
  "agree on": "就某事達成一致",
  "apologize for": "為某事道歉",
  "apologize to": "向某人道歉",
  "approve of": "贊成",
  "arrive at": "抵達小地點",
  "arrive in": "抵達大地點",
  "ask for": "要求；請求",
  "ask about": "詢問關於",
  "believe in": "相信；信任",
  "belong to": "屬於",
  "benefit from": "受益於",
  "care about": "在乎",
  "care for": "照顧；喜歡",
  "complain about": "抱怨某事",
  "complain to": "向某人抱怨",
  "concentrate on": "專注於",
  "consist of": "由...組成",
  "contribute to": "貢獻於；導致",
  "deal with": "處理",
  "decide on": "決定",
  "decide against": "決定不做",
  "differ from": "不同於",
  "engage in": "從事；參與",
  "engage with": "與...互動；接觸",
  "focus on": "專注於",
  "graduate from": "畢業於",
  "listen to": "聽",
  "object to": "反對",
  "participate in": "參與",
  "refer to": "提到；參考",
  "rely on": "依靠",
  "search for": "尋找",
  "succeed in": "成功做到",
  "suffer from": "遭受；患有",
  "wait for": "等待",
};

const wordInput = document.querySelector("#wordInput");
const lookupForm = document.querySelector("#lookupForm");
const statusText = document.querySelector("#statusText");
const resultPanel = document.querySelector("#resultPanel");
const resultEditor = document.querySelector(".result-editor");
const resultWord = document.querySelector("#resultWord");
const meaningInput = document.querySelector("#meaningInput");
const collocationInput = document.querySelector("#collocationInput");
const partInput = document.querySelector("#partInput");
const definitionInput = document.querySelector("#definitionInput");
const addWordBtn = document.querySelector("#addWordBtn");
const exportCsvBtn = document.querySelector("#exportCsvBtn");
const clearBtn = document.querySelector("#clearBtn");
const filterInput = document.querySelector("#filterInput");
const libraryBody = document.querySelector("#libraryBody");

let entries = loadEntries();
let currentLookup = null;

lookupForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const word = normalizeWord(wordInput.value);
  if (!word) return;
  await lookupWord(word);
});

addWordBtn.addEventListener("click", () => {
  if (!currentLookup) return;

  const entry = {
    word: currentLookup.word,
    meaning: meaningInput.value.trim(),
    collocations: collocationInput.value.trim(),
    partOfSpeech: partInput.value.trim(),
    definition: definitionInput.value.trim(),
    createdAt: new Date().toISOString(),
  };

  const existingIndex = entries.findIndex((item) => item.word.toLowerCase() === entry.word.toLowerCase());
  if (existingIndex >= 0) {
    entries[existingIndex] = entry;
    setStatus(`已更新 ${entry.word}。`);
  } else {
    entries.push(entry);
    setStatus(`已加入 ${entry.word}。`);
  }

  entries.sort((a, b) => a.word.localeCompare(b.word));
  saveEntries();
  renderLibrary();
});

exportCsvBtn.addEventListener("click", () => {
  if (!entries.length) {
    setStatus("目前沒有可匯出的單字。", true);
    return;
  }

  const rows = [["單字", "中文", "搭配詞"]];
  entries.forEach((entry) => {
    rows.push([
      entry.word,
      entry.meaning,
      entry.collocations || entry.collocationZh,
    ]);
  });
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  downloadText(`vocabulary-${dateStamp()}.csv`, "\ufeff" + csv);
  setStatus("已匯出簡易 CSV。");
});

clearBtn.addEventListener("click", () => {
  if (!entries.length) return;
  const confirmed = window.confirm("確定要清空目前存在瀏覽器裡的單字庫嗎？");
  if (!confirmed) return;
  entries = [];
  saveEntries();
  renderLibrary();
  setStatus("已清空單字庫。");
});

filterInput.addEventListener("input", renderLibrary);

async function lookupWord(word) {
  setStatus(`正在查詢 ${word}...`);
  resultPanel.classList.add("is-empty");
  resultEditor.hidden = true;

  const [dictionary, translation, onlineCollocations] = await Promise.allSettled([
    fetchDictionary(word),
    fetchChineseMeaning(word),
    fetchCollocationFollowers(word),
  ]);

  const dictionaryData = dictionary.status === "fulfilled" ? dictionary.value : null;
  const translatedMeaning = translation.status === "fulfilled" ? translation.value : "";
  const onlineFollowers = onlineCollocations.status === "fulfilled" ? onlineCollocations.value : [];
  const collocations = await buildCollocations(word, onlineFollowers);
  const meaning = fallbackMeanings[word.toLowerCase()] || translatedMeaning;

  currentLookup = {
    word,
    meaning,
    collocations: collocations.join("; "),
    partOfSpeech: dictionaryData?.partOfSpeech || "",
    definition: dictionaryData?.definition || "",
  };

  resultWord.textContent = currentLookup.word;
  meaningInput.value = currentLookup.meaning;
  collocationInput.value = currentLookup.collocations;
  partInput.value = currentLookup.partOfSpeech;
  definitionInput.value = currentLookup.definition;

  resultPanel.classList.remove("is-empty");
  resultEditor.hidden = false;

  if (!meaning) {
    setStatus("查到英文解釋與搭配詞，中文欄先留空，你可以自己填。", true);
  } else {
    setStatus(`已查到 ${word}，可以確認後加入單字庫。`);
  }
}

async function fetchDictionary(word) {
  const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Dictionary lookup failed");
  const data = await response.json();
  const meanings = data?.[0]?.meanings || [];
  const firstMeaning = meanings.find((item) => item.definitions?.length) || meanings[0];
  const firstDefinition = firstMeaning?.definitions?.[0];

  return {
    partOfSpeech: firstMeaning?.partOfSpeech || "",
    definition: firstDefinition?.definition || "",
  };
}

async function fetchChineseMeaning(word) {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=en|zh-TW`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Translation lookup failed");
  const data = await response.json();
  const translated = data?.responseData?.translatedText || "";
  if (!translated || translated.toLowerCase() === String(word).toLowerCase()) return "";
  return translated;
}

async function fetchCollocationFollowers(word) {
  const url = `https://api.datamuse.com/words?rel_bga=${encodeURIComponent(word)}&max=30`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Collocation lookup failed");
  const data = await response.json();
  return data
    .map((item) => String(item.word || "").toLowerCase())
    .filter((item) => collocationFollowers.has(item));
}

async function buildCollocations(word, onlineFollowers = []) {
  const lower = word.toLowerCase();
  const hints = collocationHints[lower] || [];
  const online = onlineFollowers.map((follower) => `${lower} ${follower}`);
  const candidates = [...new Set([...hints, ...online])].slice(0, 8);
  const translated = await Promise.all(candidates.map(formatCollocation));
  return translated.filter(Boolean);
}

async function formatCollocation(item) {
  const lower = item.toLowerCase();
  const translation = collocationTranslations[lower];
  if (translation) return `${item} = ${translation}`;
  try {
    const onlineTranslation = await fetchChineseMeaning(item);
    return onlineTranslation ? `${item} = ${onlineTranslation}` : item;
  } catch {
    return item;
  }
}

function renderLibrary() {
  const keyword = filterInput.value.trim().toLowerCase();
  const visibleEntries = entries.filter((entry) => {
    const text = `${entry.word} ${entry.meaning} ${entry.collocations}`.toLowerCase();
    return text.includes(keyword);
  });

  libraryBody.innerHTML = "";

  if (!visibleEntries.length) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="5" class="muted">目前沒有符合的單字。</td>`;
    libraryBody.append(row);
    return;
  }

  visibleEntries.forEach((entry) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${escapeHtml(entry.word)}</td>
      <td>${escapeHtml(entry.meaning || "")}</td>
      <td class="list-cell">${formatListHtml(entry.collocations || entry.collocationZh)}</td>
      <td><button class="delete-btn" type="button" data-word="${escapeHtml(entry.word)}">刪除</button></td>
    `;
    libraryBody.append(row);
  });

  libraryBody.querySelectorAll(".delete-btn").forEach((button) => {
    button.addEventListener("click", () => {
      entries = entries.filter((entry) => entry.word !== button.dataset.word);
      saveEntries();
      renderLibrary();
      setStatus(`已刪除 ${button.dataset.word}。`);
    });
  });
}

function loadEntries() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveEntries() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function normalizeWord(value) {
  return value.trim().replace(/\s+/g, " ");
}

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function dateStamp() {
  return new Date().toISOString().slice(0, 10);
}

function setStatus(message, warning = false) {
  statusText.textContent = message;
  statusText.classList.toggle("is-warning", warning);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatListHtml(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  return text
    .split(/\s*(?:,|;|；)\s*/)
    .filter(Boolean)
    .map((item) => escapeHtml(item))
    .join("<br>");
}

renderLibrary();
