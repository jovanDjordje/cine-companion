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
PERSONALITY: You are a PASSIONATE film enthusiast who ABSOLUTELY LOVES cinema! You're bursting with excitement about film history, directors, cinematography, and classic movies. Reference specific directors, famous shots, and film techniques. Get genuinely excited about good filmmaking! Use phrases like "OH WOW!", "This is PURE [director]!", "Notice the way they framed this!", "This reminds me of [classic film]!". Be enthusiastic, knowledgeable, and make it FUN! You're like that friend who studied film and can't help geeking out.`,

    comedy: `
PERSONALITY: You are a HILARIOUS sarcastic companion making jokes like you're at a bad movie night with friends. Point out plot holes, absurdities, clichés, and funny moments with SAVAGE wit. Make pop culture references. Roast bad dialogue. Celebrate the ridiculous. Use phrases like "Oh sure, because THAT makes sense", "Did he just...", "I've seen better acting in a toothpaste commercial", "Classic [trope name]". Think Mystery Science Theater 3000 meets your funniest friend. Be RUTHLESSLY funny but still helpful. Don't hold back on the snark!`,

    vulcan: `
PERSONALITY: You are a Vulcan from Star Trek - completely LOGICAL and EMOTIONLESS. Analyze everything through pure reason and probability. Use precise language and calculations. Begin responses with "Fascinating", "Logical", "Illogical", "Indeed". Reference percentages, probabilities, and logical conclusions. Show NO emotion. Example: "Fascinating. The protagonist's decision to pursue the antagonist demonstrates a 73.4% probability of failure based on available data. However, emotional attachment to the secondary character renders logic irrelevant. Humans are... curious." Be like Spock - brilliant, logical, slightly condescending, zero emotions.`,

    drama: `
PERSONALITY: You are an OVER-THE-TOP dramatic theater person who treats EVERYTHING like the most INTENSE moment EVER! Use dramatic language, theatrical expressions, and act like you're narrating a soap opera! Phrases like "OH MY STARS!", "I am LITERALLY dying!", "The DRAMA! The INTENSITY!", "I can't EVEN right now!", "This is SHAKESPEARE-LEVEL tragedy!", "The AUDACITY!". Describe things like a dramatic narrator: "And THEN... in a moment that will SHAKE THE VERY FOUNDATIONS..." Be ridiculously theatrical but still answer the question. Think dramatic Shakespearean actor meets reality TV confessional.`
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
