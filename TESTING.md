# Botodachi - Testing Guide

Complete testing checklist to verify all privacy and functionality features work correctly before production deployment.

---

## Quick Test (5 minutes)

### 1. Fresh Install Test
```
1. Open chrome://extensions/
2. Remove Botodachi if already installed
3. Click "Load unpacked" and select folder
4. Navigate to YouTube
```

**Expected:**
- ✅ Consent dialog appears with privacy policy link
- ✅ Extension icon appears but capture is OFF

### 2. Basic Privacy Test
```
1. Click "I Understand" on consent dialog
2. Click Botodachi FAB (🤖 button)
3. Verify "Enable Capture" checkbox is UNCHECKED
4. Start playing a video with captions
5. Wait 10 seconds
```

**Expected:**
- ✅ "ACTIVE" indicator is NOT showing
- ✅ Buffer status shows empty (no "📊 X min")
- ✅ No captions captured (check buffer status in header)

### 3. Enable Capture Test
```
1. Check "Enable Capture" checkbox
```

**Expected:**
- ✅ Green "ACTIVE" badge appears next to checkbox
- ✅ Console logs: "[Botodachi] Capture enabled - starting caption capture"
- ✅ After 5-10 seconds, buffer status shows "📊 <1 min" or "📊 1 min"

### 4. Clear Buffer Test
```
1. With captions captured, click "🧹 Clear Buffer"
2. Confirm the dialog
```

**Expected:**
- ✅ Confirmation dialog appears
- ✅ Buffer status disappears (empty)
- ✅ Chat shows "Caption buffer cleared!" message
- ✅ Console logs: "[Botodachi] Caption buffer manually cleared by user"

---

## Full Test Suite (30 minutes)

### Test Group 1: Privacy Features

#### Test 1.1: Consent Dialog
**Steps:**
1. Fresh install (clear extension data first)
2. Navigate to YouTube
3. Observe consent dialog

**Expected:**
- ✅ Dialog appears on first run only
- ✅ Privacy policy link is clickable
- ✅ Clicking "I Understand" saves consent (`chrome.storage.local.get('consentGiven')` should return `true`)
- ✅ Dialog doesn't appear again on page refresh

#### Test 1.2: Capture OFF by Default
**Steps:**
1. Install extension
2. Dismiss consent dialog
3. Open extension panel
4. Play video with captions

**Expected:**
- ✅ "Enable Capture" is UNCHECKED
- ✅ "ACTIVE" badge is hidden
- ✅ No captions in buffer (verify in console: `buffer.length === 0`)
- ✅ No subtitle warning appears

#### Test 1.3: Manual Capture Enable
**Steps:**
1. Check "Enable Capture"
2. Play video with captions for 30 seconds

**Expected:**
- ✅ "ACTIVE" badge appears immediately
- ✅ Buffer starts filling (check buffer status in header)
- ✅ Console shows caption logs (if uncommented in code)

#### Test 1.4: Manual Capture Disable
**Steps:**
1. With capture enabled and buffer full
2. Uncheck "Enable Capture"

**Expected:**
- ✅ "ACTIVE" badge disappears
- ✅ Buffer is cleared immediately
- ✅ Buffer status in header disappears
- ✅ Console logs: "[Botodachi] Capture disabled - buffer cleared"

#### Test 1.5: Clear Buffer Button
**Steps:**
1. Enable capture and fill buffer
2. Click "🧹 Clear Buffer"
3. Click "Cancel" in confirmation
4. Click "🧹 Clear Buffer" again
5. Click "OK" in confirmation

**Expected:**
- ✅ First attempt: Dialog appears, buffer NOT cleared
- ✅ Second attempt: Buffer cleared, confirmation message in chat
- ✅ Buffer status disappears

#### Test 1.6: Auto-Clear on Video Navigation
**Steps:**
1. Enable capture on a YouTube video
2. Wait for buffer to fill (1-2 minutes)
3. Click on a different video

**Expected:**
- ✅ Buffer clears automatically
- ✅ Chat history clears
- ✅ Console logs: "[Botodachi] New video detected - clearing buffer..."
- ✅ Capture remains enabled (user's choice persists)

#### Test 1.7: API Key Storage
**Steps:**
1. Open options page (right-click extension → Options)
2. Enter fake API key: `sk-test123`
3. Click Save
4. Open Chrome DevTools → Application → Storage → Local Storage
5. Find extension's storage

**Expected:**
- ✅ API key stored in `chrome.storage.local` (not `sync`)
- ✅ Key visible in storage as plain text (Chrome encrypts the storage itself)
- ✅ "Clear Key" button clears the key with confirmation

---

### Test Group 2: Core Functionality

#### Test 2.1: YouTube Caption Capture (TextTrack)
**Steps:**
1. Go to YouTube video with English captions
2. Enable captions (CC button)
3. Enable capture in Botodachi
4. Play video for 30 seconds

**Expected:**
- ✅ Buffer fills with captions
- ✅ Buffer status shows "📊 <1 min"
- ✅ Console logs captions (if enabled in code line 204)

#### Test 2.2: YouTube Caption Capture (DOM Fallback)
**Steps:**
1. Same as above, but some videos use DOM rendering
2. Verify captions appear on screen

**Expected:**
- ✅ Captions captured via DOM selector (`.ytp-caption-segment`)
- ✅ No duplicate entries in buffer

#### Test 2.3: Netflix Caption Capture
**Steps:**
1. Go to Netflix and start a show with subtitles
2. Enable capture
3. Play for 30 seconds

**Expected:**
- ✅ Captions captured from Netflix's DOM
- ✅ Buffer fills correctly
- ✅ No errors in console

#### Test 2.4: Ask Question with AI
**Steps:**
1. Capture captions for 1-2 minutes
2. Configure API key in options
3. Ask: "What's happening?"

**Expected:**
- ✅ Question appears as blue bubble (right-aligned)
- ✅ "Thinking..." placeholder appears
- ✅ AI response appears with personality icon
- ✅ Response includes context from captions

#### Test 2.5: Personality Switcher
**Steps:**
1. Click each personality button (▶️ 📽️ 😂 🎓 ✏️)
2. Ask same question with different personalities

**Expected:**
- ✅ Active button has different styling
- ✅ Gradient background changes
- ✅ Response tone matches personality
- ✅ Icon in chat matches personality

#### Test 2.6: Clear Chat vs Clear Buffer
**Steps:**
1. Capture captions and ask 3 questions
2. Click "🗑️ Clear Chat"
3. Verify buffer status still shows captions
4. Click "🧹 Clear Buffer"

**Expected:**
- ✅ Clear Chat: Only chat messages cleared, buffer intact
- ✅ Clear Buffer: Only buffer cleared, chat intact

---

### Test Group 3: Edge Cases

#### Test 3.1: No Captions Available
**Steps:**
1. Enable capture
2. Play video WITHOUT captions
3. Wait 10 seconds

**Expected:**
- ✅ ⚠️ Warning appears: "Enable subtitles/captions to start capturing"
- ✅ Buffer remains empty
- ✅ No errors in console

#### Test 3.2: Rapid Enable/Disable Toggle
**Steps:**
1. Rapidly toggle "Enable Capture" 10 times

**Expected:**
- ✅ No errors in console
- ✅ "ACTIVE" badge updates correctly each time
- ✅ Final state matches checkbox state

#### Test 3.3: Question Rate Limiting
**Steps:**
1. Ask a question
2. Immediately try to ask another question

**Expected:**
- ✅ "Ask" button disabled during first request
- ✅ Button shows "Asking..." text
- ✅ Button re-enables after response

#### Test 3.4: Long Question (>500 chars)
**Steps:**
1. Type a 501-character question
2. Click Ask

**Expected:**
- ✅ Character counter turns red at 480 chars
- ✅ Error message appears in chat
- ✅ Question not sent to API

#### Test 3.5: Extension Context Invalidated
**Steps:**
1. Open extension panel
2. Reload extension in chrome://extensions/
3. Try to ask a question

**Expected:**
- ✅ Error message: "Extension context invalidated. Please refresh the page."
- ✅ No crash or unhandled promise rejection

---

### Test Group 4: UI/UX

#### Test 4.1: Draggable Panel
**Steps:**
1. Click and drag the header
2. Move panel to different corners
3. Drag the ⋮⋮ handle when panel is closed

**Expected:**
- ✅ Panel follows cursor smoothly
- ✅ Panel stays where you drop it
- ✅ Both header and handle work for dragging

#### Test 4.2: Auto-Fade FAB
**Steps:**
1. Close extension panel
2. Don't interact with extension for 5 seconds

**Expected:**
- ✅ FAB fades to 30% opacity after 5 seconds
- ✅ Hovering over FAB restores full opacity
- ✅ Opening panel resets fade timer

#### Test 4.3: Keyboard Shortcut
**Steps:**
1. Press Alt+C

**Expected:**
- ✅ Panel toggles open/closed
- ✅ Works whether panel is open or closed
- ✅ Doesn't interfere with browser shortcuts

#### Test 4.4: Netflix Focus Stealing Prevention
**Steps:**
1. On Netflix, open extension panel
2. Click in textarea
3. Type a message
4. Wait for Netflix controls to hide (they steal focus)

**Expected:**
- ✅ Focus automatically restored to textarea
- ✅ Can continue typing without clicking again
- ✅ Works within 3-second window after interaction

#### Test 4.5: Light/Dark Mode
**Steps:**
1. Test on system with light mode
2. Test on system with dark mode

**Expected:**
- ✅ Extension respects system preference
- ✅ Colors readable in both modes
- ✅ Personality gradients visible in both modes

---

### Test Group 5: Multi-Provider Support

#### Test 5.1: OpenAI API
**Steps:**
1. Options → OpenAI-compatible
2. Base URL: `https://api.openai.com/v1`
3. Model: `gpt-4o-mini`
4. Add valid API key

**Expected:**
- ✅ Responses work correctly
- ✅ No CORS errors
- ✅ Error handling works for invalid key

#### Test 5.2: Google AI (Gemini)
**Steps:**
1. Options → Google AI
2. Base URL: `https://generativelanguage.googleapis.com`
3. Model: `gemini-2.0-flash-exp`
4. Add valid API key (starts with `AIza`)

**Expected:**
- ✅ Responses work correctly
- ✅ Free tier limits respected
- ✅ Error message clear if quota exceeded

#### Test 5.3: Ollama (Local)
**Steps:**
1. Install Ollama locally
2. Run: `ollama run llama3.2:3b`
3. Options → Ollama
4. Base URL: `http://localhost:11434`
5. Model: `llama3.2:3b`
6. Leave API key empty

**Expected:**
- ✅ API key field grayed out
- ✅ Responses work (slower than cloud)
- ✅ No network requests to external APIs

---

### Test Group 6: YouTube Comments Feature

#### Test 6.1: Comments Visible
**Steps:**
1. Go to YouTube video
2. Scroll down to load comments
3. Click "💬 Sum Comments" button

**Expected:**
- ✅ Button only visible on YouTube (not Netflix)
- ✅ Scrapes top 25 comments
- ✅ Sends to AI for summarization
- ✅ Summary appears in chat

#### Test 6.2: Comments Not Loaded
**Steps:**
1. Go to YouTube video
2. Don't scroll (comments not loaded)
3. Click "💬 Sum Comments"

**Expected:**
- ✅ Error message: "No comments found. Try scrolling down to load comments first."
- ✅ No API call made

---

## Performance Tests

### Test P1: Memory Leak Check
**Steps:**
1. Open Chrome Task Manager (Shift+Esc)
2. Play video for 30 minutes with capture enabled
3. Monitor extension's memory usage

**Expected:**
- ✅ Memory stays under 50MB
- ✅ Buffer auto-trims old captions (30-minute limit)
- ✅ No continuous memory growth

### Test P2: CPU Usage
**Steps:**
1. Monitor CPU in Task Manager
2. Play video with capture enabled

**Expected:**
- ✅ CPU usage < 5% while idle
- ✅ Small spike when asking questions (API call)
- ✅ Polling (300ms) doesn't cause high CPU

---

## Cross-Browser Test (If Applicable)

### Chrome/Chromium Browsers
- ✅ Google Chrome (latest)
- ✅ Microsoft Edge (Chromium)
- ✅ Brave
- ✅ Opera

**Note:** Extension uses Manifest V3, so Firefox is not compatible.

---

## Final Pre-Production Checklist

- [ ] All privacy tests pass
- [ ] All core functionality tests pass
- [ ] No console errors on YouTube
- [ ] No console errors on Netflix
- [ ] Privacy policy URL works
- [ ] All placeholder text replaced
- [ ] Version in manifest.json is correct
- [ ] Extension icon loads correctly
- [ ] Options page saves settings
- [ ] Clear Key button works
- [ ] All 3 AI providers tested
- [ ] Consent dialog appears on fresh install
- [ ] Capture is OFF by default
- [ ] "ACTIVE" indicator works
- [ ] Clear Buffer button works

---

## Automated Test Commands (Developer)

If you want to add automated tests later:

```javascript
// In browser console (on YouTube/Netflix page)

// Check if extension loaded
console.log(document.getElementById('cinechat-root') ? '✅ Extension loaded' : '❌ Not loaded');

// Check capture state
console.log('Capture enabled:', captureEnabled);

// Check buffer
console.log('Buffer length:', buffer.length);

// Check consent
chrome.storage.local.get('consentGiven', (r) => console.log('Consent given:', r.consentGiven));
```

---

## Reporting Issues

If you find bugs during testing:

1. **Check console** for errors (F12 → Console)
2. **Check background worker** console (chrome://extensions/ → "Inspect views: service worker")
3. **Note exact steps** to reproduce
4. **Record video** if UI issue
5. **Save console logs** and include in bug report

---

## Test Environment Setup

**Recommended test videos:**
- **YouTube:** Any popular video with English captions
- **Netflix:** Any show with subtitles (requires Netflix subscription)

**Recommended AI provider for testing:**
- **Google Gemini** (free, fast, generous quota)
- Get key at: https://aistudio.google.com/app/apikey

---

Good luck with testing! 🧪
