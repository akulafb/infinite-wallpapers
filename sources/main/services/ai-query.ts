// Turns a natural-language wallpaper description into an effective web image
// search query using Glaze AI. Runs only on an explicit user action (setting a
// custom theme) and the result is cached in the theme config, so scheduled
// background rotations never trigger AI on their own.

import { generateText, glaze, GlazeAIError } from "@glaze/core/ai";
import { logger } from "@glaze/core/backend";

export interface RefineResult {
  query: string;
  blocked?: string; // GlazeAIError state when AI was unavailable
}

const SYSTEM = [
  "You convert a user's wallpaper wish into a concise web image-search query",
  "that finds real, high-resolution desktop wallpaper photos.",
  "Reply with ONLY the search query: 3 to 8 words, concrete visual nouns and",
  "style words, no quotes, no punctuation, no explanation.",
].join(" ");

export async function refineQuery(description: string): Promise<RefineResult> {
  const raw = description.trim();
  if (!raw) return { query: raw };

  try {
    const { text } = await generateText({
      model: glaze("fast"),
      system: SYSTEM,
      prompt: `Wish: ${raw}`,
      maxOutputTokens: 40,
    });
    const cleaned = text
      .split("\n")[0]
      .replace(/^["'`\s]+|["'`\s.]+$/g, "")
      .trim();
    return { query: cleaned || raw };
  } catch (error) {
    if (error instanceof GlazeAIError) {
      logger.info("ai-query", "AI unavailable, falling back to raw description", { state: error.state });
      return { query: raw, blocked: error.state };
    }
    logger.error("ai-query", "AI query refinement failed", error);
    return { query: raw };
  }
}
