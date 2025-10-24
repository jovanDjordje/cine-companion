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

      <div id="cinechat-personalities">
        <div style="font-size:10px; color:#999; margin-bottom:4px;">Personality:</div>
        <div style="display:flex; gap:6px; flex-wrap:wrap;">
          <button class="personality-btn" data-personality="neutral" title="Neutral">🎬</button>
          <button class="personality-btn" data-personality="moviebuff" title="Movie Buff">📽️</button>
          <button class="personality-btn" data-personality="comedy" title="Comedy">😂</button>
          <button class="personality-btn" data-personality="analyst" title="Analyst">🧠</button>
          <button class="personality-btn" data-personality="hype" title="Hype">🎉</button>
          <button class="personality-btn" data-personality="casual" title="Casual">😎</button>
        </div>
      </div>

      <div id="cinechat-row">
        <label><input type="checkbox" id="cinechat-spoil"> Allow spoilers</label>
      </div>

      <textarea id="cinechat-q" placeholder="Ask e.g. 'Why is he upset here?'"></textarea>
      <button id="cinechat-ask">Ask</button>

      <div style="margin-top:6px; display:flex; align-items:center; gap:8px;">
        <label style="font-size:12px;color:#bbb;">
          <input type="checkbox" id="cinechat-showbuf" checked> Show last captions
        </label>
      </div>

      <div id="cinechat-preview" style="display:none;"></div>

      <div id="cinechat-quick">
        <button class="cinechat-chip" id="cinechat-q-recap-120">Recap last 2 min</button>
        <button class="cinechat-chip" id="cinechat-q-eli12">Explain simply</button>
        <button class="cinechat-chip" id="cinechat-q-why">Why is this happening?</button>
        <button class="cinechat-chip" id="cinechat-q-terms">Define key terms</button>
        <button class="cinechat-chip" id="cinechat-q-trivia">🎲 Trivia</button>
        <button class="cinechat-chip" id="cinechat-q-comments" style="display:none;">📝 Comments</button>
      </div>

      <div id="cinechat-answer"></div>
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
  const ans = root.querySelector("#cinechat-answer");
  const spoil = root.querySelector("#cinechat-spoil");
  const showBuf = root.querySelector("#cinechat-showbuf");

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

      // Save to storage
      chrome.storage.local.set({ personality: newPersonality });

      // Visual feedback
      ans.textContent = `Switched to ${btn.title} personality! 🎭`;
      setTimeout(() => {
        if (ans.textContent.includes("Switched to")) {
          ans.textContent = "";
        }
      }, 2000);
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

  // ask button → call LLM
  askBtn.addEventListener("click", () => {
    const question = q.value.trim();
    if (question) askLLM(question, ans);
  });

  // preview checkbox
  showBuf.addEventListener("change", renderPreview);

  // prefab chips
  const btnRecap = root.querySelector("#cinechat-q-recap-120");
  const btnELI12 = root.querySelector("#cinechat-q-eli12");
  const btnWhy = root.querySelector("#cinechat-q-why");
  const btnTerms = root.querySelector("#cinechat-q-terms");
  const btnTrivia = root.querySelector("#cinechat-q-trivia");
  const btnComments = root.querySelector("#cinechat-q-comments");

  // Show comments button only on YouTube
  const host = location.hostname;
  if (host.includes("youtube.com")) {
    btnComments.style.display = "inline-block";
  }

  btnRecap.addEventListener("click", () => {
    askLLM(
      "Give a concise recap (3–5 sentences) of the last ~2 minutes, using only the provided context.",
      ans
    );
  });
  btnELI12.addEventListener("click", () => {
    askLLM(
      "Explain the last minute in very simple terms, as if to a 12-year-old. Keep it to 3–4 sentences.",
      ans
    );
  });
  btnWhy.addEventListener("click", () => {
    askLLM(
      "Why are the characters doing what they're doing right now? Use only the context so far, no spoilers.",
      ans
    );
  });
  btnTerms.addEventListener("click", () => {
    askLLM(
      "List and briefly define any technical terms or names that appeared in the last 2–3 minutes.",
      ans
    );
  });
  btnTrivia.addEventListener("click", () => {
    askLLM(
      "Give me 3 interesting trivia facts about this movie/video/song. Keep it spoiler-free and fun!",
      ans
    );
  });
  btnComments.addEventListener("click", () => {
    const comments = scrapeYouTubeComments();
    if (!comments || comments.length === 0) {
      ans.textContent = "No comments found. Try scrolling down to load comments first.";
      return;
    }
    const commentsText = comments.slice(0, 20).join("\n---\n");
    const prompt = `Summarize these YouTube comments. Include:
- Overall sentiment (positive/negative/mixed)
- Main themes or topics discussed
- Notable or funny reactions

Comments:
${commentsText}`;
    askLLM(prompt, ans);
  });
}

// ---- LLM call helper ----
async function askLLM(question, ansEl) {
  const ans = ansEl || document.getElementById("cinechat-answer");
  if (!ans) return;
  ans.textContent = "Thinking…";

  const v = getVideo();
  const now = v ? v.currentTime : 0;

  trimBuffer(now);
  let context = buffer.slice();
  if (!allowSpoilers) context = context.filter((c) => c.t0 <= now + 10);

  // Include video metadata for better AI context
  const metadata = getVideoMetadata();

  const payload = {
    question,
    now,
    allow_spoilers: allowSpoilers,
    context,
    metadata  // Add video title, URL, platform
  };
  try {
    const reply = await chrome.runtime.sendMessage({
      type: "CINECHAT_ASK",
      payload,
    });
    ans.textContent = reply?.answer || "(no answer)";
  } catch (err) {
    ans.textContent = `Error: ${
      err && err.message ? err.message : String(err)
    }`;
  }
}

// ---- Main loop ----
function tick() {
  // Detect navigation (URL change) and clear buffer for new video
  const currentURL = location.href;
  if (currentURL !== _lastURL) {
    console.log("[CineChat] Navigation detected - clearing buffer and title cache");
    buffer.length = 0; // Clear buffer
    _lastAdded = "";    // Reset deduplication tracker
    _cachedTitle = null; // Clear cached title for new video
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
