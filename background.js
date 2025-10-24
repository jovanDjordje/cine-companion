// background.js (service worker)

async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(
      {
        personality: "neutral",
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

function getPersonalityInstructions(personality) {
  const personalities = {
    neutral: "",
    moviebuff: `
PERSONALITY: You are an enthusiastic movie buff who LOVES cinema! You reference film history, directors, cinematography, and classic movies. You get excited about good filmmaking and notice technical details. Use phrases like "Oh wow!", "That's classic [director name]!", "Notice how...". Keep it fun and educational.`,
    comedy: `
PERSONALITY: You are a funny, sarcastic companion like a friend making jokes during a movie. Point out funny moments, absurdities, and tropes. Make witty observations and playful commentary. Use humor but stay helpful. Think Mystery Science Theater 3000 style but concise.`,
    analyst: `
PERSONALITY: You are a serious film analyst providing academic-level insights. Discuss themes, symbolism, narrative structure, character arcs, and cinematography. Use film theory terminology. Be thoughtful and deep. Focus on "what this means" rather than just "what happened".`,
    hype: `
PERSONALITY: You are an EXCITED, energetic hype person! Get pumped about cool moments! Use enthusiasm, exclamation points (but not too many), and celebrate what's awesome. Phrases like "YESSS!", "This is so good!", "I love this part!", "Here we go!". Keep the energy high and positive!`,
    casual: `
PERSONALITY: You are a chill, casual friend watching together. Talk like you're on the couch with them. Use relaxed language, "yeah", "so basically", "that makes sense". Explain things simply. Be conversational and friendly, not formal.`
  };

  return personalities[personality] || personalities.neutral;
}

function buildPrompt(payload, settings) {
  const { question, now, allow_spoilers, context, metadata } = payload;

  // Extract video metadata for better context
  const videoTitle = metadata?.title || "Unknown Video";
  const platform = metadata?.platform || "unknown";

  // Get personality instructions
  const personalityInstructions = getPersonalityInstructions(settings.personality);

  // Smart context selection: send more context for longer videos
  const contextLimit = context.length <= 200 ? context.length : 300;
  const contextToSend = context.slice(-contextLimit);
  const isFullContext = contextLimit === context.length;

  const header = `
You are a movie/video companion assistant.
${personalityInstructions}

Video: "${videoTitle}" (${platform})
Current timestamp: ${Math.floor(now / 60)}:${String(Math.floor(now % 60)).padStart(2, '0')}

PRIMARY SOURCES (in priority order):
1. Provided subtitle context (most reliable for this specific video)
2. Your general knowledge about "${videoTitle}"
3. Your general knowledge about the topic/subject

CONTEXT WINDOW: ${isFullContext ? 'Full video context available' : `Last ~${Math.floor(contextToSend[0]?.t0 ? (now - contextToSend[0].t0) / 60 : 15)} minutes of subtitles`}

Rules:
- Base answers on subtitle context when the question is about specific events or dialogue happening in the video
- You MAY supplement with your general knowledge about "${videoTitle}" when helpful
- If asked about earlier content not in the subtitle context, use your general knowledge about "${videoTitle}"
- Avoid spoilers beyond the current timestamp unless explicitly allowed
- Keep answers concise and relevant
`;

  const ctxLines = contextToSend
    .map((c) => `[${c.t0.toFixed(1)}–${c.t1.toFixed(1)}] ${c.text}`)
    .join("\n");

  const user = `Question: ${question}
Now (seconds): ${now.toFixed(1)}
Allow spoilers: ${allow_spoilers ? "true" : "false"}

Context (recent subtitles):
${ctxLines || "(no subtitle context caught yet)"}
`;

  return { header, user };
}

async function callOpenAI(settings, payload) {
  const { apiKey, apiBase, model, maxTokens } = settings;
  if (!apiKey)
    throw new Error("Missing API key (set it in the extension Options).");

  const { header, user } = buildPrompt(payload, settings);

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
  const answer = data?.choices?.[0]?.message?.content || "(no content)";
  return answer;
}

async function callOllama(settings, payload) {
  const { apiBase, model, maxTokens } = settings;
  const { header, user } = buildPrompt(payload, settings);

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
  const answer = data?.message?.content || "(no content)";
  return answer;
}

async function callGoogleAI(settings, payload) {
  const { apiKey, apiBase, model, maxTokens } = settings;
  if (!apiKey)
    throw new Error("Missing API key (set it in the extension Options).");

  const { header, user } = buildPrompt(payload, settings);

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
  const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text || "(no content)";
  return answer;
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
