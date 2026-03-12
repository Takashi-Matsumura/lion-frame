/**
 * Sony RC-S300/RC-S380 (PaSoRi) WebUSB NFC リーダー通信
 *
 * ted-box2 (https://github.com/Takashi-Matsumura/ted-box2) の rcs300.ts を参考に実装。
 * ボタンモード（CCID-like プロトコル）で FeliCa IDm を読み取る。
 * vendor-specific USB interface (class=255) を使用。
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

const DEVICE_FILTERS = [
  { vendorId: 0x054c, productId: 0x06c1 }, // RC-S380
  { vendorId: 0x054c, productId: 0x06c3 }, // RC-S380
  { vendorId: 0x054c, productId: 0x0dc8 }, // RC-S300
  { vendorId: 0x054c, productId: 0x0dc9 }, // RC-S300
];

function log(msg: string, data?: any) {
  console.log(`[NFC-Reader] ${msg}`, data ?? "");
}

function sleep(msec: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, msec));
}

function dec2HexString(n: number): string {
  return n.toString(16).toUpperCase().padStart(2, "0");
}

let deviceEp = { in: 0, out: 0 };
let seqNumber = 0;

async function send300(device: any, data: number[]): Promise<void> {
  const argData = new Uint8Array(data);
  const dataLen = argData.length;
  const retVal = new Uint8Array(10 + dataLen);

  retVal[0] = 0x6b;
  retVal[1] = 255 & dataLen;
  retVal[2] = (dataLen >> 8) & 255;
  retVal[3] = (dataLen >> 16) & 255;
  retVal[4] = (dataLen >> 24) & 255;
  retVal[5] = 0x00;
  retVal[6] = ++seqNumber;

  if (dataLen !== 0) {
    retVal.set(argData, 10);
  }

  log("TX", Array.from(retVal).map((b) => dec2HexString(b)).join(" "));
  await device.transferOut(deviceEp.out, retVal);
  await sleep(50);
}

async function receive(device: any, len: number): Promise<number[]> {
  const data = await device.transferIn(deviceEp.in, len);
  await sleep(10);
  const arr: number[] = [];
  for (let i = data.data.byteOffset; i < data.data.byteLength; i++) {
    arr.push(data.data.getUint8(i));
  }
  log("RX", arr.map((b) => dec2HexString(b)).join(" "));
  return arr;
}

async function session300(device: any): Promise<string | undefined> {
  const len = 50;

  await send300(device, [0xff, 0x56, 0x00, 0x00]);
  await receive(device, len);

  await send300(device, [0xff, 0x50, 0x00, 0x00, 0x02, 0x82, 0x00, 0x00]);
  await receive(device, len);

  await send300(device, [0xff, 0x50, 0x00, 0x00, 0x02, 0x81, 0x00, 0x00]);
  await receive(device, len);

  await send300(device, [0xff, 0x50, 0x00, 0x00, 0x02, 0x83, 0x00, 0x00]);
  await receive(device, len);

  await send300(device, [0xff, 0x50, 0x00, 0x00, 0x02, 0x84, 0x00, 0x00]);
  await receive(device, len);

  await send300(
    device,
    [0xff, 0x50, 0x00, 0x02, 0x04, 0x8f, 0x02, 0x03, 0x00, 0x00],
  );
  await receive(device, len);

  await send300(
    device,
    [
      0xff, 0x50, 0x00, 0x01, 0x00, 0x00, 0x11, 0x5f, 0x46, 0x04, 0xa0, 0x86,
      0x01, 0x00, 0x95, 0x82, 0x00, 0x06, 0x06, 0x00, 0xff, 0xff, 0x01, 0x00,
      0x00, 0x00, 0x00,
    ],
  );

  const pollingRes = await receive(device, len);

  if (pollingRes.length === 46) {
    const idm = pollingRes.slice(26, 34).map((v) => dec2HexString(v));
    const idmStr = idm.join("");
    log(`FeliCa IDm: ${idmStr}`);
    return idmStr;
  }

  return undefined;
}

// ===== Public API =====

export function isWebUsbSupported(): boolean {
  return typeof navigator !== "undefined" && "usb" in navigator;
}

export interface NfcReadResult {
  cardId: string;
}

/**
 * NFC リーダーに接続してカードIDを読み取る（ワンショット）
 * 接続 → 初期化 → FeliCa ポーリング → 切断 を一括で実行。
 */
export async function connectAndRead(): Promise<NfcReadResult> {
  if (!isWebUsbSupported()) {
    throw new Error(
      "WebUSB はこのブラウザでサポートされていません。Chrome/Edge を使用してください。",
    );
  }

  const usb = (navigator as any).usb;

  // ペアリング済みの対応デバイスが1つなら自動選択
  let pairedDevices = await usb.getDevices();
  pairedDevices = pairedDevices.filter((d: any) =>
    DEVICE_FILTERS.some((f) => f.productId === d.productId),
  );

  const device =
    pairedDevices.length === 1
      ? pairedDevices[0]
      : await usb.requestDevice({
          filters: [
            ...DEVICE_FILTERS,
            { vendorId: 0x054c },
          ],
        });

  log(
    `Device: ${device.productName} (0x${device.vendorId.toString(16)}:0x${device.productId.toString(16)})`,
  );

  seqNumber = 0;

  try {
    await device.open();
    await device.selectConfiguration(1);

    // vendor-specific interface (class=255) を選択
    const vendorInterface = device.configuration.interfaces.filter(
      (v: any) => {
        const alt = v.alternate || v.alternates?.[0];
        return alt?.interfaceClass === 255;
      },
    )[0];

    if (!vendorInterface) {
      throw new Error("Vendor-specific USB interface (class=255) が見つかりません");
    }

    await device.claimInterface(vendorInterface.interfaceNumber);

    const alt = vendorInterface.alternate || vendorInterface.alternates?.[0];
    deviceEp = {
      in: alt.endpoints.filter((e: any) => e.direction === "in")[0].endpointNumber,
      out: alt.endpoints.filter((e: any) => e.direction === "out")[0].endpointNumber,
    };

    const idmStr = await session300(device);

    try { await device.close(); } catch { /* ignore */ }

    if (!idmStr) {
      throw new Error("カードが検出されませんでした。カードをリーダーに置いてから再試行してください。");
    }

    return { cardId: idmStr };
  } catch (e) {
    try { await device.close(); } catch { /* ignore */ }
    throw e;
  }
}
