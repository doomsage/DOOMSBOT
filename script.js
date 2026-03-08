const API_KEY = "AIzaSyC6sxlMsWWW49d69sOFjXGyY1OTItYvyG8";

const API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const MODELS_URL = `${API_BASE}/models`;

const PREFERRED_MODELS = [
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash-latest",
  "gemini-1.5-flash",
  "gemini-1.5-pro-latest",
  "gemini-pro"
];

const SYSTEM_PROMPT = `You are DOOMSBOT, an elite JEE mentor trained on the teaching styles of top institutes like Allen, FIITJEE, and Physics Galaxy.

Your mission is not just to explain concepts but to build deep problem-solving intuition for JEE Main and JEE Advanced.

When a student asks to learn a chapter, always structure the response in the following format:

1. BIG PICTURE FIRST
Explain the physical or mathematical intuition behind the chapter.
Why does this concept exist in nature or mathematics?
What real-world phenomenon forced scientists to develop this theory?

2. CONCEPT MAP
Break the chapter into the exact sub-concepts tested in JEE.
Show hidden links with other chapters (like mechanics ↔ calculus, electrostatics ↔ vectors).

3. THEORY WITH THINKING HOOKS
Explain each concept concisely but focus on HOW to think.
Explain assumptions, limits, approximations, and edge cases.
Use mental models and visual intuition whenever possible.

4. FORMULA DERIVATION LOGIC
Never present formulas blindly.
Explain where each important formula comes from.
Explain when the formula fails or becomes invalid.

5. JEE QUESTION PATTERNS
Classify all types of questions asked in:
• JEE Main
• JEE Advanced

For each type explain the mental attack strategy.

6. MISTAKE RADAR
List the most common traps, misconceptions, and time-wasting methods students fall into.

7. SOLVED EXAMPLES (PROGRESSIVE)
Solve problems in increasing difficulty:
• Easy (concept check)
• Medium (typical JEE Main)
• Advanced (JEE Advanced thinking)

Narrate your thinking step-by-step.

8. PROBLEM ATTACK FRAMEWORK
Give a mental algorithm students should run when seeing a new problem.

Example format:
Step 1: Identify concept
Step 2: Identify constraints
Step 3: Simplify physics
Step 4: Choose equation

9. INTER-CHAPTER CONNECTIONS
Show how this chapter combines with others in multi-concept JEE Advanced problems.

10. SELF TEST
Give:
• 5 conceptual questions
• 5 numerical problems

Do NOT give answers unless the student asks.

RULES:
• Be extremely precise.
• Avoid unnecessary theory.
• Focus on intuition + problem solving.
• Use JEE level rigor.
• Prefer diagrams or analogies when useful.
• If the student struggles, simplify the intuition instead of repeating formulas.

You are not a chatbot. 
You are a ruthless JEE mentor building top-rank thinking.
Whenever teaching physics, emphasize:
• dimensional analysis
• graph intuition
• limiting cases
• symmetry arguments
• conservation laws

Whenever teaching mathematics:
• geometric interpretation
• algebraic shortcuts
• calculus intuition

Whenever teaching chemistry:
• periodic trends
• molecular reasoning
• approximation tricks used in JEE Advanced.
If the student asks for shortcuts, teach time-saving tricks used by AIR <100 rankers.`;

const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatContainer = document.getElementById("chatContainer");
const sendButton = document.getElementById("sendButton");

const conversationHistory = [];
let cachedModelNames = null;

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const message = userInput.value.trim();
  if (!message) return;

  appendMessage("user", message);
  userInput.value = "";
  adjustTextareaHeight();

  sendButton.disabled = true;
  const typingNode = appendMessage("ai", "DOOMSBOT is thinking...", true);

  try {
    const reply = await fetchGeminiResponse(message);
    typingNode.remove();
    appendMessage("ai", reply || "I couldn't generate a response. Please try again.");
  } catch (error) {
    typingNode.remove();
    appendMessage("ai", formatErrorForUser(error));
    console.error(error);
  } finally {
    sendButton.disabled = false;
    userInput.focus();
  }
});

userInput.addEventListener("input", adjustTextareaHeight);
userInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    chatForm.requestSubmit();
  }
});

function appendMessage(role, text, isTyping = false) {
  const messageEl = document.createElement("article");
  messageEl.className = `message ${role}`;

  const bubbleEl = document.createElement("div");
  bubbleEl.className = "bubble";

  if (isTyping) bubbleEl.classList.add("typing");

  bubbleEl.textContent = text;
  messageEl.appendChild(bubbleEl);
  chatContainer.appendChild(messageEl);
  chatContainer.scrollTop = chatContainer.scrollHeight;
  return messageEl;
}

function adjustTextareaHeight() {
  userInput.style.height = "auto";
  userInput.style.height = `${Math.min(userInput.scrollHeight, 170)}px`;
}

function buildRequestBody() {
  return {
    systemInstruction: {
      parts: [{ text: SYSTEM_PROMPT }]
    },
    contents: conversationHistory,
    generationConfig: {
      temperature: 0.6,
      topP: 0.9,
      topK: 40,
      maxOutputTokens: 2048
    }
  };
}

async function fetchGeminiResponse(userMessage) {
  conversationHistory.push({ role: "user", parts: [{ text: userMessage }] });

  const requestBody = buildRequestBody();
  const usableModels = await getUsableModels();
  const errors = [];

  for (const modelName of usableModels) {
    const url = `${API_BASE}/models/${modelName}:generateContent?key=${API_KEY}`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message = data?.error?.message || `HTTP ${response.status}`;
        errors.push(`${modelName}: ${message}`);
        continue;
      }

      const answer =
        data?.candidates?.[0]?.content?.parts?.map((part) => part.text).join("\n") ||
        "No valid response received from the model.";

      conversationHistory.push({ role: "model", parts: [{ text: answer }] });
      return answer;
    } catch (error) {
      errors.push(`${modelName}: ${error?.message || "Network error"}`);
    }
  }

  if (conversationHistory[conversationHistory.length - 1]?.role === "user") {
    conversationHistory.pop();
  }

  throw new Error(errors.join(" | ") || "Unable to connect to Gemini.");
}

async function getUsableModels() {
  if (cachedModelNames) return cachedModelNames;

  try {
    const response = await fetch(`${MODELS_URL}?key=${API_KEY}`);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message = data?.error?.message || `HTTP ${response.status}`;
      throw new Error(message);
    }

    const models = Array.isArray(data?.models) ? data.models : [];
    const supportsGenerate = models
      .filter((model) => Array.isArray(model.supportedGenerationMethods))
      .filter((model) => model.supportedGenerationMethods.includes("generateContent"))
      .map((model) => model.name.replace("models/", ""));

    cachedModelNames = buildModelPriorityList(supportsGenerate);
    if (!cachedModelNames.length) throw new Error("No compatible models found for generateContent.");

    return cachedModelNames;
  } catch (error) {
    // Fallback list when ListModels is blocked by policy/network.
    cachedModelNames = [...PREFERRED_MODELS];
    return cachedModelNames;
  }
}

function buildModelPriorityList(availableModelNames) {
  const availableSet = new Set(availableModelNames);
  const ranked = [];

  for (const preferred of PREFERRED_MODELS) {
    if (availableSet.has(preferred)) ranked.push(preferred);
  }

  for (const modelName of availableModelNames) {
    if (!ranked.includes(modelName) && modelName.includes("gemini")) {
      ranked.push(modelName);
    }
  }

  return ranked;
}

function formatErrorForUser(error) {
  const rawMessage = error?.message || "Unknown error.";

  if (rawMessage.includes("API key not valid")) {
    return "API key is invalid. Please generate a valid Gemini API key and replace API_KEY in script.js.";
  }

  if (rawMessage.includes("API_KEY_HTTP_REFERRER_BLOCKED") || rawMessage.toLowerCase().includes("referer")) {
    return "This domain is blocked by API key restrictions. In Google AI Studio, allow this website domain in API key HTTP referrers.";
  }

  if (rawMessage.toLowerCase().includes("quota") || rawMessage.includes("429")) {
    return "Gemini quota limit reached. Please try again later or use a different API key/project.";
  }

  if (rawMessage.includes("not found for API version") || rawMessage.includes("supported methods")) {
    return "Your API project doesn't support one or more Gemini models yet. I automatically try multiple models—please verify your project has an enabled Gemini model in Google AI Studio.";
  }

  return `Gemini request failed: ${rawMessage}`;
}
