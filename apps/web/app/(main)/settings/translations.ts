export const settingsTranslations = {
  en: {
    title: "Settings",
    description: "Manage your account settings and preferences",
    tabs: {
      basic: "Basic",
      keys: "Keys",
    },
    accountSettings: "Account Settings",
    displayName: "Display Name",
    emailAddress: "Email Address",
    twoFactor: {
      title: "Two-Factor Authentication",
      description: "Add an extra layer of security",
      enabled: "Enabled",
      disabled: "Disabled",
      enable: "Enable 2FA",
      disable: "Disable 2FA",
      setupTitle: "Set up Two-Factor Authentication",
      setupDescription:
        "Scan this QR code with your authenticator app (Google Authenticator, Microsoft Authenticator, etc.)",
      manualEntry: "Or enter this code manually:",
      verifyTitle: "Verify Setup",
      verifyDescription: "Enter the 6-digit code from your authenticator app",
      verifyButton: "Verify and Enable",
      disableTitle: "Disable Two-Factor Authentication",
      disableDescription:
        "Enter the 6-digit code from your authenticator app to disable 2FA",
      disableButton: "Verify and Disable",
      cancel: "Cancel",
      success: "Two-factor authentication has been enabled successfully!",
      disableSuccess:
        "Two-factor authentication has been disabled successfully!",
      invalidCode: "Invalid verification code. Please try again.",
      error: "An error occurred. Please try again.",
    },
    language: {
      title: "Language Settings",
      description: "Choose your preferred language",
      english: "English",
      japanese: "日本語",
      current: "Current Language",
      saveButton: "Save Language",
      saved: "Language preference saved successfully!",
    },
    pushNotification: {
      title: "Push Notifications",
      description:
        "Receive notifications even when the browser tab is closed",
      subscribed: "Subscribed",
      notSubscribed: "Not Subscribed",
      subscribe: "Enable Push Notifications",
      unsubscribe: "Disable Push Notifications",
      notSupported:
        "Push notifications are not supported in this browser",
      permissionDenied:
        "Notification permission was denied. Please enable it in your browser settings.",
      success: "Push notifications enabled!",
      unsubscribeSuccess: "Push notifications disabled.",
      error: "Failed to set up push notifications",
      sendTest: "Send test notification",
      testSent: "Test notification sent! Check your OS notification center.",
      testError: "Failed to send test notification",
      browserGuide: {
        toggleLabel: "Setup guide for each OS and browser",
        commonNote:
          "Push notifications do not work in Incognito / Private Browsing mode. Please use a regular window.",
        macos: {
          title: "macOS",
          systemNote:
            "First, open System Settings > Notifications and make sure your browser has notifications allowed.",
          chrome:
            "Chrome: Click the lock icon in the address bar > Site settings > Notifications > Allow",
          safari:
            "Safari: Safari > Settings > Websites > Notifications > Allow for this site",
          edge: "Edge: Click the lock icon in the address bar > Permissions for this site > Notifications > Allow",
          firefox:
            "Firefox: Click the shield/lock icon in the address bar > Connection secure > More information > Permissions > Notifications",
        },
        windows: {
          title: "Windows",
          systemNote:
            "Windows 11: Settings > System > Notifications — make sure your browser's notifications are on. Also check Focus Assist settings.",
          chrome:
            "Chrome: Click the lock icon in the address bar > Site settings > Notifications > Allow",
          edge: "Edge: Click the lock icon in the address bar > Permissions for this site > Notifications > Allow",
          firefox:
            "Firefox: Click the shield icon in the address bar > Site information > Notifications",
        },
      },
    },
    passwordChange: {
      title: "Password",
      description: "Change your password",
      currentPassword: "Current Password",
      newPassword: "New Password",
      confirmPassword: "Confirm New Password",
      changeButton: "Change Password",
      success: "Password changed successfully!",
      successLoggingOut:
        "Password changed successfully. Logging out... Please log in with your new password.",
      error: "Failed to change password",
      passwordMismatch: "Passwords do not match",
      passwordTooShort: "Password must be at least 8 characters",
      mustChangeWarning:
        "Your password has been reset by an administrator. Please change your password to continue.",
    },
  },
  ja: {
    title: "設定",
    description: "アカウント設定と環境設定を管理します",
    tabs: {
      basic: "基本",
      keys: "キー",
    },
    accountSettings: "アカウント設定",
    displayName: "表示名",
    emailAddress: "メールアドレス",
    twoFactor: {
      title: "二要素認証",
      description: "セキュリティのレイヤーを追加",
      enabled: "有効",
      disabled: "無効",
      enable: "2FAを有効にする",
      disable: "2FAを無効にする",
      setupTitle: "二要素認証のセットアップ",
      setupDescription:
        "認証アプリ（Google Authenticator、Microsoft Authenticatorなど）でこのQRコードをスキャンしてください",
      manualEntry: "または、このコードを手動で入力:",
      verifyTitle: "セットアップの確認",
      verifyDescription: "認証アプリに表示された6桁のコードを入力してください",
      verifyButton: "確認して有効化",
      disableTitle: "二要素認証を無効にする",
      disableDescription:
        "2FAを無効にするには、認証アプリに表示された6桁のコードを入力してください",
      disableButton: "確認して無効化",
      cancel: "キャンセル",
      success: "二要素認証が正常に有効化されました！",
      disableSuccess: "二要素認証が正常に無効化されました！",
      invalidCode: "無効な確認コードです。もう一度お試しください。",
      error: "エラーが発生しました。もう一度お試しください。",
    },
    language: {
      title: "言語設定",
      description: "お好みの言語を選択してください",
      english: "English",
      japanese: "日本語",
      current: "現在の言語",
      saveButton: "言語を保存",
      saved: "言語設定が正常に保存されました！",
    },
    pushNotification: {
      title: "プッシュ通知",
      description:
        "ブラウザのタブを閉じていても通知を受け取れます",
      subscribed: "購読中",
      notSubscribed: "未購読",
      subscribe: "プッシュ通知を有効にする",
      unsubscribe: "プッシュ通知を無効にする",
      notSupported:
        "このブラウザではプッシュ通知がサポートされていません",
      permissionDenied:
        "通知の許可が拒否されています。ブラウザの設定から有効にしてください。",
      success: "プッシュ通知が有効になりました！",
      unsubscribeSuccess: "プッシュ通知を無効にしました。",
      error: "プッシュ通知の設定に失敗しました",
      sendTest: "テスト通知を送信",
      testSent: "テスト通知を送信しました！OSの通知センターを確認してください。",
      testError: "テスト通知の送信に失敗しました",
      browserGuide: {
        toggleLabel: "OS・ブラウザごとの設定方法",
        commonNote:
          "シークレットモード（プライベートブラウジング）ではプッシュ通知は動作しません。通常のウィンドウでご利用ください。",
        macos: {
          title: "macOS",
          systemNote:
            "まず「システム設定 > 通知」を開き、使用するブラウザが「通知を許可」になっていることを確認してください。",
          chrome:
            "Chrome: アドレスバー左の🔒アイコン → 「サイトの設定」 → 「通知」を「許可」に変更",
          safari:
            "Safari: メニュー「Safari」 → 「設定...」 → 「Webサイト」タブ → 「通知」で対象サイトを「許可」に",
          edge: "Edge: アドレスバー左の🔒アイコン → 「このサイトのアクセス許可」 → 「通知」を「許可」に変更",
          firefox:
            "Firefox: アドレスバー左の盾/鍵アイコン → 「接続は安全です」 → 「詳細情報」 → 「サイト別設定」 → 「通知」",
        },
        windows: {
          title: "Windows",
          systemNote:
            "Windows 11: 「設定 > システム > 通知」でブラウザの通知がオンになっていることを確認してください。「集中モード（Focus Assist）」の設定もご確認ください。",
          chrome:
            "Chrome: アドレスバー左の🔒アイコン → 「サイトの設定」 → 「通知」を「許可」に変更",
          edge: "Edge: アドレスバー左の🔒アイコン → 「このサイトのアクセス許可」 → 「通知」を「許可」に変更",
          firefox:
            "Firefox: アドレスバー左の盾アイコン → 「サイト情報」 → 「通知」",
        },
      },
    },
    passwordChange: {
      title: "パスワード",
      description: "パスワードを変更します",
      currentPassword: "現在のパスワード",
      newPassword: "新しいパスワード",
      confirmPassword: "新しいパスワード（確認）",
      changeButton: "パスワードを変更",
      success: "パスワードを変更しました！",
      successLoggingOut:
        "パスワードを変更しました。ログアウトします…新しいパスワードでログインしてください。",
      error: "パスワードの変更に失敗しました",
      passwordMismatch: "パスワードが一致しません",
      passwordTooShort: "パスワードは8文字以上必要です",
      mustChangeWarning:
        "管理者によりパスワードがリセットされました。続行するには新しいパスワードを設定してください。",
    },
  },
} as const;
