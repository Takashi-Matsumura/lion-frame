"use client";

/**
 * Sample Hello ページコンポーネント
 *
 * 外部アドオンから提供されるページのサンプル。
 * LionFrame の UI コンポーネントは利用せず、自己完結している。
 */
export function SampleHelloPage({ language }: { language: "en" | "ja" }) {
  const t =
    language === "ja"
      ? {
          title: "Hello from External Addon!",
          description:
            "このページは外部アドオンパッケージ（@lionframe/addon-sample-hello）から提供されています。",
          features: "外部アドオンの特徴",
          feature1:
            "独立した npm パッケージとして開発・配布可能",
          feature2:
            "LionFrame のモジュールレジストリに自動登録",
          feature3:
            "アイコンは SVG パス文字列で定義（React 非依存）",
          feature4:
            "ページコンポーネントはプロキシ経由で読み込み",
          packageInfo: "パッケージ情報",
          packageName: "@lionframe/addon-sample-hello",
          version: "0.1.0",
        }
      : {
          title: "Hello from External Addon!",
          description:
            "This page is provided by an external addon package (@lionframe/addon-sample-hello).",
          features: "External Addon Features",
          feature1:
            "Developed and distributed as an independent npm package",
          feature2:
            "Automatically registered in LionFrame module registry",
          feature3:
            "Icons defined as SVG path strings (no React dependency)",
          feature4:
            "Page components loaded via proxy pages",
          packageInfo: "Package Info",
          packageName: "@lionframe/addon-sample-hello",
          version: "0.1.0",
        };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {t.title}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">{t.description}</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
          {t.features}
        </h3>
        <ul className="space-y-3">
          {[t.feature1, t.feature2, t.feature3, t.feature4].map(
            (feature, i) => (
              <li
                key={`feature-${i}`}
                className="flex items-start gap-3 text-gray-700 dark:text-gray-300"
              >
                <span className="mt-1 flex-shrink-0 w-5 h-5 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                  <svg
                    className="w-3 h-3 text-green-600 dark:text-green-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </span>
                {feature}
              </li>
            ),
          )}
        </ul>
      </div>

      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
          {t.packageInfo}
        </h3>
        <dl className="space-y-2 text-sm">
          <div className="flex gap-2">
            <dt className="font-medium text-gray-500 dark:text-gray-400 w-24">
              Package:
            </dt>
            <dd className="font-mono text-gray-800 dark:text-gray-200">
              {t.packageName}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="font-medium text-gray-500 dark:text-gray-400 w-24">
              Version:
            </dt>
            <dd className="font-mono text-gray-800 dark:text-gray-200">
              {t.version}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
