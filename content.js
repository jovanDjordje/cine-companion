// ==============================
// Botodachi - content.js
// ==============================

// ---- Config / state ----
const CAP_BUFFER_SECS = 1800; // keep last 30 minutes (matches context sent to cloud APIs)
const TICK_INTERVAL_MS = 300; // Caption polling interval
const MAX_QUESTION_LENGTH = 500; // Character limit for questions
const FOCUS_RESTORE_DELAY_MS = 100; // Delay before restoring focus after Netflix steals it
const RECENT_INTERACTION_WINDOW_MS = 3000; // Time window to consider interaction "recent" (3 seconds)
const AUTO_FADE_DELAY_MS = 5000; // Fade FAB after 5 seconds of inactivity
const buffer = []; // { t0, t1, text }
let videoRef = null;
let allowSpoilers = false;
let captureEnabled = false; // PRIVACY: Capture OFF by default, user must enable
let _lastAdded = "";
let _lastURL = location.href; // Track current video URL for navigation detection
let _cachedTitle = null; // Cache video title to prevent flickering
let _cachedPersonality = "neutral"; // Cache personality to avoid repeated storage calls
let chatHistory = []; // Store conversation history for context
const MAX_CHAT_HISTORY = 10; // Keep last 10 Q&A pairs

// Store listener references for cleanup
let _storageListener = null;
let _keydownListener = null;

// Auto-fade state
let _fadeTimeout = null;
let _rootElement = null;

// Listen for personality changes in storage
_storageListener = (changes, area) => {
  if (area === "local" && changes.personality) {
    _cachedPersonality = changes.personality.newValue;
    console.log("[Botodachi] Personality changed to:", _cachedPersonality);
  }
};
chrome.storage.onChanged.addListener(_storageListener);

// ---- Buffer helpers ----
function trimBuffer(now) {
  while (buffer.length && buffer[0].t1 < now - CAP_BUFFER_SECS) buffer.shift();
}

function addCue(t0, t1, text) {
  if (!text || !(text = text.trim())) return;
  // hard dedupe against last added
  if (text === _lastAdded) return;

  const last = buffer[buffer.length - 1];
  if (last && last.text === text && Math.abs(last.t1 - t0) < 1.0) {
    // soft merge with previous contiguous line
    last.t1 = t1;
  } else {
    buffer.push({ t0, t1, text });
  }
  _lastAdded = text;
}

// ---- Auto-fade helpers ----
function startFadeTimer() {
  if (_fadeTimeout) clearTimeout(_fadeTimeout);
  if (_rootElement) _rootElement.classList.remove("faded");

  _fadeTimeout = setTimeout(() => {
    // Only fade if panel is closed
    const panel = document.getElementById("cinechat-panel");
    if (_rootElement && (!panel || !panel.classList.contains("open"))) {
      _rootElement.classList.add("faded");
    }
  }, AUTO_FADE_DELAY_MS);
}

function resetFadeTimer() {
  startFadeTimer(); // Restart the timer
}

// ---- Video reference ----
function getVideo() {
  if (videoRef && !videoRef.removed) return videoRef;
  const v = document.querySelector("video");
  if (v) videoRef = v;
  return v;
}

// ---- YouTube Comments Scraper ----
function scrapeYouTubeComments() {
  const host = location.hostname;
  if (!host.includes("youtube.com")) {
    return null; // Not on YouTube
  }

  const comments = [];
  const commentElements = document.querySelectorAll(
    "#comments #content-text, ytd-comment-renderer #content-text"
  );

  // Get top 25 comments
  const limit = Math.min(25, commentElements.length);
  for (let i = 0; i < limit; i++) {
    const text = commentElements[i]?.textContent?.trim();
    if (text && text.length > 10) {
      // Filter out very short comments
      comments.push(text);
    }
  }

  return comments.length > 0 ? comments : null;
}

// ---- Video metadata extraction ----
function getVideoMetadata() {
  const host = location.hostname;
  let title = "Unknown Video";
  const url = location.href;

  // Return cached title if we have a good one (not "Unknown Video" or ID-based)
  if (
    _cachedTitle &&
    !_cachedTitle.includes("Netflix Video ID:") &&
    _cachedTitle !== "Unknown Video"
  ) {
    return { title: _cachedTitle, url, platform: host };
  }

  if (host.includes("youtube.com")) {
    // Try multiple YouTube title selectors
    const titleEl =
      document.querySelector(".ytp-title-link") ||
      document.querySelector("h1.ytd-watch-metadata") ||
      document.querySelector("h1.title yt-formatted-string") ||
      document.querySelector('meta[property="og:title"]');

    if (titleEl) {
      title =
        titleEl.getAttribute?.("content") ||
        titleEl.textContent?.trim() ||
        title;
    }
  } else if (host.includes("netflix.com")) {
    // Try multiple Netflix title selectors (updated for 2024+ Netflix)
    const titleEl =
      document.querySelector(".video-title") ||
      document.querySelector('[data-uia="video-title"]') ||
      document.querySelector(".watch-video--title-text") ||
      document.querySelector(".ltr-1p5mjbl") || // Common Netflix title class
      document.querySelector(".ellipsize-text h4") ||
      document.querySelector('meta[property="og:title"]') ||
      document.querySelector("h4.ellipsis-text");

    if (titleEl) {
      title =
        titleEl.getAttribute?.("content") ||
        titleEl.textContent?.trim() ||
        title;
    }

    // Fallback: try to extract from URL pattern (only if nothing else worked)
    if (title === "Unknown Video") {
      const match = url.match(/\/watch\/(\d+)/);
      if (match) {
        title = `Netflix Video ID: ${match[1]}`;
      }
    }
  }

  // Cache the title if it's a good one (not ID-based or unknown)
  if (title !== "Unknown Video" && !title.includes("Netflix Video ID:")) {
    _cachedTitle = title;
  }

  return { title, url, platform: host };
}

// ---- YouTube: textTracks path ----
function readYouTubeCaptions(now) {
  const v = getVideo();
  if (!v || !v.textTracks) return;

  const tracks = [...v.textTracks];
  if (!tracks.length) return;

  // Force tracks to "hidden" so activeCues updates even if not visibly shown
  tracks.forEach((t) => {
    if (t.mode === "disabled") t.mode = "hidden";
  });

  let texts = [];
  tracks.forEach((t) => {
    const active = t.activeCues ? [...t.activeCues] : [];
    if (active.length) {
      const ttext = active
        .map((c) => c.text)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      if (ttext) texts.push(ttext);
    }
  });

  const text = texts.join(" ").trim();
  if (text) {
    addCue(now - 1.0, now + 0.2, text);
    // console.log("[Botodachi] Captions(textTracks):", text);
  }
}

// ---- YouTube: DOM fallback ----
function readYouTubeCaptionsDOM(now) {
  // Visible segments are inside these containers on the watch page
  const segs = document.querySelectorAll(
    ".ytp-caption-window-container .ytp-caption-segment"
  );
  if (!segs.length) return;
  const text = [...segs]
    .map((s) => s.textContent.trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return;
  addCue(now - 1.0, now + 0.2, text);
  // console.log("[Botodachi] Captions(DOM):", text);
}

// ---- Netflix: DOM capture ----
function readNetflixCaptions(now) {
  // Netflix renders captions in DOM - capture visible text
  const candidates = document.querySelectorAll(
    [
      '[data-uia="player-timedtext"]',
      'div[class*="player-timedtext"]',
      'div[data-uia*="timedtext"]',
      'div[data-uia="subtitle-text"]',
      'div[aria-live="assertive"]',
      'div[aria-live="polite"]',
    ].join(",")
  );

  let text = "";
  candidates.forEach((node) => {
    const cs = node.ownerDocument.defaultView.getComputedStyle(node);
    const visible =
      cs &&
      cs.display !== "none" &&
      cs.visibility !== "hidden" &&
      cs.opacity !== "0";
    if (visible) {
      const t = node.textContent.trim();
      if (t) text += (text ? " " : "") + t;
    }
  });

  text = text.replace(/\s+/g, " ").trim();
  if (text) {
    addCue(now - 1.0, now + 0.2, text);
    // console.log("[Botodachi] NF captions:", text);
  }
}

// ---- Helper: Get personality icon (GLOBAL) ----
function getPersonalityIcon(personality) {
  const icons = {
    neutral: "🎬",
    moviebuff: "📽️",
    comedy: "😂",
    professor: "🎓",
    youtube: "▶️",
    custom: "✏️",
  };
  return icons[personality] || "🎬";
}

// ---- Helper: Safe markdown to HTML converter (prevents XSS) ----
function parseMarkdown(text) {
  // First, escape any HTML to prevent XSS
  const escapeHTML = (str) => {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  };

  let html = escapeHTML(text);

  // Convert markdown to HTML (safe because we escaped HTML first)

  // Bold: **text** → <strong>text</strong> (process first to avoid conflicts)
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  // Italic: *text* → <em>text</em> (only if not followed/preceded by another *)
  // Note: Process after bold to avoid conflicts with **
  html = html.replace(/([^*]|^)\*([^*]+?)\*([^*]|$)/g, "$1<em>$2</em>$3");

  // Bullet lists: convert lines starting with * or - to <li>
  const lines = html.split("\n");
  let inList = false;
  const processedLines = [];

  for (let line of lines) {
    const trimmed = line.trim();
    // Check if line is a bullet point
    if (trimmed.match(/^[\*\-]\s+/)) {
      if (!inList) {
        processedLines.push('<ul style="margin: 8px 0; padding-left: 20px;">');
        inList = true;
      }
      // Remove the bullet marker and wrap in <li>
      const content = trimmed.replace(/^[\*\-]\s+/, "");
      processedLines.push(`<li style="margin: 4px 0;">${content}</li>`);
    } else {
      if (inList) {
        processedLines.push("</ul>");
        inList = false;
      }
      processedLines.push(line);
    }
  }

  if (inList) {
    processedLines.push("</ul>");
  }

  html = processedLines.join("\n");

  // Preserve line breaks (convert double newlines to <br><br>)
  html = html.replace(/\n\n/g, "<br><br>");
  html = html.replace(/\n/g, "<br>");

  return html;
}


// ---- First-run consent dialog ----
function showConsentDialog() {
  const consentDiv = document.createElement("div");
  consentDiv.id = "cinechat-consent";
  consentDiv.innerHTML = `
    <div style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:2147483646; display:flex; align-items:center; justify-content:center; font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;">
      <div style="background:white; color:#1a1a1a; padding:32px; border-radius:16px; max-width:500px; box-shadow:0 24px 80px rgba(0,0,0,0.4);">
        <h2 style="margin:0 0 16px 0; font-size:24px; color:#1a1a1a;">Welcome to Botodachi! 🤖</h2>
        <div style="font-size:15px; line-height:1.6; color:#333;">
          <p style="margin:0 0 12px 0;"><strong>Before you start:</strong></p>
          <ul style="margin:0 0 16px 0; padding-left:20px;">
            <li style="margin:6px 0;">Botodachi reads <strong>visible captions</strong> from videos you watch</li>
            <li style="margin:6px 0;">Capturing is <strong>OFF by default</strong> - you must enable it</li>
            <li style="margin:6px 0;">When you ask questions, your query + recent captions are sent to <strong>your configured AI provider</strong></li>
            <li style="margin:6px 0;">All data is stored <strong>locally</strong> on your device</li>
            <li style="margin:6px 0;">We do not collect or access your data</li>
          </ul>
          <p style="margin:0 0 20px 0; font-size:13px; color:#666;">
            By clicking "I Understand", you consent to this caption capture functionality.
            <a href="https://jovanDjordje.github.io/cine-companion/privacy.html" target="_blank" style="color:#4a9eff;">Read Privacy Policy</a>
          </p>
          <button id="cinechat-consent-btn" style="width:100%; padding:12px; background:#4a9eff; color:white; border:none; border-radius:8px; font-size:16px; font-weight:600; cursor:pointer;">
            I Understand
          </button>
        </div>
      </div>
    </div>
  `;
  document.documentElement.appendChild(consentDiv);

  const btn = consentDiv.querySelector("#cinechat-consent-btn");
  btn.addEventListener("click", () => {
    // Save consent to storage
    chrome.storage.local.set({ consentGiven: true });
    consentDiv.remove();
  });
}

// Check if first run and show consent
function checkFirstRun() {
  chrome.storage.local.get({ consentGiven: false }, (result) => {
    if (!result.consentGiven) {
      showConsentDialog();
    }
  });
}

// ---- Overlay UI ----
function ensureOverlay() {
  if (document.getElementById("cinechat-root")) return;

  const root = document.createElement("div");
  root.id = "cinechat-root";
  _rootElement = root; // Store reference for fade functionality
  root.innerHTML = `
    <div id="cinechat-fab-container">
      <button id="cinechat-toggle">🤖</button>
      <button id="cinechat-drag-handle" title="Drag to move">⋮⋮</button>
    </div>
    <div id="cinechat-panel">
      <div id="cinechat-header">
        <div style="flex:1;">
          <div>Botodachi</div>
          <div style="display:flex; align-items:center; gap:6px; margin-top:2px;">
            <div id="cinechat-video-title" style="font-size:11px; color:#999;">Loading...</div>
            <div id="cinechat-buffer-status" style="font-size:10px; color:#999; opacity:0.7;" title="Captured caption duration"></div>
          </div>
          <div id="cinechat-subtitle-warning" style="display:none; font-size:11px; color:#ffa726; margin-top:4px;">⚠️ Enable subtitles/captions to start capturing</div>
        </div>
        <div style="display:flex; align-items:center; gap:6px;">
          <div id="cinechat-small"><kbd>Alt+C</kbd> to toggle</div>
          <button id="cinechat-hide" title="Hide extension (refresh page to show again)">✕</button>
        </div>
      </div>

      <div id="cinechat-row">
        <label style="color:#4ade80; font-weight:600; display:flex; align-items:center; gap:6px;">
          <input type="checkbox" id="cinechat-capture"> Enable Capture
          <span id="cinechat-capture-indicator" style="display:none; font-size:10px; background:#4ade80; color:#1a1a1a; padding:2px 6px; border-radius:4px; font-weight:700;">ACTIVE</span>
        </label>
        <label><input type="checkbox" id="cinechat-spoil"> Allow spoilers</label>
      </div>

      <div id="cinechat-chat-container"></div>

      <div id="cinechat-input-area">
        <div id="cinechat-quick">
          <button class="cinechat-chip" id="cinechat-q-whats-happening">❓ What's happening?</button>
          <button class="cinechat-chip" id="cinechat-q-trivia">🎲 Trivia</button>
          <button class="cinechat-chip" id="cinechat-q-comments" style="display:none;">💬 Sum Comments</button>
          <button class="cinechat-chip" id="cinechat-clear" style="opacity:0.6;">🗑️ Clear Chat</button>
          <button class="cinechat-chip" id="cinechat-clear-buffer" style="opacity:0.6;">🧹 Clear Buffer</button>
        </div>
        <div id="cinechat-input-row">
          <textarea id="cinechat-q" placeholder="Ask anything... (Ctrl+Enter to send)"></textarea>
          <button id="cinechat-ask">Ask</button>
        </div>
        <div id="cinechat-char-counter">
          <span id="cinechat-char-count">0</span>/<span>500</span>
        </div>
      </div>
    </div>
    <div id="cinechat-personalities-float">
      <div style="font-size:10px; color:#cbd5e1; font-weight:600; margin-right:4px;">AI:</div>
      <button class="personality-btn" data-personality="youtube" title="YouTube/Music">▶️</button>
      <button class="personality-btn" data-personality="moviebuff" title="Movie Buff">📽️</button>
      <button class="personality-btn" data-personality="comedy" title="Comedy">😂</button>
      <button class="personality-btn" data-personality="professor" title="Professor">🎓</button>
      <button class="personality-btn" data-personality="custom" title="Custom">✏️</button>
    </div>
  `;
  document.documentElement.appendChild(root);

  // theme: respect system preference
  try {
    const prefersLight =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: light)").matches;
    if (prefersLight) root.classList.add("cinechat-light");
  } catch {}

  const toggle = root.querySelector("#cinechat-toggle");
  const dragHandle = root.querySelector("#cinechat-drag-handle");
  const panel = root.querySelector("#cinechat-panel");
  const askBtn = root.querySelector("#cinechat-ask");
  const q = root.querySelector("#cinechat-q");
  const chatContainer = root.querySelector("#cinechat-chat-container");
  const captureToggle = root.querySelector("#cinechat-capture");
  const spoil = root.querySelector("#cinechat-spoil");
  const btnClear = root.querySelector("#cinechat-clear");
  const btnClearBuffer = root.querySelector("#cinechat-clear-buffer");
  const btnHide = root.querySelector("#cinechat-hide");

  const header = root.querySelector("#cinechat-header");

  // Make header draggable when panel is open, and drag handle draggable when closed
  makeDraggable(root, header);
  makeDraggable(root, dragHandle);

  // Ctrl+Enter to send (Enter for new line)
  q.addEventListener(
    "keydown",
    (e) => {
      if (e.key === "Enter" && e.ctrlKey) {
        e.preventDefault(); // Prevent new line
        e.stopPropagation(); // Stop Netflix/YouTube from seeing it
        const question = q.value.trim();
        if (question) {
          askLLM(question);
          q.value = ""; // Clear input
          // Update character counter
          const charCountEl = root.querySelector("#cinechat-char-count");
          if (charCountEl) charCountEl.textContent = "0";
        }
      }
      // Always block from platform
      e.stopPropagation();
      e.stopImmediatePropagation();
    },
    true
  ); // capture phase

  // Prevent YouTube/Netflix keyboard shortcuts while typing
  // Strategy: Stop propagation (so Netflix doesn't see it) but allow default typing behavior
  const blockKeys = (e) => {
    // Stop Netflix/YouTube from seeing the event
    e.stopPropagation();
    e.stopImmediatePropagation();
    // DON'T preventDefault - we want normal typing to work!
  };

  // Block on other key events for textarea
  q.addEventListener("keyup", blockKeys, true);
  q.addEventListener("keypress", blockKeys, true);

  // Block on entire panel EXCEPT for the input textarea (don't interfere with Enter key)
  const blockPanelKeys = (e) => {
    // Don't block if event is from the textarea (let Enter key handler work)
    if (e.target === q) return;

    e.stopPropagation();
    e.stopImmediatePropagation();
  };

  panel.addEventListener("keydown", blockPanelKeys, true);
  panel.addEventListener("keyup", blockPanelKeys, true);
  panel.addEventListener("keypress", blockPanelKeys, true);

  // PRIVACY: Capture toggle (default OFF)
  const captureIndicator = root.querySelector("#cinechat-capture-indicator");
  captureToggle.checked = captureEnabled; // Start unchecked
  captureToggle.addEventListener("change", () => {
    captureEnabled = captureToggle.checked;

    // Show/hide active indicator
    if (captureIndicator) {
      captureIndicator.style.display = captureEnabled ? "inline" : "none";
    }

    // Clear buffer when user disables capture
    if (!captureEnabled) {
      buffer.length = 0;
      _lastAdded = "";
      console.log("[Botodachi] Capture disabled - buffer cleared");
    } else {
      console.log("[Botodachi] Capture enabled - starting caption capture");
    }
  });

  // Restore spoiler toggle from content-script state
  spoil.checked = allowSpoilers;
  spoil.addEventListener("change", () => {
    allowSpoilers = spoil.checked;
  });

  // Personality switcher
  const personalityBtns = root.querySelectorAll(".personality-btn");

  // Auto-detect best default personality based on platform
  const hostname = location.hostname;
  const defaultPersonality = hostname.includes("youtube.com")
    ? "youtube"
    : "moviebuff";

  // Load and highlight current personality (and cache it)
  chrome.storage.local.get({ personality: defaultPersonality }, (cfg) => {
    const currentPersonality = cfg.personality;
    _cachedPersonality = currentPersonality; // Cache it
    root.setAttribute("data-personality", currentPersonality);
    personalityBtns.forEach((btn) => {
      if (btn.dataset.personality === currentPersonality) {
        btn.classList.add("active");
      }
    });
  });

  // Handle personality button clicks
  personalityBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const newPersonality = btn.dataset.personality;

      // Update UI
      personalityBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      // Update root attribute for gradient
      root.setAttribute("data-personality", newPersonality);

      // Update cache immediately
      _cachedPersonality = newPersonality;

      // Save to storage
      chrome.storage.local.set({ personality: newPersonality });

      // Visual feedback - add to chat instead (XSS-safe)
      const feedbackDiv = document.createElement("div");
      feedbackDiv.className = "chat-message chat-assistant";

      const iconDiv = document.createElement("div");
      iconDiv.className = "chat-icon";
      iconDiv.textContent = btn.textContent;

      const bubble = document.createElement("div");
      bubble.className = "chat-bubble";
      bubble.innerHTML = parseMarkdown(
        `Switched to ${btn.title} personality! 🎭`
      );

      feedbackDiv.appendChild(iconDiv);
      feedbackDiv.appendChild(bubble);
      chatContainer.appendChild(feedbackDiv);
      chatContainer.scrollTop = chatContainer.scrollHeight;
    });
  });

  // Toggle button click handler (simple click to open/close)
  toggle.addEventListener("click", () => {
    panel.classList.toggle("open");

    // When panel opens, remove fade; when it closes, restart fade timer
    if (panel.classList.contains("open")) {
      root.classList.remove("faded");
      if (_fadeTimeout) clearTimeout(_fadeTimeout);
    } else {
      startFadeTimer();
    }
  });

  // ---- Auto-fade on inactivity ----
  // Reset fade timer on any interaction with the extension
  root.addEventListener("mouseenter", resetFadeTimer);
  root.addEventListener("mousemove", resetFadeTimer);
  root.addEventListener("click", resetFadeTimer);
  root.addEventListener("keydown", resetFadeTimer);
  root.addEventListener("touchstart", resetFadeTimer);

  // Start initial fade timer
  startFadeTimer();

  _keydownListener = (e) => {
    // Alt+C to toggle panel (changed from Ctrl+Shift+C to avoid conflict with dev tools)
    if (e.altKey && e.code === "KeyC" && !e.ctrlKey && !e.shiftKey) {
      e.preventDefault(); // Prevent any default browser behavior
      panel.classList.toggle("open");
    }
  };
  document.addEventListener("keydown", _keydownListener);

  // Clear chat button
  btnClear.addEventListener("click", () => {
    chatHistory.length = 0;
    chatContainer.innerHTML = "";
  });

  // Clear buffer button - PRIVACY: User can manually clear caption buffer
  btnClearBuffer.addEventListener("click", () => {
    if (confirm("Clear all captured captions? This cannot be undone.")) {
      buffer.length = 0;
      _lastAdded = "";
      console.log("[Botodachi] Caption buffer manually cleared by user");

      // Show confirmation in chat
      const confirmDiv = document.createElement("div");
      confirmDiv.className = "chat-message chat-assistant";

      const iconDiv = document.createElement("div");
      iconDiv.className = "chat-icon";
      iconDiv.textContent = "🧹";

      const bubble = document.createElement("div");
      bubble.className = "chat-bubble";
      bubble.innerHTML = parseMarkdown("Caption buffer cleared!");

      confirmDiv.appendChild(iconDiv);
      confirmDiv.appendChild(bubble);
      chatContainer.appendChild(confirmDiv);
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  });

  // Hide extension button - completely hides until page refresh
  btnHide.addEventListener("click", () => {
    if (
      confirm("Hide Botodachi? It will reappear when you refresh the page.")
    ) {
      root.style.display = "none";
      // Clean up timers
      if (_fadeTimeout) clearTimeout(_fadeTimeout);
      clearInterval(tickInterval);
    }
  });

  // Helper: Add message to chat (XSS-safe, uses cached personality)
  function addChatMessage(role, content) {
    const msgDiv = document.createElement("div");
    msgDiv.className = `chat-message chat-${role}`;

    const bubble = document.createElement("div");
    bubble.className = "chat-bubble";

    if (role === "user") {
      // User messages: plain text (no formatting needed)
      bubble.textContent = content;
      msgDiv.appendChild(bubble);
    } else {
      // AI messages: parse markdown for rich formatting (still XSS-safe)
      bubble.innerHTML = parseMarkdown(content);

      // Use cached personality for icon (no storage call needed)
      const iconDiv = document.createElement("div");
      iconDiv.className = "chat-icon";
      iconDiv.textContent = getPersonalityIcon(_cachedPersonality);
      msgDiv.appendChild(iconDiv);
      msgDiv.appendChild(bubble);
    }

    chatContainer.appendChild(msgDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  // ask button → call LLM
  askBtn.addEventListener("click", () => {
    const question = q.value.trim();
    if (question) {
      askLLM(question);
      q.value = ""; // Clear input
    }
  });

  // Netflix focus fix: prevent video player from stealing focus
  let lastInteractionTime = 0;
  let focusRestoreTimeout = null;

  // Track user interactions with input field
  q.addEventListener(
    "focus",
    (e) => {
      e.stopPropagation();
      e.stopImmediatePropagation();
      lastInteractionTime = Date.now();
    },
    true
  );

  // Character counter update
  const charCountEl = root.querySelector("#cinechat-char-count");
  const charCounterEl = root.querySelector("#cinechat-char-counter");

  q.addEventListener("input", () => {
    lastInteractionTime = Date.now(); // Update on every keystroke

    // Update character counter
    const currentLength = q.value.length;
    charCountEl.textContent = currentLength;

    // Color coding based on length
    if (currentLength >= 480) {
      charCounterEl.style.color = "#ff6b6b"; // Red - very close to limit
    } else if (currentLength >= 400) {
      charCounterEl.style.color = "#ffd93d"; // Yellow - warning
    } else {
      charCounterEl.style.color = "var(--muted-text)"; // Normal gray
    }
  });

  q.addEventListener(
    "mousedown",
    (e) => {
      e.stopPropagation();
      e.stopImmediatePropagation();
      lastInteractionTime = Date.now();
    },
    true
  );

  q.addEventListener(
    "click",
    (e) => {
      e.stopPropagation();
      e.stopImmediatePropagation();
      q.focus(); // Force focus back
      lastInteractionTime = Date.now();
    },
    true
  );

  // Auto-restore focus when Netflix steals it (on controls hide)
  q.addEventListener("blur", (e) => {
    const timeSinceInteraction = Date.now() - lastInteractionTime;
    const wasRecentlyActive =
      timeSinceInteraction < RECENT_INTERACTION_WINDOW_MS;

    // Only restore if user was recently typing/interacting
    if (wasRecentlyActive) {
      // Clear any pending restore
      if (focusRestoreTimeout) clearTimeout(focusRestoreTimeout);

      // Restore focus after Netflix's blur event completes
      focusRestoreTimeout = setTimeout(() => {
        // Double-check panel is still open before restoring
        if (panel.classList.contains("open")) {
          q.focus();
        }
      }, FOCUS_RESTORE_DELAY_MS);
    }
  });

  // prefab chips
  const btnWhatsHappening = root.querySelector("#cinechat-q-whats-happening");
  const btnTrivia = root.querySelector("#cinechat-q-trivia");
  const btnComments = root.querySelector("#cinechat-q-comments");

  // Show comments button only on YouTube
  const host = location.hostname;
  if (host.includes("youtube.com")) {
    btnComments.style.display = "inline-block";
  }

  btnWhatsHappening.addEventListener("click", () => {
    askLLM(
      "What's happening right now in this scene? Explain briefly.",
      "❓ What's happening?",
      true
    );
  });

  btnTrivia.addEventListener("click", () => {
    askLLM(
      "Give me 3 interesting trivia facts about this movie/video/song. Keep it spoiler-free and fun!",
      "🎲 Trivia",
      true
    ); // Skip validation
  });

  btnComments.addEventListener("click", () => {
    const comments = scrapeYouTubeComments();
    if (!comments || comments.length === 0) {
      // Add error message to chat (XSS-safe)
      const errorDiv = document.createElement("div");
      errorDiv.className = "chat-message chat-assistant";

      const iconDiv = document.createElement("div");
      iconDiv.className = "chat-icon";
      iconDiv.textContent = "📝";

      const bubble = document.createElement("div");
      bubble.className = "chat-bubble";
      bubble.innerHTML = parseMarkdown(
        "No comments found. Try scrolling down to load comments first."
      );

      errorDiv.appendChild(iconDiv);
      errorDiv.appendChild(bubble);
      chatContainer.appendChild(errorDiv);
      chatContainer.scrollTop = chatContainer.scrollHeight;
      return;
    }
    const commentsText = comments.slice(0, 20).join("\n---\n");
    const prompt = `Summarize these YouTube comments. Include:
- Overall sentiment (positive/negative/mixed)
- Main themes or topics discussed
- Notable or funny reactions

Comments:
${commentsText}`;
    askLLM(prompt, "💬 Sum Comments", true); // Skip validation - comments can be long
  });
}

// ---- LLM call helper ----
async function askLLM(question, displayText = null, skipValidation = false) {
  const chatContainer = document.getElementById("cinechat-chat-container");
  const askBtn = document.getElementById("cinechat-ask");
  if (!chatContainer) return;

  // Input validation (skip for automated/programmatic queries)
  if (!question || question.trim().length === 0) {
    return; // Empty question, ignore
  }

  // Only validate length for user-typed questions (not automated queries like comment summarization)
  if (!skipValidation && question.length > MAX_QUESTION_LENGTH) {
    const errorDiv = document.createElement("div");
    errorDiv.className = "chat-message chat-assistant";

    const errorIconDiv = document.createElement("div");
    errorIconDiv.className = "chat-icon";
    errorIconDiv.textContent = "⚠️";

    const errorBubble = document.createElement("div");
    errorBubble.className = "chat-bubble";
    errorBubble.innerHTML = parseMarkdown(
      `Question too long (max ${MAX_QUESTION_LENGTH} characters). Please shorten it.`
    );

    errorDiv.appendChild(errorIconDiv);
    errorDiv.appendChild(errorBubble);
    chatContainer.appendChild(errorDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    return;
  }

  // Rate limiting: Disable button while request is in flight
  if (askBtn) {
    askBtn.disabled = true;
    askBtn.textContent = "Asking...";
    askBtn.style.opacity = "0.7";
    askBtn.style.cursor = "not-allowed";
  }

  // Add user message to chat and history (XSS-safe)
  const msgDiv = document.createElement("div");
  msgDiv.className = "chat-message chat-user";

  const bubble = document.createElement("div");
  bubble.className = "chat-bubble";
  bubble.textContent = displayText || question;

  msgDiv.appendChild(bubble);
  chatContainer.appendChild(msgDiv);

  chatHistory.push({ role: "user", content: question });

  // Trim history if too long (keep only last MAX_CHAT_HISTORY * 2 messages)
  if (chatHistory.length > MAX_CHAT_HISTORY * 2) {
    chatHistory = chatHistory.slice(-(MAX_CHAT_HISTORY * 2));
  }

  // Add "thinking" placeholder (XSS-safe)
  const thinkingDiv = document.createElement("div");
  thinkingDiv.className = "chat-message chat-assistant";
  thinkingDiv.id = "thinking-placeholder";

  const thinkIconDiv = document.createElement("div");
  thinkIconDiv.className = "chat-icon";
  thinkIconDiv.textContent = "⏳";

  const thinkBubble = document.createElement("div");
  thinkBubble.className = "chat-bubble";
  thinkBubble.innerHTML = parseMarkdown("Thinking…");

  thinkingDiv.appendChild(thinkIconDiv);
  thinkingDiv.appendChild(thinkBubble);
  chatContainer.appendChild(thinkingDiv);
  chatContainer.scrollTop = chatContainer.scrollHeight;

  const v = getVideo();
  const now = v ? v.currentTime : 0;

  trimBuffer(now);
  let context = buffer.slice();
  if (!allowSpoilers) context = context.filter((c) => c.t0 <= now + 10);

  const metadata = getVideoMetadata();

  const payload = {
    question,
    now,
    allow_spoilers: allowSpoilers,
    context,
    metadata,
    chatHistory: chatHistory.slice(-10), // Send last 10 messages
  };

  try {
    // Check if extension context is valid
    if (!chrome?.runtime?.sendMessage) {
      throw new Error(
        "Extension context invalidated. Please refresh the page."
      );
    }

    const reply = await chrome.runtime.sendMessage({
      type: "CINECHAT_ASK",
      payload,
    });

    const answer = reply?.answer || "(no answer)";

    // Remove thinking placeholder
    thinkingDiv.remove();

    // Add AI response to chat (XSS-safe, uses cached personality)
    const answerDiv = document.createElement("div");
    answerDiv.className = "chat-message chat-assistant";

    const answerIconDiv = document.createElement("div");
    answerIconDiv.className = "chat-icon";
    answerIconDiv.textContent = getPersonalityIcon(_cachedPersonality);

    const answerBubble = document.createElement("div");
    answerBubble.className = "chat-bubble";
    answerBubble.innerHTML = parseMarkdown(answer); // Parse markdown for formatting

    answerDiv.appendChild(answerIconDiv);
    answerDiv.appendChild(answerBubble);

    chatContainer.appendChild(answerDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    chatHistory.push({ role: "assistant", content: answer });
  } catch (err) {
    thinkingDiv.remove();

    // Add error message to chat (XSS-safe)
    const errorDiv = document.createElement("div");
    errorDiv.className = "chat-message chat-assistant";

    const errorIconDiv = document.createElement("div");
    errorIconDiv.className = "chat-icon";
    errorIconDiv.textContent = "❌";

    const errorBubble = document.createElement("div");
    errorBubble.className = "chat-bubble";
    errorBubble.innerHTML = parseMarkdown(
      `Error: ${err?.message || String(err)}`
    );

    errorDiv.appendChild(errorIconDiv);
    errorDiv.appendChild(errorBubble);
    chatContainer.appendChild(errorDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
  } finally {
    // Re-enable button after request completes (success or error)
    if (askBtn) {
      askBtn.disabled = false;
      askBtn.textContent = "Ask";
      askBtn.style.opacity = "1";
      askBtn.style.cursor = "pointer";
    }
  }
}

// ---- Helper: Extract video ID from URL (ignore hash changes) ----
function getVideoId(url) {
  try {
    const urlObj = new URL(url);
    const host = urlObj.hostname;

    if (host.includes("youtube.com")) {
      // YouTube: extract video ID from query param or path
      const videoId = urlObj.searchParams.get("v");
      if (videoId) return `yt_${videoId}`;

      // YouTube shorts: /shorts/VIDEO_ID
      const shortsMatch = urlObj.pathname.match(/\/shorts\/([^/?]+)/);
      if (shortsMatch) return `yt_${shortsMatch[1]}`;
    } else if (host.includes("netflix.com")) {
      // Netflix: extract from /watch/VIDEO_ID
      const netflixMatch = urlObj.pathname.match(/\/watch\/(\d+)/);
      if (netflixMatch) return `nf_${netflixMatch[1]}`;
    }

    // Fallback: use pathname only (ignore hash and query params)
    return urlObj.origin + urlObj.pathname;
  } catch {
    return url; // If URL parsing fails, use full URL
  }
}

// ---- Main loop ----
let _lastVideoId = null;

function tick() {
  // Detect navigation to NEW VIDEO (ignore hash/timestamp changes)
  const currentVideoId = getVideoId(location.href);
  if (currentVideoId !== _lastVideoId && _lastVideoId !== null) {
    console.log(
      "[Botodachi] New video detected - clearing buffer, title cache, and chat history"
    );
    buffer.length = 0; // Clear buffer
    _lastAdded = ""; // Reset deduplication tracker
    _cachedTitle = null; // Clear cached title for new video
    chatHistory.length = 0; // Clear chat history
    _lastDisplayedTitle = null; // Clear title cache so it updates immediately
    _lastWarningState = false; // Reset warning state

    // Clear chat UI
    const chatContainer = document.getElementById("cinechat-chat-container");
    if (chatContainer) chatContainer.innerHTML = "";
  }
  _lastVideoId = currentVideoId;
  _lastURL = location.href; // Still track full URL for other purposes

  const v = getVideo();
  if (v) {
    const now = v.currentTime || 0;
    trimBuffer(now);

    // PRIVACY: Only capture captions if user has enabled it
    if (captureEnabled) {
      const host = location.hostname;
      if (host.includes("youtube.com")) {
        readYouTubeCaptions(now);
        readYouTubeCaptionsDOM(now);
      } else if (host.includes("netflix.com")) {
        readNetflixCaptions(now);
      }
    }

    // Update video title in header (optimized - only updates DOM when changed)
    updateHeaderTitle();
  }
}

// ---- Update header with current video title ----
let _titleElement = null;
let _bufferStatusElement = null;
let _subtitleWarningElement = null;
let _lastDisplayedTitle = null;
let _lastDisplayedBuffer = null;
let _lastWarningState = false;

function updateHeaderTitle() {
  if (!_titleElement)
    _titleElement = document.getElementById("cinechat-video-title");
  if (!_bufferStatusElement)
    _bufferStatusElement = document.getElementById("cinechat-buffer-status");
  if (!_subtitleWarningElement)
    _subtitleWarningElement = document.getElementById(
      "cinechat-subtitle-warning"
    );
  if (!_titleElement) return;

  const metadata = getVideoMetadata();
  let displayTitle;

  if (metadata && metadata.title && metadata.title !== "Unknown Video") {
    // Truncate long titles
    const maxLength = 40;
    displayTitle =
      metadata.title.length > maxLength
        ? `📺 ${metadata.title.substring(0, maxLength)}...`
        : `📺 ${metadata.title}`;
  } else {
    displayTitle = "No video detected";
  }

  // Only update DOM if title actually changed (performance optimization)
  if (displayTitle !== _lastDisplayedTitle) {
    _titleElement.textContent = displayTitle;
    _lastDisplayedTitle = displayTitle;
  }

  // Update buffer status indicator
  if (_bufferStatusElement && buffer.length > 0) {
    const oldestTime = buffer[0].t0;
    const newestTime = buffer[buffer.length - 1].t1;
    const durationMinutes = Math.floor((newestTime - oldestTime) / 60);
    const displayBuffer =
      durationMinutes > 0 ? `📊 ${durationMinutes} min` : "📊 <1 min";

    if (displayBuffer !== _lastDisplayedBuffer) {
      _bufferStatusElement.textContent = displayBuffer;
      _lastDisplayedBuffer = displayBuffer;
    }
  } else if (_bufferStatusElement && buffer.length === 0) {
    // Clear buffer status when empty
    if (_lastDisplayedBuffer !== "") {
      _bufferStatusElement.textContent = "";
      _lastDisplayedBuffer = "";
    }
  }

  // Show subtitle warning if buffer is empty and video is playing
  if (_subtitleWarningElement) {
    const v = getVideo();
    const shouldShowWarning =
      v && v.currentTime > 5 && buffer.length === 0 && !v.paused;

    if (shouldShowWarning !== _lastWarningState) {
      _subtitleWarningElement.style.display = shouldShowWarning
        ? "block"
        : "none";
      _lastWarningState = shouldShowWarning;
    }
  }
}
function makeDraggable(container, handle) {
  let startX = 0,
    startY = 0,
    originLeft = 0,
    originTop = 0,
    dragging = false;

  const onDown = (e) => {
    dragging = true;
    const ev = e.touches ? e.touches[0] : e;
    startX = ev.clientX;
    startY = ev.clientY;
    const rect = container.getBoundingClientRect();
    // switch from bottom/right anchoring to top/left so we can move freely
    container.style.left = rect.left + "px";
    container.style.top = rect.top + "px";
    container.style.right = "auto";
    container.style.bottom = "auto";
    originLeft = rect.left;
    originTop = rect.top;
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    document.addEventListener("touchmove", onMove, { passive: false });
    document.addEventListener("touchend", onUp);
  };

  const onMove = (e) => {
    if (!dragging) return;
    const ev = e.touches ? e.touches[0] : e;
    const dx = ev.clientX - startX;
    const dy = ev.clientY - startY;
    container.style.left = originLeft + dx + "px";
    container.style.top = originTop + dy + "px";
    e.preventDefault?.();
  };

  const onUp = () => {
    dragging = false;
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("mouseup", onUp);
    document.removeEventListener("touchmove", onMove);
    document.removeEventListener("touchend", onUp);
  };

  handle.addEventListener("mousedown", onDown);
  handle.addEventListener("touchstart", onDown, { passive: false });
}

// Boot
checkFirstRun(); // PRIVACY: Show consent dialog on first run
ensureOverlay();
const tickInterval = setInterval(tick, TICK_INTERVAL_MS);

// Clean up on page unload to prevent memory leaks
window.addEventListener("unload", () => {
  clearInterval(tickInterval);
  if (_fadeTimeout) clearTimeout(_fadeTimeout);
  if (_storageListener) {
    chrome.storage.onChanged.removeListener(_storageListener);
  }
  if (_keydownListener) {
    document.removeEventListener("keydown", _keydownListener);
  }
  console.log("[Botodachi] Cleaned up interval, timers, and event listeners");
});
