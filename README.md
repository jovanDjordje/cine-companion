# Botodachi 🤖

**Your AI companion for movies and videos**

Botodachi is a Chrome extension that lets you chat with AI about what you're watching on YouTube and Netflix. It captures subtitles in real-time and uses them as context to answer your questions about plots, characters, trivia, and more.

---

## ✨ Features

### 🎭 4 AI Personalities + Custom
- **YouTube**: Internet-savvy companion for music videos and creators
- **Movie Buff**: Film school graduate who can't stop analyzing cinematography
- **Comedy**: Sarcastic MST3K-style commentary that roasts plot holes
- **Professor**: Fascinating insights that make learning addictive (brief and punchy)
- **Custom**: Define your own personality with a custom prompt

### 💬 Real-Time Context
- Captures subtitles from YouTube and Netflix automatically
- Maintains 30-minute rolling buffer (recent context for better answers)
- Smart spoiler protection - only reveals what you've already seen

### 🚀 Quick Actions
- **❓ What's happening?**: Instant explanation of the current scene
- **🎲 Trivia**: Fun facts about the movie/show/video
- **💬 Comments** (YouTube only): AI summarizes top comments

### 🎨 Modern UI
- Draggable floating assistant
- Auto-fades after inactivity (stays out of your way)
- Dark/light mode support
- Chat interface with conversation history
- Buffer status indicator (shows minutes of captions captured)
- Subtitle reminder (warns if captions aren't enabled)

### 🔌 Flexible AI Providers
- **OpenAI** (GPT-4o-mini, GPT-4, etc.)
- **Google AI** (Gemini models)
- **Ollama** (Local, private, free - llama3.2, qwen2.5, etc.)
- Any OpenAI-compatible API

---

## 🚀 Quick Start

### Installation

1. **Download the extension:**
   ```bash
   git clone https://github.com/jovanDjordje/cinechat-mvp.git
   cd cinechat-mvp
   ```

2. **Load in Chrome:**
   - Open `chrome://extensions/`
   - Enable "Developer mode" (top right toggle)
   - Click "Load unpacked"
   - Select the `cinechat-mvp` folder

3. **Configure your AI provider:**
   - Click the extension icon or right-click → Options
   - Choose your provider (OpenAI, Google AI, or Ollama)
   - Add your API key (or skip for Ollama)
   - Click "Save"

4. **Start watching!**
   - Open YouTube or Netflix
   - Look for the 🤖 bot icon in the bottom-right
   - Click to open and start chatting

---

## 🔧 Setup Guides

### Option 1: Google Gemini (Recommended) 🎁
**Best for**: Most users - FREE, no credit card needed!

1. Get free API key: https://aistudio.google.com/app/apikey
2. In extension options:
   - Provider: `Google AI (Gemini)`
   - API Base: `https://generativelanguage.googleapis.com`
   - Model: `gemini-2.0-flash-exp`
   - API Key: Your key

**Cost**: FREE! (60 requests/minute)

### Option 2: Ollama (Local)
**Best for**: Maximum privacy, offline use

1. **Install Ollama**: https://ollama.com

2. **Configure CORS** (Required for browser extensions):

   **Windows:**
   ```cmd
   setx OLLAMA_ORIGINS "chrome-extension://*"
   ```
   Then **stop Ollama completely** (right-click system tray icon → Quit) and **restart it**.

   *Important:* Just closing the window isn't enough - you must fully quit from system tray.

   **macOS/Linux:**
   ```bash
   # Add to ~/.zshrc or ~/.bashrc
   export OLLAMA_ORIGINS="chrome-extension://*"
   ```
   Then restart terminal and run: `ollama serve`

   **Alternative (less secure, but works):**
   ```bash
   # Allow all origins (development only)
   export OLLAMA_ORIGINS="*"
   ```

3. **Pull a model** (choose based on your hardware):
   ```bash
   # Recommended: Best speed + quality balance (~25 sec responses)
   ollama pull llama3.2:3b

   # Alternative options
   ollama pull qwen2.5:3b       # Also fast (~30 sec responses)
   ollama pull phi3.5           # Good quality
   ollama pull qwen2.5:7b       # Better quality, slower (requires 16GB+ RAM)
   ```

4. **In extension options**:
   - Provider: `Ollama (Local)`
   - API Base: `http://localhost:11434`
   - Model: `llama3.2` (or whatever you pulled)
   - API Key: (leave empty)

5. **Verify it's running**:
   - Open terminal: `ollama list` (should show your models)
   - Or visit: http://localhost:11434 (should see "Ollama is running")

**Cost**: Free! Runs on your computer.
**Note**: Requires 8GB+ RAM for decent performance.

**Performance Optimization**: The extension automatically sends less context to Ollama (last ~60 captions instead of 300) for faster responses. Expect **20-30 second response times** with small models like llama3.2:3b. Comment summarization takes longer (~40 sec) due to extra context.

### Option 3: OpenAI
**Best for**: Highest quality responses (paid)

1. Get API key: https://platform.openai.com/api-keys
2. **Tip**: Set spending limits ($5-10/month recommended)
3. In extension options:
   - Provider: `OpenAI-compatible`
   - API Base: `https://api.openai.com/v1`
   - Model: `gpt-4o-mini`
   - API Key: Your key

**Cost**: ~$0.10-0.50 per hour of usage

---

## 🎯 Usage

### Basic Interaction
1. Click the 🤖 bot icon to open the chat panel
2. Type your question (e.g., "Who is that character?")
3. Press **Ctrl+Enter** to send (or click "Ask" button)
4. Get instant AI responses with subtitle context

### Keyboard Shortcuts
- **Alt+C**: Toggle chat panel
- **Ctrl+Enter**: Send message (while typing)
- **Enter**: New line in message (while typing)

### Spoiler Protection
- Enable "Allow spoilers" to let AI reveal future plot points
- When disabled: AI only uses context up to current timestamp + 10 seconds
- Perfect for first-time watchers!

### Personality Switching
- Click personality icons (▶️ 📽️ 😂 🎓 ✏️) to change AI behavior
- Each personality has distinct tone and focus
- Try them all to find your favorite!

### First Use & Consent
When you first click the 🤖 bot icon on a video:
- A consent popup appears explaining what Botodachi does
- You must accept the terms to use the extension
- This happens **once** - your acceptance is stored locally
- You can review terms at any time in the extension options

### Caption Buffer Management
Botodachi maintains a **30-minute rolling buffer** of captured captions:

**How it works:**
- Automatically captures subtitles as you watch
- Stores up to 30 minutes of recent captions
- Oldest captions are removed when buffer is full
- Buffer status shown in header (📊 X min)

**Subtitle Warning:**
- After 5 seconds of playback, if no captions detected: "⚠️ Enable subtitles/captions"
- Turn on CC/subtitles in your video player
- Warning disappears once captions start flowing

**Seeking behavior:**
- Jump backward (02:00 → 00:30): Buffer keeps all captured data
- Jump forward (00:30 → 02:00): Buffer keeps earlier data + captures from new position
- Result: Buffer may have gaps if you skip around, but AI can reference any captured moment

**Managing your buffer:**
- **Clear Buffer**: Removes all captured captions (useful for starting fresh)
- **Clear Chat**: Removes conversation history (keeps buffer intact)
- Both buttons located below the input bar

**Navigation:**
- Buffer automatically clears when you navigate to a different video
- Each video gets a fresh buffer

---

## 🔒 Security & Privacy

### API Key Storage

**The short version:**
- API keys are stored locally in your browser (standard for all extensions)
- Only accessible if someone has physical access to your computer
- **Recommended:** Use Google Gemini (FREE) or Ollama (runs locally)

**Simple best practices:**
- Set usage limits in your provider dashboard
- Don't use production/organization keys
- Monitor usage occasionally

**For more details:** See [SECURITY.md](SECURITY.md)

### What We Access
- **Subtitles**: Captured from YouTube/Netflix DOM
- **Video metadata**: Title and URL only
- **Your questions**: Sent to AI provider with subtitle context

### What We DON'T Access
- Video content itself
- Browsing history
- Personal data
- Other websites or tabs

### Privacy Guarantee
- **No tracking** - zero analytics or telemetry
- **No servers** - everything runs in your browser
- **No data collection** - we never see your API keys or conversations
- **Open source** - audit the code yourself

---

## 🛠️ Development

### Architecture
```
Video Page (YouTube/Netflix)
    ↓ Caption capture via DOM/TextTrack API
Content Script (content.js)
    ↓ Chrome message passing
Background Service Worker (background.js)
    ↓ HTTPS POST
AI Provider (OpenAI/Google/Ollama)
    ↓
User receives answer in overlay UI
```

### Tech Stack
- **Vanilla JavaScript** - Zero dependencies, no build process
- **Manifest V3** - Latest Chrome extension standard
- **CSS Custom Properties** - Dark/light mode theming
- **Chrome Storage API** - Secure local settings storage

### File Structure
```
cinechat-mvp/
├── manifest.json       # Extension configuration
├── content.js         # Main logic, UI, caption capture (~1000 lines)
├── background.js      # Service worker, LLM communication (~350 lines)
├── overlay.css        # Styling with theming (~500 lines)
├── options.html       # Settings page
├── options.js         # Settings logic
├── docs/              # GitHub Pages privacy policy
├── LEGAL.md          # Legal disclaimer
├── SECURITY.md       # Security documentation
└── README.md         # This file
```

### Key Files
- **Caption capture**: `content.js:73-250` (YouTube TextTrack + DOM, Netflix DOM)
- **LLM integration**: `background.js` (OpenAI, Google, Ollama API calls)
- **UI rendering**: `content.js:350-700` (draggable overlay, chat interface)
- **Personality system**: `background.js:20-123` (5 distinct prompt templates)

### Making Changes
1. Edit files directly (no build process needed)
2. Reload extension in `chrome://extensions/`
3. Refresh video page to see content script changes
4. Test on both YouTube and Netflix
5. Verify light and dark modes

### Testing Checklist
- [ ] Captions capture on YouTube (with and without CC enabled)
- [ ] Captions capture on Netflix
- [ ] All personalities respond correctly
- [ ] Spoiler protection works
- [ ] UI is draggable and fades properly
- [ ] Keyboard shortcuts work (Alt+C, Ctrl+Enter)
- [ ] All 3 AI providers work (OpenAI, Google, Ollama)
- [ ] Options page saves settings
- [ ] Clear API Key button works

---

## 🎨 Customization

### Custom Personality
Create your own AI personality:
1. Open extension options
2. Select "✏️ Custom" personality
3. Write your prompt:
   ```
   You are an excited sports commentator who treats every
   movie scene like a live sports event. Use phrases like
   "AND HERE WE GO!", "What a move!", "UNBELIEVABLE!"
   ```
4. Save and try it out!

### Theme Customization
Edit `overlay.css` custom properties:
```css
#cinechat-root {
  --panel-bg: your-gradient;
  --accent: #your-color;
  --panel-fg: #your-text-color;
}
```

---

## 🐛 Troubleshooting

### Captions not working
- **Look for the warning**: After 5 seconds of playback, you'll see "⚠️ Enable subtitles/captions" if none are detected
- **YouTube**: Click the CC button in the video player
- **Netflix**: Turn on subtitles in player settings (speech bubble icon)
- Wait 5-10 seconds after enabling for captions to start appearing
- Check the buffer indicator (📊 X min) - it should populate once captions are captured
- Check console for errors (F12 → Console) if still not working

### "Missing API key" error
- Open extension options
- Verify API key is saved correctly
- For Ollama: Make sure server is running (`ollama serve`)

### Ollama CORS errors
**Symptoms:** "Failed to fetch" or "CORS policy" errors

**Solution:**
1. Set OLLAMA_ORIGINS environment variable:
   - **Windows**:
     ```cmd
     setx OLLAMA_ORIGINS "chrome-extension://*"
     ```
     Then **quit Ollama completely** (right-click system tray → Quit) and restart it
   - **Mac/Linux**: Add `export OLLAMA_ORIGINS="chrome-extension://*"` to `~/.bashrc` or `~/.zshrc`, then restart terminal and run `ollama serve`
2. Verify setting:
   - Windows: `echo %OLLAMA_ORIGINS%` in new Command Prompt
   - Mac/Linux: `echo $OLLAMA_ORIGINS`
3. Test: Visit http://localhost:11434 (should show "Ollama is running")

**Quick fix for testing:** Set `OLLAMA_ORIGINS="*"` (less secure, allows all origins)

### Slow responses
- **OpenAI/Google**: Check your internet connection
- **Ollama**:
  - Local models are slower than cloud APIs (**20-30 seconds is normal**)
  - Extension auto-optimizes for Ollama (sends less context)
  - **Recommended model**: `llama3.2:3b` (~25 sec responses)
  - **Comment summaries take longer** (~40 sec due to extra text)
  - Check Task Manager: CPU should be at ~80-100% while processing
  - Make sure laptop is plugged in (power settings affect performance)
  - If still too slow: Switch to Google Gemini (FREE + instant responses)

### Extension not loading
- Check `chrome://extensions/` for errors
- Click "Reload" button
- Verify all files are present in folder

### Keyboard shortcuts not working
- Make sure chat panel is open
- Click inside textarea first
- Check for conflicts with other extensions

---

## 📋 Roadmap

### Planned Features
- [ ] Amazon Prime Video support
- [ ] Disney+ support
- [ ] Voice input (speech-to-text)
- [ ] Export conversation as PDF/text
- [ ] Multiple language support
- [ ] Video timestamp bookmarks
- [ ] Share conversations (with privacy controls)

### Under Consideration
- Backend proxy for better API key security
- Mobile browser support (Firefox/Safari)
- Integration with other video platforms
- Collaborative watching (shared chat)

---

## 🤝 Contributing

We welcome contributions! Here's how:

### Reporting Bugs
1. Check existing issues first
2. Open new issue with:
   - Steps to reproduce
   - Expected vs actual behavior
   - Browser version and OS
   - Console errors (if any)

### Suggesting Features
1. Open an issue with "Feature Request" label
2. Describe the use case
3. Explain expected behavior
4. Include mockups if applicable

### Code Contributions
1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Make changes (follow existing code style)
4. Test thoroughly on YouTube and Netflix
5. Commit with clear messages
6. Push to your fork
7. Open Pull Request with description

### Code Style
- Use vanilla JavaScript (no frameworks)
- 2-space indentation
- Descriptive variable names
- Comments for complex logic
- Keep functions focused and small

---

## ⚖️ Legal Disclaimer

**Important:** Botodachi is an independent, open-source project and is **not affiliated with, endorsed by, or sponsored by** YouTube, Netflix, Google, or any streaming service.

### Summary
- Provided for **personal, non-commercial use only**
- Does not circumvent DRM or download copyrighted content
- Users responsible for compliance with platform Terms of Service
- No warranties or guarantees provided
- Use at your own risk

### Your Responsibilities
- Comply with YouTube and Netflix Terms of Service
- Use your own AI provider credentials responsibly
- Personal use only (no redistribution or commercial use)

**Full legal details**: See [LEGAL.md](LEGAL.md)

**Trademarks**: All product names, logos, and brands are property of their respective owners.

---

## 📜 License

MIT License - see [LICENSE](LICENSE) file for details.

**TL;DR**: Free to use, modify, and distribute. Just include the original license.

---

## 🙏 Acknowledgments

- **OpenAI** for GPT models and API
- **Google** for Gemini models
- **Ollama** for local LLM infrastructure
- **Chrome Extensions team** for excellent documentation
- **YouTube/Netflix** for subtitle accessibility
- **Stanford NLP** for research on prompt diversity (used in Comedy personality)

---

## 📞 Support

### Getting Help
- **Documentation**: Read [SECURITY.md](SECURITY.md) for API key safety
- **Development Guide**: See [CLAUDE.md](CLAUDE.md) for technical details
- **Issues**: Open a GitHub issue for bugs/features

### Contact
- **GitHub Issues**: https://github.com/jovanDjordje/cinechat-mvp/issues
- **Email**: botodachiapp.dev@gmail.com

---

## 📊 Stats

- **Lines of Code**: ~2,300 (across 6 files)
- **Dependencies**: 0 (vanilla JS)
- **Build Time**: 0 seconds (no build process)
- **Extension Size**: ~50KB
- **Supported Sites**: YouTube, Netflix
- **AI Personalities**: 4 built-in + custom
- **AI Providers**: OpenAI, Google Gemini, Ollama

---

## ⭐ Show Your Support

If you find Botodachi useful:
- ⭐ Star this repository
- 🐛 Report bugs
- 💡 Suggest features
- 🔀 Contribute code
- 📢 Share with friends

---

**Made with ❤️ for video enthusiasts**

*Enhancing the way we watch and understand video content.*
