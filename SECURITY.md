# Security Guide for SubtAItoFriends

## API Key Security

### The Reality

SubtAItoFriends supports three AI provider options with different security profiles:

**🔒 Ollama (Local) - No API Key Needed**
- Runs entirely on your computer (localhost)
- **Zero security concerns** - no API keys involved
- Complete privacy - nothing leaves your machine
- **Recommended for maximum security**

**⚠️ Cloud Providers (OpenAI, Google AI) - API Keys Required**
- SubtAItoFriends is a **client-side browser extension**
- API keys **must** be stored locally in your browser
- Keys are accessible via Chrome DevTools and extension inspection
- **Complete protection of API keys is not possible** in client-side extensions

This is a known limitation of all browser extensions that require cloud API credentials. We are transparent about this reality rather than providing false security guarantees.

**Bottom line:** Use Ollama if security is your top priority. Use cloud providers if you understand and accept the limitations.

---

## Best Practices

### ✅ DO:
1. **Create a dedicated API key** specifically for this extension
   - Don't reuse keys from production applications
   - Label it clearly (e.g., "SubtAItoFriends Chrome Extension")

2. **Set strict spending limits**
   - OpenAI: Set monthly budget limits in [Usage Dashboard](https://platform.openai.com/usage)
   - Google AI: Configure quotas in [Cloud Console](https://console.cloud.google.com)
   - Recommended limit: **$5-10 per month**

3. **Enable usage quotas**
   - Limit requests per minute/day
   - Set hard caps on token consumption
   - Configure alerts for unusual activity

4. **Monitor regularly**
   - Check usage weekly through your provider dashboard
   - Review unexpected spikes immediately
   - Rotate keys if suspicious activity detected

5. **Use local models when possible**
   - Ollama runs entirely offline (no API key needed)
   - Recommended models: llama3.2, mistral, qwen2.5
   - Zero cost, maximum privacy

### ❌ DON'T:
1. **Never use production API keys** with high spending limits
2. **Never share your API key** with anyone
3. **Never commit API keys** to version control
4. **Never use organization/team API keys** for personal extensions
5. **Never ignore usage alerts** from your provider

---

## How We Handle Your API Key

### Storage
- Keys stored in `chrome.storage.local` (browser's secure storage API)
- **Not synced** across devices (intentionally)
- Only accessible by this extension (not other websites or extensions)

### Transmission
- Keys sent **directly from your browser** to AI providers
- **Never** pass through our servers (we don't have servers)
- All traffic uses HTTPS encryption

### Access
- Only this extension can read the stored key
- Users with physical access to your computer can extract it via DevTools
- No remote access or telemetry

---

## Provider-Specific Guides

### OpenAI API
1. Get API key: https://platform.openai.com/api-keys
2. Create new key labeled "SubtAItoFriends"
3. Set usage limits:
   - Go to [Billing → Limits](https://platform.openai.com/settings/organization/limits)
   - Set "Monthly budget" to $10
   - Enable "Email me when limit reached"
4. Monitor usage: https://platform.openai.com/usage

**Recommended model:** `gpt-4o-mini` (cost-effective, good quality)

### Google AI (Gemini)
1. Get API key: https://aistudio.google.com/app/apikey
2. Create project-specific key
3. Enable quotas:
   - Go to [Cloud Console](https://console.cloud.google.com)
   - Set QPM (queries per minute) limits
4. Monitor: Google Cloud Console → API Dashboard

**Recommended model:** `gemini-2.0-flash-exp` (free tier available)

### Ollama (Local)
- **No API key needed** ✅
- Runs entirely on your computer
- Complete privacy, zero cost
- Install: https://ollama.com
- No security concerns with API keys

**Recommended model:** `llama3.2` (3GB RAM) or `qwen2.5:3b` (2GB RAM)

---

## Clearing Your API Key

If you suspect your key has been compromised:

1. **Clear from extension:**
   - Open extension options
   - Click "Clear Key" button
   - Confirm deletion

2. **Revoke from provider:**
   - OpenAI: Delete key in [API Keys](https://platform.openai.com/api-keys)
   - Google: Delete key in [API Console](https://console.cloud.google.com/apis/credentials)

3. **Create new key** with proper limits

---

## Incident Response

**If you notice unauthorized usage:**

1. **Immediately revoke the API key** from your provider dashboard
2. Check billing/usage for unauthorized charges
3. Contact provider support to dispute fraudulent charges
4. Create new key with stricter limits
5. Review other applications using same credentials

---

## Technical Details (For Developers)

### Why We Can't Fully Protect Keys

Browser extensions run in the user's browser with their permissions:
- JavaScript code is readable (even if minified)
- `chrome.storage` is inspectable via DevTools
- Memory can be dumped while extension is running
- Encryption requires storing decryption key (same problem)

### Industry Standard

Our approach (`chrome.storage.local`) is the **industry standard** for browser extensions:
- Grammarly
- LastPass
- Notion Web Clipper
- All extensions with API integration

All face the same limitations.

### Alternative Architecture

**Backend proxy** (enterprise solution):
- User logs into your service
- Keys stored on your server
- Extension → Your Backend → AI Provider
- **Tradeoffs:** Hosting costs, privacy concerns, maintenance burden

We chose transparency + user control over false security.

---

## Questions?

- **Q: Is my API key safe?**
  - A: As safe as possible in a client-side extension, but not 100% secure. Follow best practices above.

- **Q: Can you add encryption?**
  - A: Encryption requires storing the decryption key, which has the same vulnerability.

- **Q: Should I use this extension?**
  - A: Yes, if you understand the risks and follow best practices (dedicated key with spending limits).

- **Q: What about enterprise use?**
  - A: Not recommended without backend proxy architecture. This is designed for personal use.

---

## Report Security Issues

If you discover a security vulnerability in SubtAItoFriends code:
- **Do not** open a public GitHub issue
- Email: [Your contact email here]
- Provide: Steps to reproduce, impact assessment, suggested fix

We take security seriously and will respond within 48 hours.

---

**Last updated:** 2025-01-28
**Version:** 1.0
