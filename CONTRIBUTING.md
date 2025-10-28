# Contributing to SubtAItoFriends

Thank you for your interest in contributing! This document provides guidelines and information for contributors.

---

## Code of Conduct

### Our Pledge
We are committed to providing a welcoming and inclusive experience for everyone. We expect all contributors to:
- Be respectful and considerate
- Accept constructive criticism gracefully
- Focus on what's best for the community
- Show empathy towards other contributors

---

## How to Contribute

### Reporting Bugs

**Before submitting:**
1. Check [existing issues](https://github.com/[your-username]/SubtAItoFriends/issues)
2. Test with latest version
3. Try reproducing with different videos/platforms

**When reporting:**
- Use clear, descriptive title
- Describe exact steps to reproduce
- Include expected vs actual behavior
- Add screenshots/videos if helpful
- Include:
  - Browser version
  - Operating system
  - Extension version
  - AI provider being used
  - Console errors (F12 → Console)

**Template:**
```markdown
## Bug Description
[Clear description]

## Steps to Reproduce
1. Go to...
2. Click on...
3. See error...

## Expected Behavior
[What should happen]

## Actual Behavior
[What actually happens]

## Environment
- Browser: Chrome 120.0.6099.109
- OS: Windows 11
- Extension Version: 0.1.0
- AI Provider: OpenAI (gpt-4o-mini)

## Console Errors
[Paste any errors from console]
```

---

### Suggesting Features

**Before suggesting:**
1. Check if feature already requested
2. Consider if it fits project scope
3. Think about implementation complexity

**Feature request should include:**
- Clear use case ("As a user, I want...")
- Why it's valuable
- How it should work
- Any UI mockups (optional)
- Potential challenges

**Template:**
```markdown
## Feature Request

**Use Case:**
As a [type of user], I want [goal] so that [benefit].

**Proposed Solution:**
[How should it work?]

**Alternatives Considered:**
[Other approaches you thought about]

**Additional Context:**
[Mockups, examples, etc.]
```

---

### Contributing Code

#### First-Time Setup
```bash
# Fork repository on GitHub
# Then clone your fork:
git clone https://github.com/YOUR-USERNAME/SubtAItoFriends.git
cd SubtAItoFriends

# Add upstream remote
git remote add upstream https://github.com/ORIGINAL-OWNER/SubtAItoFriends.git
```

#### Development Workflow
```bash
# 1. Create feature branch from main
git checkout main
git pull upstream main
git checkout -b feature/your-feature-name

# 2. Make your changes
# Edit files...

# 3. Test thoroughly
# - Load as unpacked extension in Chrome
# - Test on YouTube and Netflix
# - Test all AI providers (if applicable)
# - Test light and dark modes
# - Verify keyboard shortcuts work

# 4. Commit changes
git add .
git commit -m "Add feature: description"

# 5. Push to your fork
git push origin feature/your-feature-name

# 6. Open Pull Request on GitHub
```

---

### Code Style Guide

#### JavaScript
```javascript
// ✅ Good
function captureSubtitles(videoElement, currentTime) {
  if (!videoElement) return null;

  const subtitles = extractSubtitleText(videoElement);
  return { text: subtitles, timestamp: currentTime };
}

// ❌ Bad
function cap(v,t){if(!v)return null;let s=extract(v);return {text:s,timestamp:t}}
```

**Rules:**
- Use `const` for values that don't change, `let` for variables
- No `var`
- 2-space indentation (no tabs)
- Descriptive variable names
- Add comments for complex logic
- Keep functions focused (one responsibility)
- Avoid deep nesting (max 3 levels)

#### HTML
```html
<!-- ✅ Good -->
<button id="cinechat-toggle" title="Open chat">💬</button>

<!-- ❌ Bad -->
<button id=toggle>💬</button>
```

**Rules:**
- Always use quotes for attributes
- Semantic HTML when possible
- Include `title` for icon buttons
- Self-closing tags for void elements

#### CSS
```css
/* ✅ Good */
#cinechat-toggle {
  all: unset;
  cursor: pointer;
  display: flex;
  align-items: center;
}

/* ❌ Bad */
#cinechat-toggle{all:unset;cursor:pointer;display:flex;align-items:center;}
```

**Rules:**
- Use CSS custom properties for theming
- Alphabetize properties (optional but nice)
- Group related rules together
- Comment complex styles
- Support both light and dark modes

---

### Testing Checklist

Before submitting PR, verify:

#### Functionality
- [ ] Extension loads without errors
- [ ] Captions capture on YouTube (with CC on/off)
- [ ] Captions capture on Netflix
- [ ] All personalities work correctly
- [ ] Spoiler protection toggles properly
- [ ] Chat history maintains context
- [ ] Quick action buttons work

#### UI/UX
- [ ] Panel is draggable
- [ ] FAB stays in position when toggling
- [ ] Auto-fade works (5 seconds)
- [ ] Keyboard shortcuts work (Alt+C, Ctrl+Enter)
- [ ] Both light and dark modes look good
- [ ] Text is readable
- [ ] No visual glitches

#### Compatibility
- [ ] Works with OpenAI API
- [ ] Works with Google AI (Gemini)
- [ ] Works with Ollama (local)
- [ ] Options page saves/loads correctly
- [ ] Clear API Key button works
- [ ] Security warning displays properly

#### Code Quality
- [ ] No console errors
- [ ] No console warnings
- [ ] Code follows style guide
- [ ] Comments explain complex logic
- [ ] No hardcoded values (use constants)
- [ ] Event listeners cleaned up properly

---

### Pull Request Guidelines

**Before opening PR:**
1. Test thoroughly (see checklist above)
2. Write clear commit messages
3. Update documentation if needed
4. Add yourself to contributors list (optional)

**PR title format:**
- `feat: Add Netflix subtitle support`
- `fix: Resolve FAB positioning bug`
- `docs: Update security guidelines`
- `refactor: Simplify caption capture logic`
- `style: Improve dark mode contrast`
- `test: Add caption buffer tests`

**PR description should include:**
```markdown
## Description
[What does this PR do?]

## Motivation
[Why is this needed?]

## Changes
- Added X
- Modified Y
- Fixed Z

## Testing
[How did you test this?]

## Screenshots
[If UI changes, include before/after]

## Checklist
- [ ] Tested on YouTube
- [ ] Tested on Netflix
- [ ] Tested light/dark modes
- [ ] No console errors
- [ ] Documentation updated
```

---

### Review Process

1. **Automated checks** (if any) must pass
2. **Maintainer review** within 1-3 days
3. **Feedback** may request changes
4. **Iteration** until approved
5. **Merge** by maintainer

**Response time:**
- Critical bugs: 24-48 hours
- Features: 3-7 days
- Documentation: 1-3 days

---

### Development Tips

#### Debugging
```javascript
// Enable debug logging in content.js
const DEBUG = true;

if (DEBUG) console.log("[SubtAItoFriends] Caption captured:", text);
```

#### Testing Providers
```javascript
// Quick test without real API call
const mockResponse = {
  answer: "This is a test response"
};
// sendResponse(mockResponse);
```

#### Inspecting Extension
- Content script console: F12 on video page
- Background worker console: chrome://extensions → "Inspect views: service worker"
- Storage: DevTools → Application → Storage → Extension

---

### Project Structure

```
cinechat-mvp/
├── manifest.json       # Extension config (permissions, version, etc.)
├── content.js         # Main script injected into pages
│   ├── Caption capture (YouTube TextTrack + DOM, Netflix DOM)
│   ├── UI rendering (draggable overlay, chat interface)
│   ├── Event handlers (keyboard, drag, fade)
│   └── Message passing to background
├── background.js      # Service worker
│   ├── API calls (OpenAI, Google, Ollama)
│   ├── Personality prompts
│   ├── Message handling
│   └── Settings management
├── overlay.css        # All styles
│   ├── Theme variables (dark/light)
│   ├── Component styles (FAB, panel, chat)
│   ├── Personality gradients
│   └── Responsive design
├── options.html       # Settings page UI
├── options.js         # Settings page logic
├── CLAUDE.md         # AI assistant development guide
├── SECURITY.md       # Security documentation
├── README.md         # Main documentation
├── CONTRIBUTING.md   # This file
└── LICENSE           # MIT License
```

---

### Key Functions (Quick Reference)

#### content.js
- `readYouTubeCaptions()` - Capture YouTube subtitles via TextTrack API
- `readNetflixCaptions()` - Capture Netflix subtitles via DOM
- `ensureOverlay()` - Create UI elements
- `makeDraggable()` - Enable drag functionality
- `askLLM()` - Send question to background worker

#### background.js
- `buildPrompt()` - Construct LLM prompt with personality + context
- `callOpenAI()` - OpenAI API integration
- `callOllama()` - Ollama local API integration
- `callGoogleAI()` - Google Gemini API integration
- `selectRandomResponse()` - Stanford sampling for Comedy personality

---

### Areas Needing Help

**High Priority:**
- [ ] Amazon Prime Video support
- [ ] Disney+ support
- [ ] Better error messages for users
- [ ] Offline mode (save/load conversations)

**Medium Priority:**
- [ ] Voice input (speech-to-text)
- [ ] Export conversations as PDF
- [ ] Timestamp bookmarks
- [ ] Multi-language support

**Nice to Have:**
- [ ] Firefox port
- [ ] Safari port
- [ ] Mobile browser support
- [ ] Video speed control integration

---

### Getting Help

**Questions about:**
- **Code architecture**: Read [CLAUDE.md](CLAUDE.md)
- **Security**: Read [SECURITY.md](SECURITY.md)
- **Usage**: Read [README.md](README.md)
- **Anything else**: Open a Discussion on GitHub

**Where to ask:**
- GitHub Discussions: General questions
- GitHub Issues: Bug reports, feature requests
- Pull Request comments: Code-specific questions

---

### Recognition

Contributors will be:
- Listed in README.md (if desired)
- Credited in release notes
- Thanked in commit messages

Significant contributors may be offered:
- Collaborator status
- Input on project direction
- Early access to features

---

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to SubtAItoFriends!** 🎉

Every contribution, no matter how small, helps make video watching more interactive and fun.
