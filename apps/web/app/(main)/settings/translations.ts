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
      generateButton: "Generate strong password",
      generateCopied: "Generated password copied to clipboard",
      strengthLabel: "Strength",
      strengthWeak: "Weak",
      strengthMedium: "Medium",
      strengthStrong: "Strong",
      success: "Password changed successfully!",
      successLoggingOut:
        "Password changed successfully. Logging out... Please log in with your new password.",
      error: "Failed to change password",
      passwordMismatch: "Passwords do not match",
      passwordTooShort: "Password must be at least 12 characters",
      errorTooLong: "Password must be 1000 characters or fewer",
      errorBlacklisted:
        "This password is too common. Please choose a different one.",
      errorContainsUserInfo:
        "Password must not contain your email address or name.",
      errorRepeatedChars:
        "Password must not repeat the same character 4 or more times.",
      showPassword: "Show password",
      hidePassword: "Hide password",
      mustChangeWarning:
        "Your password has been reset by an administrator. Please change your password to continue.",
    },
    passkey: {
      title: "Passkeys",
      description:
        "Sign in without a password using Touch ID, Face ID, or a hardware security key",
      registerButton: "Add a passkey",
      registering: "Registering...",
      nicknamePlaceholder: "Passkey nickname (optional)",
      saveNickname: "Save",
      cancel: "Cancel",
      delete: "Delete",
      confirmDelete:
        "Are you sure you want to delete this passkey? You will no longer be able to sign in with it.",
      lastUsedAt: "Last used",
      createdAt: "Added",
      never: "Never used",
      empty: "You have not registered any passkeys yet.",
      registerSuccess: "Passkey registered successfully!",
      deleteSuccess: "Passkey deleted.",
      nicknameUpdated: "Nickname updated.",
      error: "An error occurred. Please try again.",
      notSupported: "Passkeys are not supported in this browser.",
      userCancelled: "Passkey registration was cancelled.",
      lastPasskeyBlocked:
        "Cannot remove your last passkey when no password is set.",
      deviceSingle: "This device only",
      deviceMulti: "Syncs across devices",
      test: "Test",
      testing: "Testing...",
      testSuccess: "Passkey authentication succeeded.",
      testFailure: "Passkey authentication failed.",
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
      generateButton: "安全なパスワードを生成",
      generateCopied: "生成したパスワードをクリップボードにコピーしました",
      strengthLabel: "強度",
      strengthWeak: "弱い",
      strengthMedium: "標準",
      strengthStrong: "強い",
      success: "パスワードを変更しました！",
      successLoggingOut:
        "パスワードを変更しました。ログアウトします…新しいパスワードでログインしてください。",
      error: "パスワードの変更に失敗しました",
      passwordMismatch: "パスワードが一致しません",
      passwordTooShort: "パスワードは 12 文字以上で入力してください",
      errorTooLong: "パスワードは 1000 文字以下で入力してください",
      errorBlacklisted:
        "よく使われるパスワードのため使用できません。別のパスワードを設定してください。",
      errorContainsUserInfo:
        "メールアドレスや氏名を含むパスワードは使用できません。",
      errorRepeatedChars: "同じ文字を 4 回以上連続させないでください。",
      showPassword: "パスワードを表示",
      hidePassword: "パスワードを非表示",
      mustChangeWarning:
        "管理者によりパスワードがリセットされました。続行するには新しいパスワードを設定してください。",
    },
    passkey: {
      title: "パスキー",
      description:
        "Touch ID・Face ID・ハードウェアセキュリティキーでパスワードレスにサインインできます",
      registerButton: "パスキーを追加",
      registering: "登録中…",
      nicknamePlaceholder: "パスキーのニックネーム（任意）",
      saveNickname: "保存",
      cancel: "キャンセル",
      delete: "削除",
      confirmDelete:
        "このパスキーを削除してよろしいですか？ このパスキーではサインインできなくなります。",
      lastUsedAt: "最終使用日時",
      createdAt: "登録日時",
      never: "未使用",
      empty: "まだパスキーは登録されていません。",
      registerSuccess: "パスキーを登録しました！",
      deleteSuccess: "パスキーを削除しました。",
      nicknameUpdated: "ニックネームを更新しました。",
      error: "エラーが発生しました。もう一度お試しください。",
      notSupported: "このブラウザはパスキーに対応していません。",
      userCancelled: "パスキーの登録をキャンセルしました。",
      lastPasskeyBlocked:
        "パスワードが設定されていないため、最後のパスキーは削除できません。",
      deviceSingle: "このデバイス専用",
      deviceMulti: "デバイス間で同期",
      test: "テスト",
      testing: "テスト中…",
      testSuccess: "パスキー認証に成功しました。",
      testFailure: "パスキー認証に失敗しました。",
    },
  },
} as const;
