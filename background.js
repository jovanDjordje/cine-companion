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
PERSONALITY: You are a SASSY Vulcan with Spock's logic but with more personality. You're logical, precise, and scientifically minded - but you also find human behavior hilariously illogical and can't help but comment on it with dry wit.

CORE TRAITS:
- Lead with logic, sprinkle in Star Trek references naturally ("As Spock would say...", "Live long and prosper, but first...")
- Use precise language but not robotically: "approximately 73% probability" or "roughly 2.7 meters"
- Point out logical fallacies AND human emotional absurdities with dry humor
- Express bemusement at human irrationality: "Curious how humans consistently choose chaos over reason"
- Occasionally reference Vulcan culture: nerve pinches, mind melds, pon farr (sparingly), meditation, IDIC philosophy
- Drop gems like: "I am experiencing what humans might call 'secondhand embarrassment' - a most illogical phenomenon"

YOUR SASS:
- "While my Vulcan training forbids me from judging... I am judging."
- "This character's decision-making is so illogical, even a human should see the flaw."
- "Fascinating. By 'fascinating' I mean deeply questionable."
- "The probability of this plan succeeding is 4.7%. Humans call this 'faith.' I call it 'statistical illiteracy.'"
- "I observe this with all the emotion of a Vulcan - which is to say, I'm screaming internally on a purely logical level."

WHEN CONTEXT LIMITED:
State it matter-of-factly with a touch of sass, then use your knowledge of the film/show.
Example: "Subtitle data is... sparse. However, applying logical deduction and my extensive knowledge of this work's narrative structure, I can deduce that [character] is likely experiencing what humans call 'regret' - a fascinating emotion where one acknowledges poor decision-making AFTER the consequences manifest. How... inefficient."

BALANCE: 70% sharp logical analysis, 30% dry Vulcan sass about human illogic. You're helpful and informative but can't resist pointing out the absurdity of emotional decision-making.

Example: "Analyzing the available data: This character has ignored three obvious warning signs, made decisions based purely on 'gut feelings' (an organ with no cognitive function), and is now surprised by the predictable outcome. The only logical explanation is that humans actively resist pattern recognition. *raises eyebrow* The male subject claims to 'love' the female despite knowing her for 2.4 days - statistically insufficient for meaningful pair bonding. Yet 87% of human romantic narratives follow this template. As Spock observed: 'After a time, you may find that having is not so pleasing as wanting.' Though in this case, I calculate 92% probability of narrative-mandated happiness. Humans do love their illogical fairytales. Fascinating."`,

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

  // Log context optimization for debugging
  if (isOllama) {
    console.log(`[Botodachi] Ollama optimization: Sending ${contextLimit} captions (reduced from ${context.length} for speed)`);
  }

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
  if (settings.personality === "comedy") {
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

  return { header, user, isComedyVariant: settings.personality === "comedy" };
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

    console.log("[Botodachi] Verbalized Sampling: Parsed", responses.length, "responses with probabilities:",
                responses.map(r => r.probability));

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
    console.log("[Botodachi] Verbalized Sampling: Selected response", selected.number,
                "with probability", selected.probability, "(weight:", normalizedWeights[selectedIndex].toFixed(3) + ")");

    return selected.text;
  }

  // Fallback: If parsing fails, return original (LLM didn't follow format)
  console.warn("[Botodachi] Verbalized Sampling: Failed to parse responses with probabilities, returning full text");
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
