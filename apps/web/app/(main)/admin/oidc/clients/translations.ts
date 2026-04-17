export const oidcClientsTranslations = {
  en: {
    title: "OIDC Clients",
    description:
      "Manage OpenID Connect clients that use LionFrame as an identity provider. Access the discovery endpoint at /api/oidc/.well-known/openid-configuration.",

    // Actions
    createButton: "Register new client",
    editButton: "Edit",
    deleteButton: "Delete",
    regenerateSecretButton: "Regenerate secret",

    // List
    clientId: "Client ID",
    name: "Name",
    redirectUris: "Redirect URIs",
    scopes: "Allowed scopes",
    roles: "Allowed roles",
    status: "Status",
    enabled: "Enabled",
    disabled: "Disabled",
    autoApprove: "Auto-approved",
    createdAt: "Created",
    empty: "No clients registered yet",

    // Form
    formCreateTitle: "Register new OIDC client",
    formEditTitle: "Edit OIDC client",
    nameLabel: "Display name",
    namePlaceholder: "My Internal App",
    descriptionLabel: "Description (optional)",
    descriptionPlaceholder: "Internal project management app",
    redirectUrisLabel: "Redirect URIs",
    redirectUrisPlaceholder: "https://app.example.lan/callback",
    redirectUrisHint:
      "One URI per line. Must match exactly (full URL, no wildcards).",
    scopesLabel: "Allowed scopes",
    scopesHint:
      "Space-separated. Requests for scopes not in this list are rejected.",
    rolesLabel: "Allowed roles",
    rolesHint: "Users with roles outside this set are denied.",
    autoApproveLabel: "Skip consent screen (auto-approve)",
    autoApproveHint:
      "For trusted internal applications. A consent record is still created for audit.",
    enabledLabel: "Enabled",
    saveButton: "Save",
    cancelButton: "Cancel",

    // Secret reveal
    secretRevealTitle: "Client credentials",
    secretRevealDescription:
      "Copy these credentials now. The client secret will not be shown again.",
    secretClientIdLabel: "Client ID",
    secretClientSecretLabel: "Client Secret",
    secretCopyButton: "Copy",
    secretCopied: "Copied",
    secretCloseButton: "I've saved these credentials",

    // Regenerate
    regenerateConfirmTitle: "Regenerate client secret?",
    regenerateConfirmDescription:
      "The existing secret will stop working immediately. Applications using this client must be updated.",
    regenerateConfirmButton: "Regenerate",

    // Delete
    deleteConfirmTitle: "Delete OIDC client?",
    deleteConfirmDescription:
      "All issued tokens and consents will also be deleted. This cannot be undone.",
    deleteConfirmButton: "Delete",

    // Toasts
    createSuccess: "OIDC client registered",
    updateSuccess: "OIDC client updated",
    deleteSuccess: "OIDC client deleted",
    regenerateSuccess: "Client secret regenerated",
    loadError: "Failed to load OIDC clients",
    createError: "Failed to create OIDC client",
    updateError: "Failed to update OIDC client",
    deleteError: "Failed to delete OIDC client",
    regenerateError: "Failed to regenerate secret",
    validationError: "Please fill in all required fields",
  },
  ja: {
    title: "OIDC クライアント",
    description:
      "LionFrame を認証基盤として利用するアプリ（クライアント）を管理します。Discovery エンドポイントは /api/oidc/.well-known/openid-configuration です。",

    createButton: "新規クライアント登録",
    editButton: "編集",
    deleteButton: "削除",
    regenerateSecretButton: "シークレット再生成",

    clientId: "クライアント ID",
    name: "名称",
    redirectUris: "リダイレクト URI",
    scopes: "許可スコープ",
    roles: "許可ロール",
    status: "状態",
    enabled: "有効",
    disabled: "無効",
    autoApprove: "同意画面スキップ",
    createdAt: "登録日時",
    empty: "登録済みクライアントはありません",

    formCreateTitle: "OIDC クライアントを新規登録",
    formEditTitle: "OIDC クライアントを編集",
    nameLabel: "表示名",
    namePlaceholder: "社内管理アプリ",
    descriptionLabel: "説明（任意）",
    descriptionPlaceholder: "社内プロジェクト管理アプリ",
    redirectUrisLabel: "リダイレクト URI",
    redirectUrisPlaceholder: "https://app.example.lan/callback",
    redirectUrisHint:
      "1 行 1 URI。完全一致で比較されるため、フルパスで指定してください（ワイルドカード不可）。",
    scopesLabel: "許可スコープ",
    scopesHint:
      "スペース区切り。ここに含まれないスコープを要求された場合は拒否されます。",
    rolesLabel: "許可ロール",
    rolesHint: "この範囲外のロールのユーザは認証時に拒否されます。",
    autoApproveLabel: "同意画面をスキップ（自動承認）",
    autoApproveHint:
      "信頼できる社内アプリ向け。監査用に同意レコードは作成されます。",
    enabledLabel: "有効",
    saveButton: "保存",
    cancelButton: "キャンセル",

    secretRevealTitle: "クライアント認証情報",
    secretRevealDescription:
      "この画面を閉じるとクライアントシークレットは再表示できません。今コピーしてください。",
    secretClientIdLabel: "クライアント ID",
    secretClientSecretLabel: "クライアントシークレット",
    secretCopyButton: "コピー",
    secretCopied: "コピーしました",
    secretCloseButton: "認証情報を保存しました",

    regenerateConfirmTitle: "シークレットを再生成しますか？",
    regenerateConfirmDescription:
      "現在のシークレットは即座に使えなくなります。このクライアントを利用しているアプリの設定更新が必要です。",
    regenerateConfirmButton: "再生成する",

    deleteConfirmTitle: "OIDC クライアントを削除しますか？",
    deleteConfirmDescription:
      "発行済みのトークンと同意記録もすべて削除されます。この操作は取り消せません。",
    deleteConfirmButton: "削除する",

    createSuccess: "OIDC クライアントを登録しました",
    updateSuccess: "OIDC クライアントを更新しました",
    deleteSuccess: "OIDC クライアントを削除しました",
    regenerateSuccess: "シークレットを再生成しました",
    loadError: "OIDC クライアント一覧の取得に失敗しました",
    createError: "OIDC クライアントの登録に失敗しました",
    updateError: "OIDC クライアントの更新に失敗しました",
    deleteError: "OIDC クライアントの削除に失敗しました",
    regenerateError: "シークレットの再生成に失敗しました",
    validationError: "必須項目を入力してください",
  },
};

export type OidcClientsTranslation =
  (typeof oidcClientsTranslations)["en"];
