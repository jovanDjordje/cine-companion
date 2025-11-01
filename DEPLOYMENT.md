# Botodachi - Production Deployment Guide

This guide walks you through preparing Botodachi for Chrome Web Store publication.

---

## Step 1: Host Privacy Policy on GitHub Pages (FREE)

### 1.1 Create a `docs` folder
```bash
mkdir docs
mv privacy.html docs/
```

### 1.2 Enable GitHub Pages
1. Push your code to GitHub
2. Go to your repo → Settings → Pages
3. Under "Source", select: **Deploy from a branch**
4. Select branch: `main` and folder: `/docs`
5. Click Save
6. Wait 1-2 minutes for deployment

Your privacy policy will be live at:
```
https://YOUR_GITHUB_USERNAME.github.io/YOUR_REPO_NAME/privacy.html
```

### 1.3 Update Privacy Policy URLs
Replace placeholders in these files:

**content.js** (line 352):
```javascript
// BEFORE
<a href="https://YOUR_GITHUB_USERNAME.github.io/YOUR_REPO_NAME/privacy.html"

// AFTER (example)
<a href="https://jovan.github.io/botodachi/privacy.html"
```

**privacy.html** (line 138):
```html
<!-- BEFORE -->
<a href="https://github.com/YOUR_GITHUB_USERNAME/YOUR_REPO_NAME">

<!-- AFTER (example) -->
<a href="https://github.com/jovan/botodachi">
```

---

## Step 2: Chrome Web Store Data Safety Form

When you submit to Chrome Web Store, you'll fill out a "Data Safety" questionnaire. Here's exactly what to answer:

### Data Collection & Usage

**Q: Does your extension collect or use user data?**
✅ **Yes**

**Q: What data does your extension collect?**
Select these categories:
- ✅ **Personally identifiable information** (API keys)
- ✅ **Website content** (Video captions from YouTube/Netflix)

### Data Handling for API Keys

**Data type:** Authentication information (API keys)

**Is this data collected, transmitted, or both?**
- ✅ Collected

**Is this data collection optional or required?**
- Required for functionality

**What is this data used for?**
- App functionality (to send requests to AI providers)

**Is this data sold?**
- ❌ No

**Is this data used for advertising or marketing?**
- ❌ No

**Is this data shared with third parties?**
- ❌ No (API keys are stored locally only)

**Is this data encrypted?**
- ✅ Yes (stored using Chrome's secure storage API)

### Data Handling for Video Captions

**Data type:** Website content (captions/subtitles)

**Is this data collected, transmitted, or both?**
- ✅ Both (collected locally, transmitted to user's chosen AI provider)

**Is this data collection optional or required?**
- Optional (user must enable "Enable Capture" toggle)

**What is this data used for?**
- App functionality (to provide context for AI responses)

**Is this data sold?**
- ❌ No

**Is this data used for advertising or marketing?**
- ❌ No

**Is this data shared with third parties?**
- ✅ Yes, with the user's configured AI provider (OpenAI, Google AI, or Ollama)
  - **Purpose:** App functionality
  - **User has choice:** Yes (user chooses which AI provider to use)

**Is this data encrypted?**
- ✅ In transit (sent via HTTPS to AI providers)

### User Control

**Q: How can users control their data?**
- Users can delete data at any time via the "Clear Buffer" and "Clear Chat" buttons
- Users can disable caption capture via the "Enable Capture" toggle
- Users can uninstall the extension to remove all local data

### Privacy Policy URL
```
https://YOUR_GITHUB_USERNAME.github.io/YOUR_REPO_NAME/privacy.html
```

---

## Step 3: Pre-Publish Checklist

### ✅ Required Changes
- [ ] Move `privacy.html` to `docs/` folder
- [ ] Enable GitHub Pages on your repo
- [ ] Update privacy policy URLs in `content.js` and `privacy.html`
- [ ] Verify all placeholder text is replaced with real info
- [ ] Test extension with `chrome://extensions/` in Developer Mode

### ✅ Optional but Recommended
- [ ] Add screenshots for Chrome Web Store listing (1280x800px)
- [ ] Create a promo image (440x280px)
- [ ] Update `manifest.json` description to be compelling
- [ ] Test on both YouTube and Netflix
- [ ] Test all 3 AI providers (OpenAI, Google AI, Ollama)

### ✅ Files to Include in Submission
**Include:**
- `manifest.json`
- `background.js`
- `content.js`
- `overlay.css`
- `options.html`
- `options.js`
- `robo.png`

**DO NOT include:**
- `privacy.html` (hosted on GitHub Pages instead)
- `CLAUDE.md`
- `DEPLOYMENT.md` (this file)
- `.git` folder
- `node_modules` (you don't have any)
- Any test files or API keys

### ✅ Create ZIP for Submission
```bash
# Create a clean copy
mkdir botodachi-release
cp manifest.json background.js content.js overlay.css options.html options.js robo.png botodachi-release/

# Create ZIP (Windows)
cd botodachi-release
Compress-Archive -Path * -DestinationPath ../botodachi-v0.1.0.zip

# Or use 7-Zip
7z a ../botodachi-v0.1.0.zip *
```

---

## Step 4: Chrome Web Store Submission

1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Pay one-time $5 developer registration fee (if first time)
3. Click "New Item"
4. Upload your ZIP file
5. Fill in:
   - **Name:** Botodachi
   - **Summary:** Your AI companion for movies and videos
   - **Description:** (Use manifest description + features)
   - **Category:** Productivity or Entertainment
   - **Language:** English
6. Upload screenshots (at least 1, max 5)
7. Fill out **Data Safety** form (use answers above)
8. Provide **Privacy Policy URL**
9. Submit for review

**Review time:** Usually 1-3 business days

---

## Step 5: After Approval

### Update README
Add Chrome Web Store badge:
```markdown
[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/YOUR_EXTENSION_ID.svg)](https://chrome.google.com/webstore/detail/YOUR_EXTENSION_ID)
```

### Monitor Reviews
- Respond to user reviews within 48 hours
- Fix reported bugs quickly
- Update extension with bug fixes (requires re-review)

---

## Common Review Rejections & How to Fix

### "Unclear permissions justification"
**Fix:** Add this to your Chrome Web Store description:
```
PERMISSIONS EXPLAINED:
• Storage: Saves your settings and API keys locally
• Active Tab: Reads captions from YouTube/Netflix tabs you're watching
• Scripting: Injects the chat interface into video pages
```

### "Privacy policy doesn't match practices"
**Fix:** Ensure privacy.html accurately describes your data handling. Our template already does this.

### "Deceptive functionality"
**Fix:** Make sure description clearly states:
- Extension requires user's own API key
- Caption capture must be manually enabled
- Not affiliated with YouTube, Netflix, OpenAI, or Google

---

## Testing Checklist Before Submission

### Core Functionality
- [ ] Extension loads without errors
- [ ] Consent dialog appears on first run
- [ ] "Enable Capture" toggle works (starts OFF)
- [ ] "ACTIVE" indicator shows when capture enabled
- [ ] Captions are captured on YouTube
- [ ] Captions are captured on Netflix
- [ ] AI responses work with all 3 providers
- [ ] Clear Chat button works
- [ ] Clear Buffer button works (with confirmation)
- [ ] Buffer auto-clears when capture disabled
- [ ] Personality switcher works
- [ ] Settings page saves correctly

### Privacy Features
- [ ] Capture is OFF by default
- [ ] Consent dialog shows privacy policy link
- [ ] Privacy policy URL works
- [ ] Buffer clears when user navigates to new video
- [ ] API keys stored locally (not synced)
- [ ] No data sent to AI until user clicks "Ask"

### Edge Cases
- [ ] Works in light and dark mode
- [ ] Draggable panel works smoothly
- [ ] Alt+C keyboard shortcut works
- [ ] No console errors in page or background worker
- [ ] Extension survives page refresh
- [ ] Works when switching between videos

---

## Support & Maintenance

### Email for Support
Use the email in your privacy policy: `botadachiapp@outlook.com`

### Versioning
Follow semantic versioning:
- **0.1.0** → First public release
- **0.1.1** → Bug fixes
- **0.2.0** → New features
- **1.0.0** → Stable, production-ready

Update `manifest.json` version for each release.

---

## Need Help?

- Chrome Web Store docs: https://developer.chrome.com/docs/webstore/
- Extension publishing guide: https://developer.chrome.com/docs/webstore/publish/
- Data Safety FAQ: https://developer.chrome.com/docs/webstore/data_safety/

Good luck with your launch! 🚀
