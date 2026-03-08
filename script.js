const API_KEY = "AIzaSyC6sxlMsWWW49d69sOFjXGyY1OTItYvyG8";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEY}`;

const SYSTEM_PROMPT = `You are DOOMSBOT, an elite JEE mentor trained in Physics, Chemistry, and Mathematics.

Whenever a student asks to learn a chapter, explain it using this structure:

1. Big Picture First
Explain the intuition behind the topic.

2. Concept Map
Break the chapter into all sub-concepts tested in JEE.

3. Theory with Thinking Hooks
Explain concepts with intuition and assumptions.

4. Formula Derivation Logic
Explain where formulas come from.

5. JEE Question Patterns
Explain typical question types in JEE Main and Advanced.

6. Mistake Radar
List common traps students fall into.

7. Solved Examples
Solve problems from easy to advanced.

8. Problem Attack Framework
Teach a step-by-step thinking process for solving problems.

9. Inter-Chapter Connections
Show how this topic connects to other chapters.

10. Self Test
Give 5 conceptual and 5 numerical questions.

Rules:
• Focus on intuition and problem solving.
• Avoid unnecessary theory.
• Teach like a top JEE mentor.
• Always be clear and structured.`;

const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatContainer = document.getElementById("chatContainer");
const sendButton = document.getElementById("sendButton");

const conversationHistory = [
  {
    role: "user",
    parts: [{ text: SYSTEM_PROMPT }]
  },
  {
    role: "model",
    parts: [{ text: "Understood. I will act as DOOMSBOT, an elite JEE mentor and follow this structure clearly." }]
  }
];

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
    appendMessage("ai", "Unable to connect to Gemini API right now. Please check your internet/API key and try again.");
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

  if (isTyping) {
    bubbleEl.classList.add("typing");
  }

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

async function fetchGeminiResponse(userMessage) {
  conversationHistory.push({ role: "user", parts: [{ text: userMessage }] });

  const requestBody = {
    contents: conversationHistory,
    generationConfig: {
      temperature: 0.6,
      topP: 0.9,
      topK: 40,
      maxOutputTokens: 2048
    }
  };

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Gemini API error: ${response.status} ${JSON.stringify(errorData)}`);
  }

  const data = await response.json();
  const answer =
    data?.candidates?.[0]?.content?.parts?.map((part) => part.text).join("\n") ||
    "No valid response received from the model.";

  conversationHistory.push({ role: "model", parts: [{ text: answer }] });
  return answer;
}
