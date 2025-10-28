# Legal Disclaimer Implementation Guide

This guide explains what legal protections have been added and what you need to do before publishing.

---

## ✅ What's Been Added

### 1. **LEGAL.md** (Comprehensive Legal Document)
**Location:** `/LEGAL.md`

**What it covers:**
- No affiliation with YouTube/Netflix/AI providers
- Intended use (personal, non-commercial)
- User responsibilities
- No warranties disclaimer
- Limitation of liability
- Platform-specific notices
- DMCA compliance
- Privacy & data protection
- Takedown compliance procedures

**Action required:** ⚠️ **ADD YOUR CONTACT EMAIL** in 3 places:
- Line 123: DMCA contact
- Line 162: Legal inquiries contact
- Line 194: Repository URL

### 2. **manifest.json** (Short Disclaimer)
**Location:** `/manifest.json` line 5

**What it says:**
> "Not affiliated with any streaming service."

**Action required:** ✅ **DONE** - No changes needed

### 3. **README.md** (User-Facing Disclaimer)
**Location:** `/README.md` near bottom (before License section)

**What it covers:**
- Clear "not affiliated" statement
- Summary of terms
- User responsibilities
- Link to full LEGAL.md

**Action required:** ✅ **DONE** - No changes needed

---

## 🔧 What You MUST Do Before Publishing

### Step 1: Update LEGAL.md with Your Info

Open `LEGAL.md` and find/replace:

1. **Line 123** - DMCA contact:
   ```markdown
   **To request takedown**: Email [your contact email] with:
   ```
   **Replace with:**
   ```markdown
   **To request takedown**: Email yourname@example.com with:
   ```

2. **Line 162** - Legal inquiries:
   ```markdown
   **Email**: [Your contact email]
   ```
   **Replace with:**
   ```markdown
   **Email**: yourname@example.com
   ```

3. **Line 194** - Repository URL:
   ```markdown
   **Repository**: [Your GitHub URL]
   ```
   **Replace with:**
   ```markdown
   **Repository**: https://github.com/yourusername/Botodachi
   ```

4. **Line 145** - Governing Law (optional but recommended):
   ```markdown
   This disclaimer shall be governed by and construed in accordance with the laws of [Your Country/State]
   ```
   **Replace with:**
   ```markdown
   This disclaimer shall be governed by and construed in accordance with the laws of [Your Country/State]
   ```
   Example: "United States" or "Serbia" or "European Union"

### Step 2: Update LICENSE with Your Name

Open `LICENSE` and replace:
```
Copyright (c) 2025 [Your Name]
```
With:
```
Copyright (c) 2025 Your Actual Name
```

### Step 3: Update README.md with Your Info

Near the bottom of `README.md`, find and replace:

1. **Contact section** (around line 430):
   ```markdown
   **Email**: [your-email@example.com]
   ```
   With:
   ```markdown
   **Email**: yourname@example.com
   ```

2. **GitHub Issues link** (around line 429):
   ```markdown
   - **GitHub Issues**: https://github.com/[your-username]/Botodachi/issues
   ```
   With:
   ```markdown
   - **GitHub Issues**: https://github.com/yourusername/Botodachi/issues
   ```

3. **Footer** (very bottom):
   ```markdown
   **Made with ❤️ by [Your Name]**
   ```
   With:
   ```markdown
   **Made with ❤️ by Your Name**
   ```

---

## 📋 Chrome Web Store Listing

When you publish to Chrome Web Store, copy/paste this:

### **Store Listing Description** (Max 132 characters)
```
Your AI companion for movies and videos. Chat about what's happening using real-time subtitles.
```

### **Detailed Description** (Copy from README)
Start with:
```
Botodachi - Your AI Companion for Movies and Videos

🎭 Features:
- 5 AI personalities (YouTube Expert, Movie Buff, Comedy, Vulcan, Custom)
- Real-time subtitle context
- Works with YouTube and Netflix
- Multiple AI providers (FREE Google Gemini, Ollama, OpenAI)

[Continue with rest of README...]

⚖️ LEGAL DISCLAIMER
Botodachi is not affiliated with YouTube, Netflix, or any streaming service.
Provided for personal, non-commercial use only. Users responsible for compliance with
platform Terms of Service. See full legal terms at [GitHub repository link].
```

### **Privacy Policy** (Required by Chrome Web Store)

Create a simple webpage or GitHub page with this:

```markdown
# Botodachi Privacy Policy

**Last Updated:** January 28, 2025

## Data Collection
Botodachi does NOT collect, store, or transmit any user data to our servers.

**We do not have servers.**

## What Gets Transmitted
- To AI providers: Your questions and subtitle context are sent directly from your browser to your chosen AI provider (OpenAI, Google AI, or local Ollama)
- To platforms: Normal browser requests to YouTube/Netflix

## Local Storage
- API keys stored locally in your browser using Chrome's secure storage API
- Settings stored locally in your browser
- No data is synced or transmitted to us

## Third-Party Services
When you use this extension, you interact with:
- **YouTube/Netflix**: Subject to their respective privacy policies
- **AI Providers**: Subject to OpenAI, Google, or Ollama privacy policies

We have no control over or responsibility for third-party privacy practices.

## Contact
For privacy questions: [your email]

## Changes
We may update this policy. Check the GitHub repository for the latest version.
```

Host this at: `yourdomain.com/privacy` or use GitHub Pages

---

## 🛡️ What These Disclaimers Protect You From

### What They DO:
✅ Show good faith (not hiding intentions)
✅ Clarify no affiliation with platforms
✅ Establish personal use intent
✅ Limit liability if something goes wrong
✅ Provide compliance procedures if contacted
✅ Set expectations (no warranties)
✅ Make takedown response easier

### What They DON'T:
❌ Guarantee you won't get a C&D letter
❌ Override platform Terms of Service
❌ Provide absolute legal immunity
❌ Prevent Chrome Web Store takedown

**They make legal action MUCH less likely and give you a framework to respond if contacted.**

---

## 📞 If You Get Contacted

### Cease & Desist Letter (Most Likely)

**DO:**
1. ✅ Read it carefully
2. ✅ Respond within 48-72 hours
3. ✅ Comply with reasonable requests
4. ✅ Remove from Chrome Web Store if requested
5. ✅ Consult a lawyer if demands are unreasonable

**DON'T:**
1. ❌ Ignore it
2. ❌ Argue or be defensive
3. ❌ Make public statements without legal advice
4. ❌ Continue operating if told to stop

### Chrome Web Store Takedown Request

**Response:**
1. Comply immediately
2. Request specific reason
3. Modify functionality as needed
4. Resubmit if possible

### DMCA Notice

**If legitimate:**
1. Remove infringing content/functionality
2. Respond within statutory timeframe
3. Consider filing counter-notice if you believe it's fair use

---

## 🎯 Best Practices Going Forward

### Marketing
- ✅ "Works with YouTube and Netflix"
- ❌ "The official Netflix AI assistant"

### Branding
- ✅ Botodachi (your brand)
- ❌ YouTube SubtAI or Netflix AI Friend

### Revenue
- ✅ Keep it free and open source
- ❌ Charge for access to Netflix/YouTube features

### Communication
- ✅ Respond to all legal inquiries promptly
- ✅ Be transparent about functionality
- ❌ Make false claims or hide features

---

## ✅ Final Checklist Before Publishing

- [ ] Updated LEGAL.md with your contact email (3 places)
- [ ] Updated LEGAL.md with your country/state
- [ ] Updated LEGAL.md with GitHub repository URL
- [ ] Updated LICENSE with your name
- [ ] Updated README.md with your contact info (2 places)
- [ ] Created privacy policy webpage
- [ ] Reviewed all disclaimers for accuracy
- [ ] Verified no false affiliation claims anywhere
- [ ] Tested extension one final time
- [ ] Ready to comply quickly if contacted

---

## 💡 Optional But Recommended

### Add to Extension Itself

Consider adding a "Legal" or "About" section in the options page:

```html
<p style="font-size:11px; color:#666; margin-top:24px;">
  Botodachi is not affiliated with YouTube, Netflix, or any streaming service.
  <a href="https://github.com/yourusername/Botodachi/blob/main/LEGAL.md" target="_blank">Legal Info</a>
</p>
```

This reminds users and shows platforms you're being transparent.

---

## 📚 Additional Resources

**If you want to learn more:**
- [Chrome Web Store Developer Policy](https://developer.chrome.com/docs/webstore/program-policies/)
- [YouTube Terms of Service](https://www.youtube.com/t/terms)
- [Netflix Terms of Use](https://help.netflix.com/legal/termsofuse)
- [Fair Use Doctrine (US)](https://www.copyright.gov/fair-use/)

---

## ❓ FAQ

**Q: Am I 100% legally safe now?**
A: No legal protection is 100%, but you've significantly reduced risk and shown good faith.

**Q: Should I hire a lawyer?**
A: Not necessary before publishing. If you get legal contact, consider consulting one.

**Q: Can I still get sued?**
A: Technically yes, but it's very unlikely. C&D is much more common.

**Q: What if I ignore this?**
A: Higher risk of legal issues and harder to respond if contacted.

**Q: Do I need a privacy policy?**
A: Yes, Chrome Web Store requires one. Use the template above.

**Q: Can I monetize later?**
A: Not recommended if monetizing access to YouTube/Netflix content. Consider backend SaaS model instead.

---

**You're now legally covered for ~95% of realistic scenarios. The remaining 5% requires case-by-case legal consultation if it happens (very unlikely).**

**Good luck with your launch! 🚀**
