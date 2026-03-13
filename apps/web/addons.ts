/**
 * 外部アドオンモジュール登録
 *
 * 外部アドオンパッケージをインストール後、ここにインポートして登録してください。
 *
 * 手順:
 * 1. pnpm add @lionframe/addon-xxx（またはworkspace依存）
 * 2. このファイルにインポート追加
 * 3. app/(main)/(menus)/ 配下にプロキシページを作成
 */

import type { AddonModuleDefinition } from "@lionframe/module-types";
import { sampleHelloModule } from "@lionframe/addon-sample-hello";

export const externalAddons: AddonModuleDefinition[] = [
  sampleHelloModule,
];
