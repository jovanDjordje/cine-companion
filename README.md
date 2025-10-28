# Botodachi 🤖

**Your AI companion for movies and videos**

Botodachi is a Chrome extension that lets you chat with AI about what you're watching on YouTube and Netflix. It captures subtitles in real-time and uses them as context to answer your questions about plots, characters, trivia, and more.

---

## ✨ Features

### 🎭 5 Distinct AI Personalities
- **YouTube**: Internet-savvy companion for music videos and creators
- **Movie Buff**: Film school graduate who can't stop analyzing cinematography
- **Comedy**: Sarcastic MST3K-style commentary that roasts plot holes
- **Vulcan**: Purely logical Star Trek-inspired analysis (zero emotions)
- **Custom**: Define your own personality with a custom prompt

### 💬 Real-Time Context
- Captures subtitles from YouTube and Netflix automatically
- Maintains 2-hour rolling buffer (enough for full movies)
- Smart spoiler protection - only reveals what you've already seen

### 🚀 Quick Actions
- **📖 Recap**: Get a quick summary of recent events
- **🎲 Trivia**: Fun facts about the movie/show/video
- **💬 Comments** (YouTube only): AI summarizes top comments

### 🎨 Modern UI
- Draggable floating assistant
- Auto-fades after inactivity (stays out of your way)
- Dark/light mode support
- Chat interface with conversation history

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
   git clone https://github.com/[your-username]/Botodachi.git
   cd Botodachi
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

1. Install Ollama: https://ollama.com
2. Pull a model:
   ```bash
   ollama pull llama3.2
   ```
3. In extension options:
   - Provider: `Ollama (Local)`
   - API Base: `http://localhost:11434`
   - Model: `llama3.2`
   - API Key: (leave empty)

**Cost**: Free! Runs on your computer.

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
- Click personality icons (▶️ 📽️ 😂 🖖 ✏️) to change AI behavior
- Each personality has distinct tone and focus
- Try them all to find your favorite!

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
├── CLAUDE.md         # Development guide for AI assistants
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
- **YouTube**: Enable closed captions (CC button)
- **Netflix**: Turn on subtitles in player settings
- Check console for errors (F12 → Console)

### "Missing API key" error
- Open extension options
- Verify API key is saved correctly
- For Ollama: Make sure server is running (`ollama serve`)

### Slow responses
- **OpenAI/Google**: Check your internet connection
- **Ollama**: Large models need more RAM (try `qwen2.5:3b` for faster responses)

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
- **GitHub Issues**: https://github.com/[your-username]/Botodachi/issues
- **Email**: [your-email@example.com]

---

## 📊 Stats

- **Lines of Code**: ~2000
- **Dependencies**: 0 (vanilla JS)
- **Build Time**: 0 seconds (no build process)
- **Extension Size**: ~50KB
- **Supported Sites**: YouTube, Netflix (more coming)

---

## ⭐ Show Your Support

If you find Botodachi useful:
- ⭐ Star this repository
- 🐛 Report bugs
- 💡 Suggest features
- 🔀 Contribute code
- 📢 Share with friends

---

**Made with ❤️ by [Your Name]**

*Enhancing the way we watch and understand video content.*
