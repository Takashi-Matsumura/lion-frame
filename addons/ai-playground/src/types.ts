// LLM Provider Types
export type LLMProviderType = 'lm-studio' | 'ollama' | 'llama-cpp';

export interface LLMConfig {
  provider: LLMProviderType;
  baseUrl: string;
  model: string;
  apiKey?: string;  // LLM API キー（オプション）
  contextSize?: number;  // コンテキストウィンドウサイズ（接続テストで取得）
}

export interface LLMGenerateOptions {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface LLMResponse {
  content: string;
  error?: string;
}

// Chat Mode Types
export type ChatMode = 'explain' | 'idea' | 'search' | 'rag';

export interface ChatModeInfo {
  id: ChatMode;
  name: string;
  description: string;
  icon: string;
}

export const CHAT_MODES: ChatModeInfo[] = [
  {
    id: 'explain',
    name: 'やさしく説明',
    description: 'わかりやすく説明',
    icon: 'book',
  },
  {
    id: 'idea',
    name: '企画アイデア',
    description: '企画・提案を支援',
    icon: 'lightbulb',
  },
  {
    id: 'search',
    name: '検索して要約',
    description: 'Web検索して要約',
    icon: 'search',
  },
  {
    id: 'rag',
    name: 'ナレッジ検索',
    description: 'ナレッジから回答',
    icon: 'database',
  },
];

// Provider Presets
export interface ProviderPreset {
  provider: LLMProviderType;
  name: string;
  baseUrl: string;
  defaultModel: string;
}

// プロバイダーごとの保存設定
export interface ProviderSettings {
  baseUrl: string;
  model: string;
  apiKey?: string;
  contextSize?: number;  // コンテキストウィンドウサイズ
}

// 全プロバイダーの設定を保存する型
export type AllProviderSettings = {
  [key in LLMProviderType]?: ProviderSettings;
};

export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    provider: 'lm-studio',
    name: 'LM Studio',
    baseUrl: 'http://localhost:1234/v1',
    defaultModel: 'local-model',
  },
  {
    provider: 'ollama',
    name: 'Ollama',
    baseUrl: 'http://localhost:11434/v1',
    defaultModel: 'llama3.2',
  },
  {
    provider: 'llama-cpp',
    name: 'llama.cpp',
    baseUrl: 'http://localhost:8080/v1',
    defaultModel: 'gemma3',
  },
];

// Search Types
export type SearchProviderType = 'brave' | 'duckduckgo';

export interface SearchConfig {
  provider: SearchProviderType;
  braveApiKey?: string;  // Brave Search API キー（オプション）
}

export const DEFAULT_SEARCH_CONFIG: SearchConfig = {
  provider: 'duckduckgo',
  braveApiKey: '',
};

// RAG Config Types
export interface RAGConfig {
  baseUrl: string;
  category: string;
}

export const DEFAULT_RAG_CONFIG: RAGConfig = {
  baseUrl: 'http://localhost:8000',
  category: 'ai-playground',
};

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface SearchResponse {
  results: SearchResult[];
  error?: string;
}

// Message Types
export interface Message {
  // メッセージごとの一意 ID。React の key に利用する。
  // 生成は `lib/id.ts` の `generateId()` を使う (Issue #49)。
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: SearchResult[];
  ragSources?: RAGContext[];
}

// RAG Types
export interface RAGContext {
  content: string;
  metadata: {
    filename: string;
    chunk_index: number;
    total_chunks: number;
    category?: string;
  };
  score: number;
}

export interface RAGQueryResponse {
  context: RAGContext[];
  query: string;
  retrieved_count: number;
}

// API Request Types
export interface ChatRequest {
  message: string;
  mode: ChatMode | null;
  llmConfig: LLMConfig;
  searchResults?: SearchResult[];
  ragContext?: RAGContext[];
  history?: Message[];
  systemPrompts?: SystemPrompts;
}

// System Prompts Types
export interface SystemPrompts {
  common: string;       // 共通部分
  explain: string;      // やさしく説明モード追加部分
  idea: string;         // 企画アイデアモード追加部分
  search: string;       // 検索して要約モード追加部分
  rag: string;          // ナレッジ検索モード追加部分
}

// Suggestion Prompts Types (Issue #44: ホストアプリからモード別サンプルを差し替え可能に)
//
// `free` はモード未選択時のサンプル。`ChatMode` 各モード（explain/idea/search/rag）
// と "free" の和集合をキーとする。すべてのモードを必ず提供する必要はない（差分マージ）。
export type SuggestionsLanguage = "en" | "ja";
export type SuggestionMap = Partial<Record<ChatMode | "free", readonly string[]>>;
export type Suggestions = Record<SuggestionsLanguage, SuggestionMap>;
export type SuggestionsOverride = Partial<Record<SuggestionsLanguage, SuggestionMap>>;

export const DEFAULT_SUGGESTIONS: Suggestions = {
  ja: {
    free: ["今日の天気について教えて", "おすすめの本を紹介して", "面白い雑学を教えて"],
    explain: ["プログラミングの「変数」って何？", "AIと機械学習の違いを教えて", "インターネットの仕組み"],
    idea: ["高校生向けの学習アプリ", "社内コミュニケーション改善", "新入社員研修プログラム"],
    search: ["2024年のAI技術トレンド", "リモートワークのベストプラクティス"],
    rag: ["ナレッジベースの内容を教えて"],
  },
  en: {
    free: ["Tell me about today's weather", "Recommend a good book", "Share an interesting fact"],
    explain: ["What is a 'variable' in programming?", "Difference between AI and ML", "How does the internet work?"],
    idea: ["Learning app for students", "Improving team communication", "New employee training program"],
    search: ["AI technology trends 2024", "Remote work best practices"],
    rag: ["Tell me about the knowledge base"],
  },
};

// 既定のサンプルにホストアプリの override をモード単位でマージする。
// override 側の配列が空でも「明示的に空にしたい」意図として尊重する。
export function resolveSuggestions(
  language: SuggestionsLanguage,
  modeKey: ChatMode | "free",
  override: SuggestionsOverride | undefined,
): readonly string[] {
  const overridden = override?.[language]?.[modeKey];
  if (overridden !== undefined) return overridden;
  return DEFAULT_SUGGESTIONS[language][modeKey] ?? [];
}

// Generation Metrics Types
export interface GenerationMetrics {
  // コンテキスト情報
  contextWindowSize: number;      // コンテキストウィンドウサイズ（トークン）
  inputTokens: number;            // 入力トークン数（推定）
  outputTokens: number;           // 出力トークン数（推定）
  contextUsagePercent: number;    // コンテキスト使用率（%）

  // 生成速度
  tokensPerSecond: number;        // 出力トークン/秒
  totalTimeMs: number;            // 総生成時間（ミリ秒）

  // ステータス
  isGenerating: boolean;          // 生成中かどうか
}
