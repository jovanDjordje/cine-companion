# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CineChat MVP is a Chrome/Chromium browser extension (Manifest V3) that provides AI-powered real-time assistance while watching videos on YouTube and Netflix. The extension captures video captions/subtitles and uses them as context for answering user questions about the content.

**Key characteristics:**
- Zero-configuration vanilla JavaScript (no build tools, no dependencies, no package.json)
- Direct execution - load as unpacked extension in Chrome
- Flat file structure with 6 core files at repository root

## Development Setup

**To test/develop:**
1. Open `chrome://extensions/` in Chrome/Chromium
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select this directory (`cinechat-mvp`)
5. Configure API settings via extension options page

**To reload changes:**
- Click the refresh icon on the extension card in `chrome://extensions/`
- Or use Ctrl+R on the options page
- Content script changes require a page refresh on YouTube/Netflix

**No build commands needed** - all files execute directly in the browser.

## Architecture

### Message Flow
```
Video Page (YouTube/Netflix)
    ↓ (Caption capture via DOM/TextTrack API)
Content Script (content.js)
    ↓ (Chrome message passing)
Background Service Worker (background.js)
    ↓ (HTTPS POST)
OpenAI API (or compatible)
    ↓
User receives answer in overlay UI
```

### Core Components

**`background.js` (~100 lines)** - Service worker handling LLM communication
- `getSettings()`: Retrieves config from Chrome Storage Local API (for security)
- `buildPrompt(payload)`: Constructs system + user messages with subtitle context and video metadata
- `callOpenAI(settings, payload)`: Makes OpenAI API request
- Message listener: Handles `CINECHAT_ASK` messages from content script

**`content.js` (~400 lines)** - Content script injected into video pages
- **Caption capture**: Multi-source approach for reliability
  - YouTube: `video.textTracks` API (primary)
  - YouTube: DOM fallback via `.ytp-caption-segment`
  - Netflix: Multiple DOM selectors for timed text
- **Buffer management**: Maintains 2-hour rolling buffer with deduplication and navigation detection
- **Metadata extraction**: `getVideoMetadata()` extracts video title and URL from page DOM
- **UI rendering**: Creates draggable overlay with FAB toggle button
- **Main loop**: `tick()` runs every 300ms to poll for new captions and detect navigation
- **Event handling**: Keyboard shortcuts (Alt+C), button clicks, drag

**`options.html` + `options.js`** - Extension configuration page
- Stores: API provider, base URL, model name, API key, max tokens
- Uses Chrome Storage Local API (for security - keys don't sync across devices)

**`overlay.css` (180 lines)** - Styling with CSS custom properties
- Auto-detects light/dark mode via `prefers-color-scheme`
- Draggable panel + floating action button (FAB)
- Backdrop blur and semi-transparent backgrounds

**`manifest.json`** - Extension configuration
- Manifest V3 format
- Permissions: `storage`, `activeTab`, `scripting`
- Host permissions: `*://*.youtube.com/*`, `*://*.netflix.com/*`
- Content scripts run at `document_idle`

### Key Implementation Details

**Spoiler Protection System** (content.js:278)
```javascript
// When allowSpoilers is false, filter context to current time + 10 seconds
if (!allowSpoilers) context = context.filter((c) => c.t0 <= now + 10);
```

**Caption Buffer** (content.js:6-30)
- Stores last 7200 seconds (2 hours) of captions - enough for full movies
- Format: `{ t0: startTime, t1: endTime, text: string }`
- Automatic deduplication via `_lastAdded` tracker
- Soft merging of contiguous captions (within 1 second)
- Sorted chronologically, oldest entries trimmed first
- **Navigation detection**: Buffer auto-clears when URL changes (different video)

**LLM Prompt Structure** (background.js:125-214)
- System message: Includes video title and platform, instructs model to use both subtitle context AND general knowledge
- User message includes:
  - User's question
  - Current video timestamp (`now`)
  - Spoiler permission flag
  - Last 60 context chunks (capped for token efficiency)
- **Enhanced context**: Video metadata (title, URL, platform) sent from content.js
- Temperature: 0.2 (deterministic responses)
- Default max_tokens: 400
- **AI can now use general knowledge** about the specific video/movie title

**Verbalized Sampling for Comedy** (background.js:190-262)
- Special prompt modification for Comedian personality
- Asks model to generate 2 responses with probability values from tail distribution (p < 0.10)
- Format: `RESPONSE N (probability: X.XX):`
- `selectRandomResponse()` parses probabilities and uses inverse weighting
- Lower probability responses = more creative = higher selection chance
- Optimized to 2 responses for better performance while maintaining creativity boost
- Example output in console: `[Botodachi] Verbalized Sampling: Selected response 2 with probability 0.05 (weight: 0.615)`

**Message Passing Protocol** (content.js:316-327, background.js:77-94)
```javascript
// Content → Background
chrome.runtime.sendMessage({
  type: "CINECHAT_ASK",
  payload: {
    question, now, allow_spoilers, context,
    metadata  // NEW: {title, url, platform}
  }
})

// Background → Content (via sendResponse)
{ answer: string }
```

## Common Patterns

**Adding new caption sources:**
1. Create a new read function in content.js (following pattern of `readYouTubeCaptions`)
2. Call it from `tick()` with appropriate hostname check
3. Use `addCue(t0, t1, text)` to add to buffer with automatic deduplication

**Supporting new LLM providers:**
1. Add provider option in `options.html` form
2. Update `getSettings()` defaults in `background.js`
3. Add conditional branch in message listener (line 82-86)
4. Implement provider-specific API call function

**Modifying UI:**
- HTML structure: content.js lines 156-188
- Styling: overlay.css (use CSS custom properties for theming)
- Event handlers: content.js lines 199-264
- Always test both light and dark modes

**Extending quick-action buttons:**
1. Add button HTML in `ensureOverlay()` (line 179-184)
2. Query button element (line 236-239)
3. Add click listener with pre-filled question (line 241-264)

## Testing Checklist

When making changes, verify:
- [ ] Extension loads without errors in chrome://extensions/
- [ ] Content script injects on both YouTube and Netflix
- [ ] Captions are captured (check preview window)
- [ ] LLM responses work with valid API key
- [ ] Spoiler toggle correctly filters context
- [ ] UI is draggable and responds to Alt+C
- [ ] Both light and dark modes render correctly
- [ ] No console errors in page or background contexts

**Debugging tips:**
- Uncomment `console.log` statements in content.js (lines 69, 88, 121)
- Check background service worker console via "Inspect views: service worker" link
- Check page console (F12) for content script errors
- Verify API key is set in extension options

## Recent Improvements

### MVP 1.5 - Personality System & Features
**✅ Completed:**
- 4 AI personalities with distinct behaviors (Neutral, Movie Buff, Comedy, Vulcan)
- Personality quick-switcher UI with emoji buttons
- 3 LLM provider support: OpenAI-compatible, Ollama (local), Google AI (Gemini)
- YouTube comments summarization feature
- Quick action buttons: Recap, Trivia, Comments (YouTube only)
- Personality-based gradient backgrounds that change on selection

### Phase 4 - Verbalized Sampling (LATEST)
**✅ Completed:**
- Implemented Verbalized Sampling for Comedian personality to unlock more creative responses
- Based on Stanford research: asking for probabilities triggers pre-training distribution (not aligned/collapsed)
- Generates 2 responses with explicit probability values from model
- Uses **inverse probability weighting** for selection: lower probability = higher selection chance
- Results in more diverse, less repetitive, and more creative comedic responses
- **Optimized to 2 responses**: Balances creativity boost with performance (3 responses was too slow)

**How it works:**
1. Prompt asks model to "sample from TAILS of probability distribution" (p < 0.10)
2. Model generates 2 responses in format: `RESPONSE N (probability: X.XX):`
3. Parser extracts text + probability from each response
4. Selection uses weighted random: `weight = 1/probability` (more creative = higher chance)
5. Example: probabilities [0.08, 0.05] → lowest gets ~1.6× more selection weight than highest

**Key files updated:**
- background.js: New prompt format (lines 190-211), rewritten `selectRandomResponse()` with inverse weighting (lines 216-262)
- Console logs show parsed probabilities and selection weights for debugging

### Phase 3 - Chat Interface
**✅ Completed:**
- Chat bubble UI replacing single answer area
- Conversation history tracking (last 10 Q&A pairs)
- Chat history sent to AI for pronoun resolution ("she", "he", "it" references)
- User messages: right-aligned blue bubbles
- AI messages: left-aligned bubbles with personality icons
- Clear chat button
- Input field moved to bottom (inline with Ask button)
- Enhanced visual separation:
  - Vibrant personality gradients (neutral blue, moviebuff purple, comedy gold, vulcan cyan)
  - Brightened UI text (#f8f9fa) for better readability
  - Distinct input section with semi-transparent background panel
  - Chat container with subtle background and borders
  - Enhanced input field with darker background and 2px borders
  - Empty state message when no chat history
- Auto-scroll to latest message
- Chat history cleared on video navigation

**Key files updated:**
- content.js: Chat history state (line 13-14), chat bubble rendering (line 468-551)
- background.js: Conversation context in prompts (line 48-71, 64-70)
- overlay.css: Gradient themes (line 16-92), section separation (line 131-169), chat bubbles (line 320-348)

### MVP 1.1 - Core Improvements
**✅ Completed:**
- Buffer capacity increased from 10 minutes to 2 hours (full movie support)
- Video metadata extraction (title, URL) for enhanced AI context
- AI can now use general knowledge about specific videos/movies
- Switched to `chrome.storage.local` for better API key security
- Navigation detection: buffer auto-clears when URL changes
- Tab isolation verified with URL tracking

## Known Limitations

- Caption capture depends on platform-specific DOM structure (may break with site updates)
- No offline mode (requires API connection)
- Buffer limited to 2 hours (older content is trimmed)
- No support for multiple simultaneous videos on same page
- Polling-based caption detection (300ms interval) may miss rapid-fire subtitles
- No persistence of chat history between page refreshes
- No API for fetching complete subtitles (relies on real-time capture only)

## File References

Key functions by location:
- Caption capture: content.js:73-155
- Buffer management: content.js:13-30
- Video metadata extraction: content.js:40-71
- Navigation detection: content.js:338-346
- UI creation: content.js:183-297
- LLM communication: background.js:125-214, content.js:300-334
- Verbalized Sampling (Comedy): background.js:190-262 (prompt + selection logic)
- Settings management: options.js:1-40, background.js:3-18
- Drag functionality: content.js:365-407
