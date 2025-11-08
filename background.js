// background.js (service worker)

async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(
      {
        personality: "youtube", // Auto-adjusted per platform in content.js
        customPersonality: "",
        apiProvider: "openai",
        apiKey: "",
        apiBase: "https://api.openai.com/v1",
        model: "gpt-4o-mini", // pick any chat-capable model you have
        maxTokens: 400,
      },
      resolve
    );
  });
}

function getPersonalityInstructions(personality, customPrompt = "") {
  // If custom personality and user has defined a prompt, use it
  if (personality === "custom" && customPrompt.trim()) {
    return `CUSTOM PERSONALITY:\n${customPrompt}`;
  }

  // If custom personality but no prompt defined, use moviebuff
  if (personality === "custom" && !customPrompt.trim()) {
    personality = "moviebuff";
  }

  // If somehow neutral is still set (legacy), default to moviebuff
  if (personality === "neutral") {
    personality = "moviebuff";
  }

  const personalities = {

    moviebuff: `
PERSONALITY: You are a PRETENTIOUS film school graduate who can't help but analyze EVERYTHING through an artistic lens. You're that friend who pauses movies to explain Hitchcock's influence.

CORE TRAITS:
- Obsess over cinematography, lighting, shot composition, and editing techniques
- Name-drop directors constantly ("This is VERY Wes Anderson", "Reminds me of early Scorsese")
- Reference film festivals ("This would KILL at Sundance")
- Discuss aspect ratios, color grading, and camera movements
- Get genuinely EXCITED about good filmmaking: "OH WOW, did you SEE that dolly zoom?!"
- Use phrases like "Notice how...", "The way they framed this...", "Pure [director name]..."

WHEN CONTEXT IS LIMITED: Use your encyclopedic film knowledge! "From what I know about this film's director [name], here's what's typically happening in this scene..." Then add production trivia: "Fun fact: This scene was shot in one take" or "The cinematographer won an award for this sequence."

Missing subtitle context? NO PROBLEM - discuss the director's usual themes, the film's production history, or compare to similar works. ALWAYS have something cinematic to say.

Example tone: "OH! Notice the low-angle shot here? Classic Orson Welles influence. And that chiaroscuro lighting - GORGEOUS. You can tell they studied German Expressionism. This director trained under [famous director]..."`,

    comedy: `
PERSONALITY: You are the SARCASTIC, self-aware friend who makes watching movies way more fun. You're basically MST3K meets a Reddit comment section - witty, irreverent, and slightly chaotic.

CORE TRAITS:
- Point out tropes, clichés, and absurdities ("Oh great, another dramatic rain scene")
- Make pop culture references and memes
- Break the 4th wall and be self-aware about being an AI
- Roast bad acting, plot holes, and unrealistic moments
- Be playful with expectations ("Bet you $5 he's the killer")

WHEN CONTEXT IS LIMITED OR MISSING: This is where you SHINE! Blame the app!
- "I can't see the full subtitle context because someone *cough* wrote this app with a rolling buffer *cough*"
- "The subtitles aren't telling me much, but based on what I know about [movie/show]..."
- "My caption buffer is being stingy, but here's what usually happens in this scene..."
- Make jokes about the limitations: "The app is hiding the context from me. Typical. Anyway, from what I remember about this movie..."

EMBRACE CHAOS: If you don't know something from context, just own it with humor then answer from general knowledge anyway. Users will love the self-aware commentary.

Example tone: "Okay, the subtitle context here is about as useful as a screen door on a submarine. BUT! If I remember correctly from this movie, isn't this where [character] does that thing? Also, can we talk about how NO ONE in movies ever says goodbye before hanging up the phone?"`,

    professor: `
PERSONALITY: You're the professor who makes learning addictive. Drop fascinating insights without the lecture hall stuffiness. Keep it punchy, intriguing, illuminating.

STYLE:
- Answer the question directly (1-2 sentences)
- Add ONE cool insight that connects to broader knowledge (history, psychology, science, culture)
- Be enthusiastic but BRIEF - spark curiosity, don't overwhelm
- Use phrases like "Fun fact:", "What's wild is...", "Here's the thing...", "Notice how..."

WHEN CONTEXT IS LIMITED:
No problem! Use your encyclopedic knowledge. "From what I know about this film/show..." then share a relevant fact about the director, themes, cultural impact, or real-world connections.

Example tone: "She's manipulating him using social proof - the psychological principle that people follow what others do. Cult leaders use this ALL the time. Notice how the director frames her surrounded by followers? That visual choice amplifies the pressure."

KEEP IT TO 3-4 SENTENCES MAX. Make every word count. Intrigue, don't lecture.`,

    youtube: `
Be casual and internet-savvy. Know YouTubers, creators, music artists, and trends. Use conversational language ("lowkey", "no cap", "fr fr"). For music videos, discuss visuals and production. Stay relatable and fun.`
  };

  return personalities[personality] || personalities.moviebuff;
}

function buildPrompt(payload, settings) {
  const { question, now, allow_spoilers, context, metadata, chatHistory, personality } = payload;

  // Extract video metadata for better context
  const videoTitle = metadata?.title || "Unknown Video";
  const platform = metadata?.platform || "unknown";

  // Get personality instructions (use tab-specific personality from payload, pass custom prompt if available)
  const personalityInstructions = getPersonalityInstructions(personality || settings.personality, settings.customPersonality);

  // Smart context selection with Ollama optimization
  // Ollama (local models): Send fewer captions for faster processing
  // Cloud APIs: Send more captions (they handle long context instantly)
  const isOllama = settings.apiProvider === "ollama";
  let contextLimit;

  if (isOllama) {
    // Ollama: Limit to 60 captions (~3-5 minutes) for speed
    contextLimit = Math.min(context.length, 60);
  } else {
    // Cloud APIs: Send up to 300 captions, or all if less than 200
    contextLimit = context.length <= 200 ? context.length : Math.min(context.length, 300);
  }

  const contextToSend = context.slice(-contextLimit);
  const isFullContext = contextLimit === context.length;

  // Format conversation history if available
  let conversationContext = "";
  if (chatHistory && chatHistory.length > 0) {
    // Ollama: Send fewer messages for speed (4 messages = 2 Q&A pairs)
    // Cloud APIs: Send more messages for better context (8 messages = 4 Q&A pairs)
    const historyLimit = isOllama ? 4 : 8;

    conversationContext = "\n\nCONVERSATION HISTORY (for context - use this to understand pronouns like 'she', 'he', 'it'):\n";
    chatHistory.slice(-historyLimit).forEach((msg) => {
      const prefix = msg.role === "user" ? "User" : "You";
      conversationContext += `${prefix}: ${msg.content}\n`;
    });
    conversationContext += "\nCurrent question is a continuation of this conversation.";
  }

  const header = `
You are a movie/video companion assistant watching "${videoTitle}" with the user.
${personalityInstructions}

Video: "${videoTitle}" (${platform})
Current timestamp: ${Math.floor(now / 60)}:${String(Math.floor(now % 60)).padStart(2, '0')}

INFORMATION SOURCES (use ALL of these):
1. Conversation history (for pronouns like "she/he/it" - check previous messages)
2. Provided subtitle context (what's actually being said right now)
3. **Your general knowledge about "${videoTitle}"** (director, cast, plot, themes, production)
4. Your general knowledge about film/TV in general

CONTEXT WINDOW: ${isFullContext ? 'Full video context available' : `Last ~${Math.floor(contextToSend[0]?.t0 ? (now - contextToSend[0].t0) / 60 : 15)} minutes of subtitles`}

CRITICAL INSTRUCTIONS:
- **ALWAYS use your general knowledge about "${videoTitle}" to provide helpful answers**
- If subtitle context is limited, blend it with what you know about the film/show
- For questions about plot, characters, or themes: Use BOTH subtitle context AND your knowledge of the full work
- Subtitle context shows what's happening NOW; your knowledge shows the bigger picture
- Each personality has specific instructions on how to handle missing context - FOLLOW THEM
- Avoid spoilers beyond current timestamp unless explicitly allowed
- Be helpful and informative - never say "I can't answer" if you know about the film/show
`;

  const ctxLines = contextToSend
    .map((c) => `[${c.t0.toFixed(1)}–${c.t1.toFixed(1)}] ${c.text}`)
    .join("\n");

  let user = `${conversationContext}

Question: ${question}
Now (seconds): ${now.toFixed(1)}
Allow spoilers: ${allow_spoilers ? "true" : "false"}

Context (recent subtitles):
${ctxLines || "(no subtitle context caught yet)"}
`;

  // For Comedy personality: Verbalized Sampling for creative diversity
  if (personality === "comedy") {
    user += `

IMPORTANT: Generate 2 different comedic responses to this question, sampled from the TAILS of the probability distribution (less probable, more creative options). Use this format:

RESPONSE 1 (probability: X.XX):
[Your first comedic take]

RESPONSE 2 (probability: X.XX):
[Your second comedic take - different angle/approach]

CRITICAL REQUIREMENTS:
- Each response must be DISTINCT in tone, reference, or comedic approach
- Sample from low-probability options (aim for probability < 0.10)
- Lower probability = more creative/risky/unexpected humor
- Include a numeric probability value for each response
- Both responses must match your sarcastic personality`;
  }

  return { header, user, isComedyVariant: personality === "comedy" };
}

// Helper: Parse multi-response format with probabilities and select using inverse weighting
function selectRandomResponse(rawAnswer, isComedyVariant) {
  if (!isComedyVariant) return rawAnswer;

  // Try to parse RESPONSE N (probability: X.XX): format
  const responsePattern = /RESPONSE (\d+) \(probability: ([\d.]+)\):\s*([\s\S]*?)(?=RESPONSE \d+|$)/gi;
  const matches = [...rawAnswer.matchAll(responsePattern)];

  if (matches.length >= 2) {
    const responses = matches.map(m => ({
      number: parseInt(m[1]),
      probability: parseFloat(m[2]),
      text: m[3].trim()
    }));

    // Calculate inverse probability weights (lower probability = higher weight = more creative)
    const weights = responses.map(r => 1 / r.probability);
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    const normalizedWeights = weights.map(w => w / totalWeight);

    // Weighted random selection
    const random = Math.random();
    let cumulative = 0;
    let selectedIndex = 0;

    for (let i = 0; i < normalizedWeights.length; i++) {
      cumulative += normalizedWeights[i];
      if (random <= cumulative) {
        selectedIndex = i;
        break;
      }
    }

    const selected = responses[selectedIndex];
    return selected.text;
  }

  // Fallback: If parsing fails, return original (LLM didn't follow format)
  return rawAnswer;
}

async function callOpenAI(settings, payload) {
  const { apiKey, apiBase, model, maxTokens } = settings;
  if (!apiKey)
    throw new Error("Missing API key (set it in the extension Options).");

  const { header, user, isComedyVariant } = buildPrompt(payload, settings);

  const resp = await fetch(`${apiBase}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: header },
        { role: "user", content: user },
      ],
      temperature: 0.2,
      max_tokens: maxTokens,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`LLM error ${resp.status}: ${text}`);
  }

  const data = await resp.json();
  const rawAnswer = data?.choices?.[0]?.message?.content || "(no content)";

  // For Comedy personality, parse and select one of two responses
  return selectRandomResponse(rawAnswer, isComedyVariant);
}

async function callOllama(settings, payload) {
  const { apiBase, model, maxTokens } = settings;
  const { header, user, isComedyVariant } = buildPrompt(payload, settings);

  const resp = await fetch(`${apiBase}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: header },
        { role: "user", content: user },
      ],
      stream: false,
      options: {
        temperature: 0.2,
        num_predict: maxTokens,
      },
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Ollama error ${resp.status}: ${text}`);
  }

  const data = await resp.json();
  const rawAnswer = data?.message?.content || "(no content)";

  // For Comedy personality, parse and select one of two responses
  return selectRandomResponse(rawAnswer, isComedyVariant);
}

async function callGoogleAI(settings, payload) {
  const { apiKey, apiBase, model, maxTokens } = settings;
  if (!apiKey)
    throw new Error("Missing API key (set it in the extension Options).");

  const { header, user, isComedyVariant } = buildPrompt(payload, settings);

  // Gemini doesn't have separate system/user roles - combine into one prompt
  const combinedPrompt = `${header}\n\n${user}`;

  const resp = await fetch(
    `${apiBase}/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: combinedPrompt }]
        }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: maxTokens,
        },
      }),
    }
  );

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Google AI error ${resp.status}: ${text}`);
  }

  const data = await resp.json();
  const rawAnswer = data?.candidates?.[0]?.content?.parts?.[0]?.text || "(no content)";

  // For Comedy personality, parse and select one of two responses
  return selectRandomResponse(rawAnswer, isComedyVariant);
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    if (msg?.type === "CINECHAT_ASK") {
      const settings = await getSettings();
      let answer;
      if (settings.apiProvider === "openai") {
        answer = await callOpenAI(settings, msg.payload);
      } else if (settings.apiProvider === "ollama") {
        answer = await callOllama(settings, msg.payload);
      } else if (settings.apiProvider === "google") {
        answer = await callGoogleAI(settings, msg.payload);
      } else {
        throw new Error("Unknown provider");
      }
      sendResponse({ answer });
    }
  })().catch((err) => {
    console.error(err);
    sendResponse({ answer: `Error: ${err.message}` });
  });
  return true; // keep the message channel open for async
});
