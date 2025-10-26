// ==============================
// CineChat MVP - content.js
// ==============================

// ---- Config / state ----
const CAP_BUFFER_SECS = 7200; // keep last 2 hours (full movies)
const buffer = []; // { t0, t1, text }
let videoRef = null;
let allowSpoilers = false;
let _lastAdded = "";
let _lastURL = location.href; // Track current video URL for navigation detection
let _cachedTitle = null; // Cache video title to prevent flickering
let chatHistory = []; // Store conversation history for context
const MAX_CHAT_HISTORY = 10; // Keep last 10 Q&A pairs

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

  console.log(`[CineChat] Scraped ${comments.length} YouTube comments`);
  return comments.length > 0 ? comments : null;
}

// ---- Video metadata extraction ----
function getVideoMetadata() {
  const host = location.hostname;
  let title = "Unknown Video";
  const url = location.href;

  // Return cached title if we have a good one (not "Unknown Video" or ID-based)
  if (_cachedTitle && !_cachedTitle.includes("Netflix Video ID:") && _cachedTitle !== "Unknown Video") {
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
      title = titleEl.getAttribute?.("content") || titleEl.textContent?.trim() || title;
    }
    console.log("[CineChat] YouTube title detected:", title);
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
      title = titleEl.getAttribute?.("content") || titleEl.textContent?.trim() || title;
    }

    // Fallback: try to extract from URL pattern (only if nothing else worked)
    if (title === "Unknown Video") {
      const match = url.match(/\/watch\/(\d+)/);
      if (match) {
        title = `Netflix Video ID: ${match[1]}`;
      }
    }

    console.log("[CineChat] Netflix title detected:", title);
    console.log("[CineChat] Tried selectors - found element:", !!titleEl);
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
    // console.log("[CineChat] Captions(textTracks):", text);
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
  // console.log("[CineChat] Captions(DOM):", text);
}

// ---- Netflix: DOM capture ----
function readNetflixCaptions(now) {
  // Netflix frequently renders timed text in these candidates
  const candidates = document.querySelectorAll(
    [
      '[data-uia="player-timedtext"]',
      'div[class*="player-timedtext"]',
      'div[data-uia*="timedtext"]',
      'div[data-uia="subtitle-text"]',
      'div[aria-live="assertive"]',
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
    // console.log("[CineChat] NF captions:", text);
  }
}

// ---- Preview renderer (GLOBAL so tick() can call it) ----
function renderPreview() {
  const showBuf = document.getElementById("cinechat-showbuf");
  const preview = document.getElementById("cinechat-preview");
  if (!showBuf || !preview) return;

  if (!showBuf.checked) {
    preview.style.display = "none";
    return;
  }
  preview.style.display = "block";

  // show last 5 unique non-empty lines from buffer (most recent first)
  const seen = new Set();
  const lines = [];
  for (let i = buffer.length - 1; i >= 0 && lines.length < 5; i--) {
    const t = buffer[i].text.trim();
    if (t && !seen.has(t)) {
      lines.push(t);
      seen.add(t);
    }
  }
  preview.textContent = lines.reverse().join("\n");
}

// ---- Overlay UI ----
function ensureOverlay() {
  if (document.getElementById("cinechat-root")) return;

  const root = document.createElement("div");
  root.id = "cinechat-root";
  root.innerHTML = `
    <button id="cinechat-toggle">💬</button>
    <div id="cinechat-panel">
      <div id="cinechat-header">
        <div>CineChat MVP</div>
        <div id="cinechat-video-title" style="font-size:11px; color:#999; margin-top:2px;">Loading...</div>
        <div id="cinechat-small"><kbd>Ctrl+Shift+C</kbd> to toggle</div>
      </div>

      <div id="cinechat-row">
        <label><input type="checkbox" id="cinechat-spoil"> Allow spoilers</label>
        <label style="font-size:12px;color:#bbb;">
          <input type="checkbox" id="cinechat-showbuf"> Captions
        </label>
      </div>

      <div id="cinechat-preview" style="display:none;"></div>

      <div id="cinechat-chat-container"></div>

      <div id="cinechat-input-area">
        <div id="cinechat-quick">
          <button class="cinechat-chip" id="cinechat-q-recap">📖 Recap</button>
          <button class="cinechat-chip" id="cinechat-q-trivia">🎲 Trivia</button>
          <button class="cinechat-chip" id="cinechat-q-comments" style="display:none;">💬 Sum Comments</button>
          <button class="cinechat-chip" id="cinechat-clear" style="opacity:0.6;">🗑️ Clear</button>
        </div>
        <div id="cinechat-input-row">
          <textarea id="cinechat-q" placeholder="Ask anything..."></textarea>
          <button id="cinechat-ask">Ask</button>
        </div>
      </div>
    </div>
    <div id="cinechat-personalities-float">
      <div style="font-size:11px; color:#cbd5e1; font-weight:600; margin-right:4px;">Personality:</div>
      <button class="personality-btn" data-personality="neutral" title="Neutral">🎬</button>
      <button class="personality-btn" data-personality="moviebuff" title="Movie Buff">📽️</button>
      <button class="personality-btn" data-personality="comedy" title="Comedy">😂</button>
      <button class="personality-btn" data-personality="vulcan" title="Vulcan">🖖</button>
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
  const panel = root.querySelector("#cinechat-panel");
  const askBtn = root.querySelector("#cinechat-ask");
  const q = root.querySelector("#cinechat-q");
  const chatContainer = root.querySelector("#cinechat-chat-container");
  const spoil = root.querySelector("#cinechat-spoil");
  const showBuf = root.querySelector("#cinechat-showbuf");
  const btnClear = root.querySelector("#cinechat-clear");

  const header = root.querySelector("#cinechat-header");
  makeDraggable(root, header);

  // Prevent YouTube/Netflix keyboard shortcuts while typing
  // Strategy: Stop propagation (so Netflix doesn't see it) but allow default typing behavior
  const blockKeys = (e) => {
    // Stop Netflix/YouTube from seeing the event
    e.stopPropagation();
    e.stopImmediatePropagation();
    // DON'T preventDefault - we want normal typing to work!
  };

  // Block on textarea (main input area)
  q.addEventListener("keydown", blockKeys, true); // capture phase
  q.addEventListener("keyup", blockKeys, true);
  q.addEventListener("keypress", blockKeys, true);

  // Also block on entire panel to catch all inputs (checkboxes, buttons, etc.)
  panel.addEventListener("keydown", blockKeys, true);
  panel.addEventListener("keyup", blockKeys, true);
  panel.addEventListener("keypress", blockKeys, true);

  // Restore spoiler toggle from content-script state
  spoil.checked = allowSpoilers;
  spoil.addEventListener("change", () => {
    allowSpoilers = spoil.checked;
  });

  // Personality switcher
  const personalityBtns = root.querySelectorAll(".personality-btn");

  // Load and highlight current personality
  chrome.storage.local.get({ personality: "neutral" }, (cfg) => {
    const currentPersonality = cfg.personality;
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

      // Save to storage
      chrome.storage.local.set({ personality: newPersonality });

      // Visual feedback - add to chat instead
      const feedbackDiv = document.createElement("div");
      feedbackDiv.className = "chat-message chat-assistant";
      feedbackDiv.innerHTML = `<div class="chat-icon">${btn.textContent}</div><div class="chat-bubble">Switched to ${btn.title} personality! 🎭</div>`;
      chatContainer.appendChild(feedbackDiv);
      chatContainer.scrollTop = chatContainer.scrollHeight;
    });
  });

  toggle.addEventListener("click", () => {
    panel.classList.toggle("open");
  });

  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.shiftKey && e.code === "KeyC") {
      panel.classList.toggle("open");
    }
  });

  // Clear chat button
  btnClear.addEventListener("click", () => {
    chatHistory.length = 0;
    chatContainer.innerHTML = "";
  });

  // Helper: Add message to chat
  function addChatMessage(role, content) {
    const msgDiv = document.createElement("div");
    msgDiv.className = `chat-message chat-${role}`;

    if (role === "user") {
      msgDiv.innerHTML = `<div class="chat-bubble">${content}</div>`;
    } else {
      // Get current personality for icon
      chrome.storage.local.get({ personality: "neutral" }, (cfg) => {
        const icons = {
          neutral: "🎬",
          moviebuff: "📽️",
          comedy: "😂",
          vulcan: "🖖"
        };
        const icon = icons[cfg.personality] || "🎬";
        msgDiv.innerHTML = `<div class="chat-icon">${icon}</div><div class="chat-bubble">${content}</div>`;
      });
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

  // preview checkbox
  showBuf.addEventListener("change", renderPreview);

  // prefab chips
  const btnRecap = root.querySelector("#cinechat-q-recap");
  const btnTrivia = root.querySelector("#cinechat-q-trivia");
  const btnComments = root.querySelector("#cinechat-q-comments");

  // Show comments button only on YouTube
  const host = location.hostname;
  if (host.includes("youtube.com")) {
    btnComments.style.display = "inline-block";
  }

  btnRecap.addEventListener("click", () => {
    askLLM("Give a concise recap (3–5 sentences) of what's happened in the last few minutes.", "📖 Recap");
  });

  btnTrivia.addEventListener("click", () => {
    askLLM("Give me 3 interesting trivia facts about this movie/video/song. Keep it spoiler-free and fun!", "🎲 Trivia");
  });

  btnComments.addEventListener("click", () => {
    const comments = scrapeYouTubeComments();
    if (!comments || comments.length === 0) {
      // Add error message to chat
      const errorDiv = document.createElement("div");
      errorDiv.className = "chat-message chat-assistant";
      errorDiv.innerHTML = `<div class="chat-icon">📝</div><div class="chat-bubble">No comments found. Try scrolling down to load comments first.</div>`;
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
    askLLM(prompt, "💬 Sum Comments");
  });
}

// ---- LLM call helper ----
async function askLLM(question, displayText = null) {
  const chatContainer = document.getElementById("cinechat-chat-container");
  if (!chatContainer) return;

  // Add user message to chat and history
  const msgDiv = document.createElement("div");
  msgDiv.className = "chat-message chat-user";
  msgDiv.innerHTML = `<div class="chat-bubble">${displayText || question}</div>`;
  chatContainer.appendChild(msgDiv);

  chatHistory.push({ role: "user", content: question });

  // Trim history if too long
  if (chatHistory.length > MAX_CHAT_HISTORY * 2) {
    chatHistory.splice(0, 2); // Remove oldest Q&A pair
  }

  // Add "thinking" placeholder
  const thinkingDiv = document.createElement("div");
  thinkingDiv.className = "chat-message chat-assistant";
  thinkingDiv.id = "thinking-placeholder";
  thinkingDiv.innerHTML = `<div class="chat-icon">⏳</div><div class="chat-bubble">Thinking…</div>`;
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
    chatHistory: chatHistory.slice(-10) // Send last 10 messages
  };

  try {
    // Check if extension context is valid
    if (!chrome?.runtime?.sendMessage) {
      throw new Error("Extension context invalidated. Please refresh the page.");
    }

    const reply = await chrome.runtime.sendMessage({
      type: "CINECHAT_ASK",
      payload,
    });

    const answer = reply?.answer || "(no answer)";

    // Remove thinking placeholder
    thinkingDiv.remove();

    // Add AI response to chat
    const answerDiv = document.createElement("div");
    answerDiv.className = "chat-message chat-assistant";

    chrome.storage.local.get({ personality: "neutral" }, (cfg) => {
      const icons = {
        neutral: "🎬",
        moviebuff: "📽️",
        comedy: "😂",
        vulcan: "🖖"
      };
      const icon = icons[cfg.personality] || "🎬";
      answerDiv.innerHTML = `<div class="chat-icon">${icon}</div><div class="chat-bubble">${answer}</div>`;
    });

    chatContainer.appendChild(answerDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    chatHistory.push({ role: "assistant", content: answer });

  } catch (err) {
    thinkingDiv.remove();

    const errorDiv = document.createElement("div");
    errorDiv.className = "chat-message chat-assistant";
    errorDiv.innerHTML = `<div class="chat-icon">❌</div><div class="chat-bubble">Error: ${err?.message || String(err)}</div>`;
    chatContainer.appendChild(errorDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }
}

// ---- Main loop ----
function tick() {
  // Detect navigation (URL change) and clear buffer for new video
  const currentURL = location.href;
  if (currentURL !== _lastURL) {
    console.log("[CineChat] Navigation detected - clearing buffer, title cache, and chat history");
    buffer.length = 0; // Clear buffer
    _lastAdded = "";    // Reset deduplication tracker
    _cachedTitle = null; // Clear cached title for new video
    chatHistory.length = 0; // Clear chat history
    _lastURL = currentURL;
  }

  const v = getVideo();
  if (v) {
    const now = v.currentTime || 0;
    trimBuffer(now);

    const host = location.hostname;
    if (host.includes("youtube.com")) {
      readYouTubeCaptions(now);
      readYouTubeCaptionsDOM(now);
    } else if (host.includes("netflix.com")) {
      readNetflixCaptions(now);
    }

    // refresh preview every tick
    renderPreview();

    // update video title in header
    updateHeaderTitle();
  }
}

// ---- Update header with current video title ----
function updateHeaderTitle() {
  const titleEl = document.getElementById("cinechat-video-title");
  if (!titleEl) return;

  const metadata = getVideoMetadata();
  if (metadata && metadata.title && metadata.title !== "Unknown Video") {
    // Truncate long titles
    const maxLength = 40;
    const displayTitle = metadata.title.length > maxLength
      ? metadata.title.substring(0, maxLength) + "..."
      : metadata.title;
    titleEl.textContent = `📺 ${displayTitle}`;
  } else {
    titleEl.textContent = "No video detected";
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
ensureOverlay();
setInterval(tick, 300);
