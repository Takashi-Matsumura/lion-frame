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
  tutorialDocId?: string;
  tutorialDocTitle?: string;
}

/**
 * Tutorial document (user-facing, without extractedText)
 */
export interface TutorialDocument {
  id: string;
  title: string;
  titleJa: string | null;
  description: string | null;
  descriptionJa: string | null;
  fileName: string;
  fileSize: number;
  pageCount: number;
  estimatedTokens: number;
  suggestedPrompts: { text: string; textJa?: string }[];
}

/**
 * Tutorial document detail (with extractedText and fileUrl for panel display)
 */
export interface TutorialDocumentDetail extends TutorialDocument {
  extractedText: string;
  fileUrl: string;
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
