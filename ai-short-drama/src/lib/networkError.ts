/**
 * 免費服務（Pollinations 生圖、edge-tts 配音）都是不需要金鑰的公開第三方服務，
 * 沒有 SLA 保證，而且常常在雲端主機／公司網路等環境被擋掉。這個檔案統一判斷
 * 「這是不是連線層級的問題」，並產生一段好懂的中文錯誤訊息，而不是丟一串
 * 難以理解的 stack trace，讓使用者知道下一步該怎麼做（換付費 provider 或 --mock）。
 */

const NETWORK_ERROR_CODES = new Set([
  "ENOTFOUND",
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "EAI_AGAIN",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_SOCKET",
  "UND_ERR_HEADERS_TIMEOUT",
]);

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function errorCauseCode(error: unknown): string | undefined {
  if (error instanceof Error && error.cause && typeof error.cause === "object" && "code" in error.cause) {
    const code = (error.cause as { code?: unknown }).code;
    return typeof code === "string" ? code : undefined;
  }
  return undefined;
}

/**
 * 判斷這個錯誤看起來像不像「連不上／被擋」，而不是程式邏輯錯誤。
 * 涵蓋 Node fetch 的底層網路錯誤、常見的網路層錯誤代碼，以及 403/407 這類
 * 通常代表「被網路政策擋下」而不是「你的請求內容有問題」的狀態碼。
 */
export function looksLikeBlockedOrNetworkFailure(error: unknown, httpStatus?: number): boolean {
  if (httpStatus === 403 || httpStatus === 407) {
    return true;
  }
  const code = errorCauseCode(error);
  if (code && NETWORK_ERROR_CODES.has(code)) {
    return true;
  }
  const message = errorMessage(error);
  return /fetch failed|ENOTFOUND|ECONNREFUSED|ECONNRESET|ETIMEDOUT|EAI_AGAIN|network|unexpected server response: 40[137]/i.test(
    message,
  );
}

/**
 * 幫免費 provider 的失敗包一層好懂的錯誤訊息。
 */
export function describeFreeServiceFailure(options: {
  /** 服務名稱，例如「Pollinations 免費生圖」 */
  serviceName: string;
  error: unknown;
  httpStatus?: number;
  /** 建議使用者接下來怎麼做，例如「可以改用 --video-provider runway，或先用 --mock 測試」 */
  fallbackHint: string;
}): string {
  const { serviceName, error, httpStatus, fallbackHint } = options;
  const message = errorMessage(error);
  const statusPart = httpStatus ? `（HTTP ${httpStatus}）` : "";

  if (looksLikeBlockedOrNetworkFailure(error, httpStatus)) {
    return (
      `${serviceName}連線失敗${statusPart}：${message}\n` +
      "這通常代表目前的網路環境擋掉了這個免費服務（常見於雲端主機、公司網路、CI 環境），" +
      "不是你的設定有錯。換一般家用／公司網路通常就會通。\n" +
      fallbackHint
    );
  }
  return `${serviceName}失敗${statusPart}：${message}\n${fallbackHint}`;
}
