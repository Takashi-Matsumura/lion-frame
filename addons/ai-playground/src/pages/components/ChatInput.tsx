'use client';

import { useState, useRef, useImperativeHandle, forwardRef, useMemo } from 'react';
import type { ChatMode, SearchConfig } from '../../types';
import { CHAT_MODES } from '../../types';
import { ModeIcon } from './Icons';

interface ChatInputProps {
  onSubmit: (message: string, mode: ChatMode | null) => void;
  isLoading: boolean;
  onCancel?: () => void;
  ragEnabled?: boolean;
  searchConfig?: SearchConfig;
}

export interface ChatInputRef {
  focus: () => void;
}

export const ChatInput = forwardRef<ChatInputRef, ChatInputProps>(function ChatInput(
  { onSubmit, isLoading, onCancel, ragEnabled = false, searchConfig },
  ref
) {
  const isBraveEnabled = searchConfig?.provider === 'brave' && !!searchConfig?.braveApiKey;
  const [message, setMessage] = useState('');
  const [mode, setMode] = useState<ChatMode>('explain');
  const [modeEnabled, setModeEnabled] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const availableModes = useMemo(() => {
    return CHAT_MODES.filter((m) => m.id !== 'rag' || ragEnabled);
  }, [ragEnabled]);

  const effectiveMode = useMemo(() => {
    if (!ragEnabled && mode === 'rag') return 'explain' as ChatMode;
    return mode;
  }, [ragEnabled, mode]);

  useImperativeHandle(ref, () => ({ focus: () => textareaRef.current?.focus() }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;
    onSubmit(message.trim(), modeEnabled ? effectiveMode : null);
    setMessage('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      if (!message.trim() || isLoading) return;
      onSubmit(message.trim(), modeEnabled ? effectiveMode : null);
      setMessage('');
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* モード選択 */}
      <div className="flex-shrink min-h-0 mb-4 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-2 flex-shrink-0">
          <label className="text-sm font-medium text-foreground">モードを選択</label>
          <button
            type="button"
            onClick={() => setModeEnabled(!modeEnabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              modeEnabled ? 'bg-primary' : 'bg-muted'
            }`}
          >
            <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${modeEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
        {modeEnabled ? (
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="space-y-1.5">
              {availableModes.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  title={m.description}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg border transition-all ${
                    effectiveMode === m.id
                      ? 'border-primary bg-primary/5'
                      : 'border-input hover:border-primary/40'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className={`flex-shrink-0 ${
                      m.id === 'search' && isBraveEnabled
                        ? 'text-orange-500 dark:text-orange-400'
                        : effectiveMode === m.id
                          ? 'text-primary'
                          : 'text-muted-foreground'
                    }`}>
                      <ModeIcon icon={m.icon} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className={`font-medium text-xs leading-tight truncate ${effectiveMode === m.id ? 'text-primary' : 'text-foreground'}`}>
                        {m.name}
                      </div>
                      <div className="text-[10px] leading-tight text-muted-foreground truncate">
                        {m.description}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="px-3 py-2 rounded-lg border border-input bg-muted text-sm text-muted-foreground">
            フリーチャットモード（モードなし）
          </div>
        )}
      </div>

      {/* 入力フォーム */}
      <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col">
        <label className="block text-sm font-medium text-foreground mb-2 flex-shrink-0">
          {!modeEnabled && 'メッセージを入力'}
          {modeEnabled && mode === 'explain' && '何について知りたい？'}
          {modeEnabled && mode === 'idea' && '企画のテーマ・条件は？'}
          {modeEnabled && mode === 'search' && '何を調べる？'}
          {modeEnabled && mode === 'rag' && 'ナレッジベースに質問'}
        </label>
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            !modeEnabled
              ? '何でも聞いてください...'
              : mode === 'explain'
              ? '例: プログラミングの「変数」って何？'
              : mode === 'idea'
              ? '例: 高校生向けの学習アプリを作りたい'
              : mode === 'search'
              ? '例: 2024年のAI技術トレンド'
              : '例: このアプリについて教えて'
          }
          className="flex-1 min-h-[80px] p-4 border border-input rounded-lg bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          disabled={isLoading}
        />
        {isLoading ? (
          <button
            type="button"
            onClick={onCancel}
            className="mt-3 w-full py-2.5 px-4 border border-input bg-card hover:bg-muted text-foreground font-medium rounded-lg transition-colors flex items-center justify-center gap-2 flex-shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            中断する
          </button>
        ) : (
          <button
            type="submit"
            disabled={!message.trim()}
            className="mt-3 w-full py-2.5 px-4 bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground text-primary-foreground font-medium rounded-lg transition-colors disabled:cursor-not-allowed flex-shrink-0"
          >
            質問する
          </button>
        )}
      </form>

      {/* 注意書き */}
      <p className="mt-3 text-xs text-muted-foreground text-center flex items-center justify-center gap-1 whitespace-nowrap flex-shrink-0">
        <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        学習支援ツールです。最終判断は人が行ってください
      </p>
    </div>
  );
});
