function load() {
  chrome.storage.local.get(
    {
      personality: "neutral",
      apiProvider: "openai",
      apiBase: "https://api.openai.com/v1",
      model: "gpt-4o-mini",
      apiKey: "",
      maxTokens: 400,
    },
    (cfg) => {
      document.getElementById("personality").value = cfg.personality;
      document.getElementById("apiProvider").value = cfg.apiProvider;
      document.getElementById("apiBase").value = cfg.apiBase;
      document.getElementById("model").value = cfg.model;
      document.getElementById("apiKey").value = cfg.apiKey;
      document.getElementById("maxTokens").value = String(cfg.maxTokens);
      updateUIForProvider(cfg.apiProvider);
    }
  );
}

function updateUIForProvider(provider) {
  const apiKeyInput = document.getElementById("apiKey");
  const apiKeyLabel = document.getElementById("apiKeyLabel");
  const apiKeyHint = document.getElementById("apiKeyHint");

  if (provider === "ollama") {
    // Ollama doesn't need API key
    apiKeyInput.style.opacity = "0.5";
    apiKeyInput.required = false;
    apiKeyHint.textContent = "Not needed for Ollama";
    apiKeyHint.style.display = "block";
  } else if (provider === "google") {
    // Google AI needs API key
    apiKeyInput.style.opacity = "1";
    apiKeyInput.required = true;
    apiKeyInput.placeholder = "AIza...";
    apiKeyHint.textContent = "Get your key at: https://aistudio.google.com/app/apikey";
    apiKeyHint.style.display = "block";
  } else {
    // OpenAI needs API key
    apiKeyInput.style.opacity = "1";
    apiKeyInput.required = true;
    apiKeyInput.placeholder = "sk-...";
    apiKeyHint.style.display = "none";
  }
}

function save() {
  const personality = document.getElementById("personality").value;
  const apiProvider = document.getElementById("apiProvider").value;
  const apiBase = document.getElementById("apiBase").value.trim();
  const model = document.getElementById("model").value.trim();
  const apiKey = document.getElementById("apiKey").value.trim();
  const maxTokens =
    parseInt(document.getElementById("maxTokens").value, 10) || 400;

  chrome.storage.local.set(
    { personality, apiProvider, apiBase, model, apiKey, maxTokens },
    () => {
      const s = document.querySelector("#status small");
      s.textContent = "Saved.";
      setTimeout(() => (s.textContent = ""), 1200);
    }
  );
}

document.getElementById("save").addEventListener("click", save);
document.getElementById("apiProvider").addEventListener("change", (e) => {
  updateUIForProvider(e.target.value);
});
document.addEventListener("DOMContentLoaded", load);
