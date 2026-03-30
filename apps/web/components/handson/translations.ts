/**
 * ハンズオンモジュール 翻訳定義
 *
 * 全コンポーネントの翻訳を名前空間付きで集約。
 */

export const handsonTranslations = {
  en: {
    // --- common ---
    common: {
      seat: "Seat",
      section: "Section",
      resolve: "Resolved",
      instructor: "Instructor",
      active: "Active",
      rehearsal: "Rehearsal",
      seats: "seats",
      sending: "Sending...",
      ok: "OK",
      loadingContent: "Loading content...",
      failedToLoadContent: "Failed to load content",
      leaveSeat: "Leave seat",
      connectionError: "Failed to fetch data. Connection may be unstable.",
      retry: "Retry",
    },

    // --- client (session selection for trainees) ---
    client: {
      noSession: "No active session",
      noSessionDesc:
        "No training session is currently running. Please wait for an instructor to start one.",
      selectSession: "Select a Session",
      selectSessionDesc:
        "Multiple sessions are available. Please select the one you want to join.",
      join: "Join",
    },

    // --- instructor view ---
    instructor: {
      progressTab: "Progress",
      previewTab: "Content Preview",
      analyticsTab: "Analytics",
      selectSession: "Select a session from the list above to view details.",
    },

    // --- session manager ---
    sessionManager: {
      createSession: "Create Session",
      sessionTitle: "Session Title",
      sessionDate: "Date",
      selectDocument: "Select Document",
      maxSeats: "Max Seats",
      create: "Create",
      cancel: "Cancel",
      noDocuments:
        "No published documents found. Create and publish a document in the Editor first.",
      titlePlaceholder: "e.g. Git Hands-on Day 1",
      ended: "Ended",
      ready: "Ready",
      activate: "Start",
      end: "End",
      delete: "Delete",
      startRehearsal: "Rehearsal",
      endRehearsal: "End Rehearsal",
      confirmEnd: "Are you sure you want to end this session?",
      confirmDelete: "Are you sure you want to delete this session?",
      confirmEndRehearsal:
        "End rehearsal? Rehearsal data (participants/logs) will be cleared.",
      noSessions: "No sessions yet. Create one to get started.",
      sessions: "Sessions",
      date: "Date",
      title: "Title",
      status: "Status",
      actions: "Actions",
      participants: "participants",
    },

    // --- progress matrix ---
    progressMatrix: {
      noParticipants:
        "No participants have joined yet. Waiting for trainees to connect...",
      legend: { ok: "OK", error: "Error", none: "Not reported" },
      helpAlert: "Help requested",
    },

    // --- analytics ---
    analytics: {
      loading: "Loading analytics...",
      error: "Failed to load analytics",
      participants: "Participants",
      duration: "Duration",
      avgCompletion: "Avg Completion",
      totalErrors: "Errors",
      helpRequests: "Help Requests",
      minutes: "min",
      participantTable: "Participant Progress",
      name: "Name",
      errors: "Errors",
      help: "Help",
      completion: "Completion",
      errorHotspots: "Error Hotspots",
      command: "Command",
      errorCount: "Errors",
      okCount: "OK",
      helpBySection: "Help Requests by Section",
      count: "Count",
      instructorTimeline: "Instructor Timeline",
      noErrors: "No errors recorded",
      noHelp: "No help requests recorded",
      noTimeline: "No instructor checkpoints recorded",
      lastActivity: "Last Activity",
      chartView: "Chart",
      rawDataView: "Data",
      time: "Time",
      type: "Type",
      participant: "Participant",
      detail: "Detail",
      typeLabels: {
        SESSION_JOIN: "Join",
        SESSION_LEAVE: "Leave",
        COMMAND_OK: "OK",
        COMMAND_ERROR: "Error",
        CHECKPOINT_COMPLETE: "Checkpoint",
        HELP_REQUEST: "Help Request",
        HELP_RESOLVED: "Help Resolved",
        INSTRUCTOR_CHECKPOINT: "Instructor Check",
      },
    },

    // --- markdown renderer ---
    markdownRenderer: {
      clickToExpand: "Click to expand",
      copied: "Copied!",
      copy: "Copy",
      column: "Column: ",
      checked: "Checked",
      checkpoint: "Checkpoint",
    },

    // --- command status buttons ---
    commandButtons: {
      error: "Error",
      resolved: "Resolved",
      errorReported: "Error reported",
    },

    // --- seat selection dialog ---
    seatSelection: {
      title: "Enter your seat number",
      description: "Enter a number between 1 and {max}",
      namePlaceholder: "Your name",
      nameLabel: "Display name",
      start: "Join Session",
      back: "Back",
      error: "Please enter a valid seat number (1-{max})",
      nameError: "Please enter your name",
    },

    // --- help floating button ---
    helpButton: {
      help: "I need help",
      sent: "Help requested",
    },

    // --- help request panel ---
    helpPanel: {
      noRequests: "No help requests at the moment.",
      helpRequests: "Help Requests",
    },

    // --- section checkpoint ---
    checkpoint: {
      done: "Done",
      completed: "Completed",
    },
  },

  ja: {
    // --- common ---
    common: {
      seat: "座席",
      section: "セクション",
      resolve: "対応済み",
      instructor: "講師",
      active: "開催中",
      rehearsal: "リハーサル",
      seats: "席",
      sending: "送信中...",
      ok: "OK",
      loadingContent: "教材を読み込み中...",
      failedToLoadContent: "教材を読み込めませんでした",
      leaveSeat: "退出する",
      connectionError: "データの取得に失敗しました。接続が不安定な可能性があります。",
      retry: "再試行",
    },

    // --- client ---
    client: {
      noSession: "アクティブなセッションはありません",
      noSessionDesc:
        "現在、研修セッションが開催されていません。講師がセッションを開始するまでお待ちください。",
      selectSession: "セッションを選択",
      selectSessionDesc:
        "参加可能なセッションが複数あります。参加するセッションを選択してください。",
      join: "参加",
    },

    // --- instructor view ---
    instructor: {
      progressTab: "進捗",
      previewTab: "教材プレビュー",
      analyticsTab: "分析",
      selectSession: "上のリストからセッションを選択してください。",
    },

    // --- session manager ---
    sessionManager: {
      createSession: "セッション作成",
      sessionTitle: "セッション名",
      sessionDate: "開催日",
      selectDocument: "教材ドキュメント",
      maxSeats: "最大座席数",
      create: "作成",
      cancel: "キャンセル",
      noDocuments:
        "公開済みドキュメントがありません。先にエディタでドキュメントを作成・公開してください。",
      titlePlaceholder: "例: Git ハンズオン Day 1",
      ended: "終了",
      ready: "準備中",
      activate: "開始",
      end: "終了",
      delete: "削除",
      startRehearsal: "リハーサル",
      endRehearsal: "リハーサル終了",
      confirmEnd: "このセッションを終了しますか？",
      confirmDelete: "このセッションを削除しますか？",
      confirmEndRehearsal:
        "リハーサルを終了しますか？リハーサルデータ（参加者・ログ）はクリアされます。",
      noSessions: "セッションがありません。作成してください。",
      sessions: "セッション",
      date: "開催日",
      title: "セッション名",
      status: "状態",
      actions: "操作",
      participants: "名参加",
    },

    // --- progress matrix ---
    progressMatrix: {
      noParticipants:
        "参加者がまだいません。受講者の接続を待っています...",
      legend: { ok: "OK / できた", error: "エラー", none: "未報告" },
      helpAlert: "ヘルプ依頼",
    },

    // --- analytics ---
    analytics: {
      loading: "分析データを読み込み中...",
      error: "分析データの読み込みに失敗しました",
      participants: "参加者",
      duration: "所要時間",
      avgCompletion: "平均完了率",
      totalErrors: "エラー数",
      helpRequests: "ヘルプ数",
      minutes: "分",
      participantTable: "受講者別進捗",
      name: "名前",
      errors: "エラー",
      help: "ヘルプ",
      completion: "完了率",
      errorHotspots: "エラー多発箇所",
      command: "コマンド",
      errorCount: "エラー",
      okCount: "OK",
      helpBySection: "セクション別ヘルプ",
      count: "件",
      instructorTimeline: "講師タイムライン",
      noErrors: "エラーの記録がありません",
      noHelp: "ヘルプリクエストの記録がありません",
      noTimeline: "講師チェックポイントの記録がありません",
      lastActivity: "最終操作",
      chartView: "グラフ",
      rawDataView: "データ",
      time: "時刻",
      type: "種別",
      participant: "参加者",
      detail: "詳細",
      typeLabels: {
        SESSION_JOIN: "参加",
        SESSION_LEAVE: "退出",
        COMMAND_OK: "OK",
        COMMAND_ERROR: "エラー",
        CHECKPOINT_COMPLETE: "チェックポイント",
        HELP_REQUEST: "ヘルプ依頼",
        HELP_RESOLVED: "ヘルプ解決",
        INSTRUCTOR_CHECKPOINT: "講師チェック",
      },
    },

    // --- markdown renderer ---
    markdownRenderer: {
      clickToExpand: "クリックで展開",
      copied: "コピーしました",
      copy: "コピー",
      column: "コラム：",
      checked: "チェック済み",
      checkpoint: "チェックポイント",
    },

    // --- command status buttons ---
    commandButtons: {
      error: "エラーが出た",
      resolved: "解決した",
      errorReported: "エラーを報告しました",
    },

    // --- seat selection dialog ---
    seatSelection: {
      title: "座席番号を入力してください",
      description: "1〜{max}の番号を入力してください",
      namePlaceholder: "あなたの名前",
      nameLabel: "表示名",
      start: "セッションに参加",
      back: "戻る",
      error: "1〜{max}の番号を入力してください",
      nameError: "名前を入力してください",
    },

    // --- help floating button ---
    helpButton: {
      help: "助けてほしい",
      sent: "送信しました",
    },

    // --- help request panel ---
    helpPanel: {
      noRequests: "現在、ヘルプリクエストはありません。",
      helpRequests: "ヘルプリクエスト",
    },

    // --- section checkpoint ---
    checkpoint: {
      done: "できた",
      completed: "完了",
    },
  },
} as const;

export type HandsonTranslations = typeof handsonTranslations;
