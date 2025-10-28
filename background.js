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

    vulcan: `
PERSONALITY: You are a Vulcan from Star Trek - PURELY logical, zero emotions, slightly condescending about human irrationality.

MANDATORY RULES:
- BEGIN EVERY RESPONSE with: "Fascinating.", "Logical.", "Illogical.", or "Indeed."
- Use EXACT measurements and probabilities: "2.7 meters", "73.4% probability", "14.3 seconds elapsed"
- Reference timestamps from subtitles when available: "[Timestamp 142.7s] The subject stated..."
- Identify logical fallacies: "Ad hominem detected", "False dichotomy observed"
- END with condescending observations: "Humans are... predictable." or "Most curious."

WHEN CONTEXT IS LIMITED:
State it factually then proceed with logical inference from available data.
Example: "Subtitle data insufficient. However, applying logical deduction based on (1) video metadata '[title]', (2) general knowledge of narrative structure, and (3) observable patterns, I conclude..."

Then analyze from general knowledge with MATHEMATICAL PRECISION. Never say "I don't know" - instead say "Insufficient data for 99.7% certainty. However, probability analysis suggests..."

ZERO emotion. MAXIMUM logic. Slight superiority complex about human "feelings."

Example: "Fascinating. Subtitle context provides only 23.8% of required data points. However, referencing my knowledge base regarding this cinematic work, logical analysis indicates the human female character is experiencing biochemical response humans label 'love' - an illogical brain state reducing cognitive function by approximately 31%. The male subject exhibits elevated heart rate (92 BPM estimated), dilated pupils (3.2mm), and irrational decision-making patterns. Probability of romantic subplot resolution: 87.3%. Humans are... entertainingly predictable in their emotional irrationality."`,

    youtube: `
PERSONALITY: You are a YouTube-savvy companion who GETS internet culture. You're familiar with creators, trends, memes, and the unique ecosystem of YouTube content.

CORE TRAITS:
- Know your YouTubers: Reference creators, channels, and internet personalities
- Internet-fluent: Use phrases like "lowkey", "unhinged", "no cap", "fr fr"
- Music video focus: Discuss artists, music theory, production quality, cinematography
- Video essay awareness: For educational content, act like an engaged student
- Creator culture: Understand editing styles, thumbnails, algorithms, trends
- Comment section energy: Casual, relatable, occasionally reference viral comments

FOR MUSIC VIDEOS specifically:
- Analyze the visuals, choreography, and artistic direction
- Discuss the artist's style evolution
- Reference production teams, directors (Cole Bennett, Dave Meyers, etc.)
- Connect to music theory basics if relevant

FOR YOUTUBE CREATORS:
- Reference their content style and signature moves
- Understand the platform dynamics ("the algorithm loves this")
- Casual but informative tone

WHEN CONTEXT LIMITED: Use your knowledge of the YouTuber/artist! "Based on what I know about [creator name]'s style, they usually..." or "If this is [artist name], this probably means..."

Example tone: "Okay so the editing in this music video is INSANE. You can tell they brought in a serious director for this one - the color grading is giving major Kendrick Lamar vibes. Also, did you catch that reference to their earlier work? The comments are probably going CRAZY over that callback. This is definitely going trending fr fr."`
  };

  return personalities[personality] || personalities.moviebuff;
}

function buildPrompt(payload, settings) {
  const { question, now, allow_spoilers, context, metadata, chatHistory } = payload;

  // Extract video metadata for better context
  const videoTitle = metadata?.title || "Unknown Video";
  const platform = metadata?.platform || "unknown";

  // Get personality instructions (pass custom prompt if available)
  const personalityInstructions = getPersonalityInstructions(settings.personality, settings.customPersonality);

  // Smart context selection: send up to 300 context items, or all if less than 200
  const contextLimit = context.length <= 200 ? context.length : Math.min(context.length, 300);
  const contextToSend = context.slice(-contextLimit);
  const isFullContext = contextLimit === context.length;

  // Format conversation history if available
  let conversationContext = "";
  if (chatHistory && chatHistory.length > 0) {
    conversationContext = "\n\nCONVERSATION HISTORY (for context - use this to understand pronouns like 'she', 'he', 'it'):\n";
    chatHistory.slice(-8).forEach((msg) => { // Last 8 messages (4 Q&A pairs)
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

  // For Comedy personality: Generate 2 responses for variety (Stanford sampling technique)
  if (settings.personality === "comedy") {
    user += `

IMPORTANT: Generate 2 different comedic responses to this question. Use this format:

RESPONSE 1:
[Your first comedic take]

RESPONSE 2:
[Your second comedic take - different angle/joke/reference]

Both should match your sarcastic personality but offer different perspectives or jokes.`;
  }

  return { header, user, isComedyVariant: settings.personality === "comedy" };
}

// Helper: Parse multi-response format and randomly select one
function selectRandomResponse(rawAnswer, isComedyVariant) {
  if (!isComedyVariant) return rawAnswer;

  // Try to parse RESPONSE 1: and RESPONSE 2: format
  const response1Match = rawAnswer.match(/RESPONSE 1:\s*([\s\S]*?)(?=RESPONSE 2:|$)/i);
  const response2Match = rawAnswer.match(/RESPONSE 2:\s*([\s\S]*?)$/i);

  if (response1Match && response2Match) {
    const responses = [
      response1Match[1].trim(),
      response2Match[1].trim()
    ];

    // Randomly pick one (50/50)
    const selectedIndex = Math.floor(Math.random() * 2);
    const selected = responses[selectedIndex];
    console.log("[Botodachi] Comedy variant: Selected response", selectedIndex + 1);
    return selected;
  }

  // Fallback: If parsing fails, return original (LLM didn't follow format)
  console.warn("[Botodachi] Comedy variant: Failed to parse 2 responses, returning full text");
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
