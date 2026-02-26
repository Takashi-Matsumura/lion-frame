/**
 * Chat message in AI chat
 */
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  tokenCount?: number;
  orgContext?: boolean;
}

/**
 * Token usage statistics
 */
export interface TokenStats {
  inputTokens: number;
  outputTokens: number;
  contextWindow: number;
  tokensPerSecond: number;
  generationStartTime: number | null;
  lastOutputTokens: number;
}

/**
 * AI chat client component props
 */
export interface AIChatClientProps {
  language: "en" | "ja";
  userName: string;
}
