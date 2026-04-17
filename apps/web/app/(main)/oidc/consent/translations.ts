export const oidcConsentTranslations = {
  en: {
    title: "Authorize access",
    subtitle: "An application is requesting access to your account",
    clientLabel: "Application",
    scopeLabel: "Requested permissions",
    scopeHintOpenid: "Identify you",
    scopeHintProfile: "Your basic profile (name, role, 2FA state)",
    scopeHintEmail: "Your email address",
    scopeHintOther: "Additional information",
    approveButton: "Approve",
    denyButton: "Deny",
    sessionExpired: "Your authorization session has expired. Please start over.",
    sessionExpiredBack: "Go back",
    errorApprove: "Failed to complete authorization",
  },
  ja: {
    title: "アプリへのアクセスを承認",
    subtitle: "以下のアプリケーションがあなたのアカウントへのアクセスを要求しています",
    clientLabel: "アプリケーション",
    scopeLabel: "要求されている権限",
    scopeHintOpenid: "あなたの識別",
    scopeHintProfile: "基本プロフィール（名前、ロール、2FA 状態）",
    scopeHintEmail: "メールアドレス",
    scopeHintOther: "追加情報",
    approveButton: "承認する",
    denyButton: "拒否する",
    sessionExpired: "認可セッションの有効期限が切れました。最初からやり直してください。",
    sessionExpiredBack: "戻る",
    errorApprove: "認可処理に失敗しました",
  },
};

export type OidcConsentTranslation = (typeof oidcConsentTranslations)["en"];
