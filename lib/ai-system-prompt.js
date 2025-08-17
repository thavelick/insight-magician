import { toolRegistry } from "./tool-registry.js";

// Generate system prompt dynamically from registered tools
export const SYSTEM_PROMPT = toolRegistry.generateSystemPrompt();
