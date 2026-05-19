// src/services/dialogService.ts

import { requestChatCompletion } from "./aiService";
import { SingleConversation } from "../types/singleConversation";
import { AiConfig } from "./aiService";

/**
 * Prompt template that forces the model to output a JSON object conforming to SingleConversation.
 * The JSON Schema is embedded in the system prompt to improve structural consistency.
 */
const SINGLE_CONVERSATION_PROMPT = `You are a parser that extracts a single‑conversation intent from the user-provided dialogue.
Return ONLY a JSON object that matches the following schema:

{
  "type": "object",
  "properties": {
    "uid": { "type": "string" },
    "messages": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "role": { "type": "string", "enum": ["user", "assistant"] },
          "content": { "type": "string" }
        },
        "required": ["role", "content"]
      }
    },
    "metadata": {
      "type": "object",
      "additionalProperties": true
    }
  },
  "required": ["uid", "messages"]
}

The input you receive is a raw conversation text. Extract the essential messages (maintaining order) and generate a unique uid (you may use a timestamp). If any information is missing, omit optional fields.

Do NOT wrap the JSON in any markdown code fences or additional text. Return the raw JSON string.`;

/**
 * Calls the AI service to extract a SingleConversation from a raw dialogue.
 * @param rawDialogue - The free‑form text entered by the user.
 * @param customConfig - Optional override for API configuration.
 * @returns Parsed SingleConversation object.
 * @throws Error when network fails or the model response cannot be parsed.
 */
export async function extractSingleConversation(
  rawDialogue: string,
  customConfig?: Partial<AiConfig>
): Promise<SingleConversation> {
  // Build the messages payload for the LLM.
  const messages = [
    { role: "system" as const, content: SINGLE_CONVERSATION_PROMPT },
    { role: "user" as const, content: rawDialogue },
  ];

  const response = await requestChatCompletion(messages, customConfig);

  let parsed: unknown;
  try {
    parsed = JSON.parse(response);
  } catch (e) {
    throw new Error("API Error: Response is not valid JSON – possible schema mismatch.");
  }

  // Minimal runtime validation to ensure required fields exist.
  const obj = parsed as Record<string, unknown>;
  if (!obj || typeof obj !== "object" || !obj.uid || !Array.isArray(obj.messages)) {
    throw new Error("API Error: Parsed object does not conform to SingleConversation schema.");
  }

  return obj as unknown as SingleConversation;
}

/**
 * Extracts a task/arrangement from a raw text message.
 * @param text - The content of the note or message.
 * @param customConfig - Optional config override.
 */
export async function extractArrangementFromText(
  text: string,
  timeContext?: string,
  customConfig?: Partial<AiConfig>
): Promise<{ hasArrangement: boolean; text: string } | null> {
  let prompt = `You are a scheduling assistant. Read the user's message and determine if it contains an action item, schedule, task, or appointment (e.g. "后天去一趟医院" or "明天下午3点开会").`;
  if (timeContext) {
    prompt += `\nReference Context: Current date and time is ${timeContext}. Translate relative terms like "明天", "后天", "周一" to exact dates/days if helpful in the final task description, but keep the description natural, e.g. "5.21号下午三点开会" or just "去医院".`;
  }
  prompt += `\nReturn ONLY a JSON object that matches this schema:
{
  "type": "object",
  "properties": {
    "hasArrangement": { "type": "boolean" },
    "text": { "type": "string", "description": "The cleaned up task/arrangement description, e.g. '去医院' or '开会'" }
  },
  "required": ["hasArrangement", "text"]
}
Do NOT wrap the JSON in any markdown code fences or additional text. Return the raw JSON string.`;

  try {
    const messages = [
      { role: "system" as const, content: prompt },
      { role: "user" as const, content: text },
    ];
    const response = await requestChatCompletion(messages, customConfig);
    const cleanResponse = response.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleanResponse);
    if (typeof parsed.hasArrangement === "boolean" && typeof parsed.text === "string") {
      return parsed;
    }
  } catch (e) {
    console.error("Failed to extract arrangement:", e);
  }
  return null;
}
