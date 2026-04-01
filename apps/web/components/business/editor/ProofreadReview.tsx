"use client";

import { useState, useCallback } from "react";

export interface ProofreadItem {
  original: string;
  corrected: string;
  reason: string;
}

interface ProofreadReviewProps {
  items: ProofreadItem[];
  content: string;
  onApply: (original: string, corrected: string) => void;
  onClose: () => void;
}

export default function ProofreadReview({
  items,
  content,
  onApply,
  onClose,
}: ProofreadReviewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [appliedCount, setAppliedCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);

  const isFinished = currentIndex >= items.length;
  const current = items[currentIndex] ?? null;

  // 原文がドキュメント内に存在するか確認
  const existsInDoc = current ? content.includes(current.original) : false;

  const handleApply = useCallback(() => {
    if (!current || !existsInDoc) return;
    onApply(current.original, current.corrected);
    setAppliedCount((c) => c + 1);
    setCurrentIndex((i) => i + 1);
  }, [current, existsInDoc, onApply]);

  const handleSkip = useCallback(() => {
    setSkippedCount((c) => c + 1);
    setCurrentIndex((i) => i + 1);
  }, []);

  const handleApplyAll = useCallback(() => {
    // 残りの全てを適用（存在するもののみ）
    for (let i = currentIndex; i < items.length; i++) {
      const item = items[i];
      if (content.includes(item.original)) {
        onApply(item.original, item.corrected);
      }
    }
    setAppliedCount((c) => c + (items.length - currentIndex));
    setCurrentIndex(items.length);
  }, [currentIndex, items, content, onApply]);

  if (items.length === 0) {
    return (
      <div className="proofread-review">
        <div className="proofread-complete">
          <span className="proofread-complete-icon">&#10003;</span>
          <span>校正箇所は見つかりませんでした</span>
        </div>
        <div className="proofread-footer">
          <button type="button" className="editor-ai-action-btn" onClick={onClose}>
            閉じる
          </button>
        </div>
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="proofread-review">
        <div className="proofread-complete">
          <span className="proofread-complete-icon">&#10003;</span>
          <span>
            校正完了 &#8212; {appliedCount}件 修正 / {skippedCount}件 スキップ
          </span>
        </div>
        <div className="proofread-footer">
          <button type="button" className="editor-ai-action-btn" onClick={onClose}>
            閉じる
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="proofread-review">
      {/* ヘッダー: 進捗 */}
      <div className="proofread-header">
        <span className="proofread-progress">
          校正 {currentIndex + 1} / {items.length}
        </span>
        <span className="proofread-stats">
          修正 {appliedCount} &#183; スキップ {skippedCount}
        </span>
      </div>

      {/* 校正内容 */}
      <div className="proofread-diff">
        <div className="proofread-diff-row">
          <span className="proofread-diff-label proofread-diff-label-del">原文</span>
          <span className="proofread-diff-text proofread-diff-del">{current?.original}</span>
        </div>
        <div className="proofread-diff-row">
          <span className="proofread-diff-label proofread-diff-label-ins">修正</span>
          <span className="proofread-diff-text proofread-diff-ins">{current?.corrected}</span>
        </div>
        <div className="proofread-reason">
          {current?.reason}
        </div>
      </div>

      {/* 原文が見つからない場合の警告 */}
      {!existsInDoc && (
        <div className="proofread-warning">
          該当テキストがドキュメント内に見つかりません（既に修正済みの可能性があります）
        </div>
      )}

      {/* アクションボタン */}
      <div className="proofread-footer">
        <button
          type="button"
          className="editor-ai-action-btn editor-ai-action-primary"
          onClick={handleApply}
          disabled={!existsInDoc}
        >
          修正する
        </button>
        <button
          type="button"
          className="editor-ai-action-btn"
          onClick={handleSkip}
        >
          スキップ
        </button>
        <button
          type="button"
          className="editor-ai-action-btn proofread-apply-all"
          onClick={handleApplyAll}
        >
          残りを全て修正
        </button>
        <button
          type="button"
          className="editor-ai-action-btn"
          onClick={onClose}
          style={{ marginLeft: "auto" }}
        >
          終了
        </button>
      </div>
    </div>
  );
}
