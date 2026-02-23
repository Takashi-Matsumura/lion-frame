/**
 * ベースインポーター - フレーム機能
 * 汎用的なデータインポート機能のベースクラス
 */

/**
 * インポーター設定
 */
export interface ImporterConfig {
  maxFileSize: number;
  requiredColumns?: string[];
}

/**
 * インポート結果
 */
export interface ImportResult {
  success: boolean;
  message: string;
  data?: any;
  statistics?: {
    totalRecords: number;
    created: number;
    updated?: number;
    transferred?: number;
    promoted?: number;
    retired?: number;
    skipped?: number;
    errors?: number;
  };
}

/**
 * ベースインポータークラス
 * 各モジュール固有のインポーターはこのクラスを継承して実装する
 */
export abstract class BaseImporter<TRow = any, TProcessed = any> {
  constructor(protected config: ImporterConfig) {}

  /**
   * データを処理（各モジュールで実装）
   */
  abstract processData(rows: TRow[]): TProcessed[];

  /**
   * データベースにインポート（各モジュールで実装）
   */
  abstract importToDatabase(data: TProcessed[]): Promise<ImportResult>;
}
