import {
  urlValidationMessage,
  validateHttpUrl,
} from "@/lib/utils/url-validation";

describe("validateHttpUrl", () => {
  it("rejects empty string", () => {
    expect(validateHttpUrl("")).toEqual({ ok: false, reason: "empty" });
    expect(validateHttpUrl("   ")).toEqual({ ok: false, reason: "empty" });
  });

  it("rejects missing scheme", () => {
    expect(validateHttpUrl("localhost:8080")).toEqual({
      ok: false,
      reason: "missing-scheme",
    });
    expect(validateHttpUrl("example.com")).toEqual({
      ok: false,
      reason: "missing-scheme",
    });
    expect(validateHttpUrl("ftp://example.com")).toEqual({
      ok: false,
      reason: "missing-scheme",
    });
  });

  it("rejects malformed URLs", () => {
    expect(validateHttpUrl("http://[unclosed")).toEqual({
      ok: false,
      reason: "invalid",
    });
  });

  it("accepts valid http URLs", () => {
    expect(validateHttpUrl("http://localhost:8080")).toEqual({
      ok: true,
      url: "http://localhost:8080",
    });
    expect(validateHttpUrl("http://localhost:8080/v1")).toEqual({
      ok: true,
      url: "http://localhost:8080/v1",
    });
    expect(
      validateHttpUrl("http://localhost:8080/v1/chat/completions"),
    ).toEqual({ ok: true, url: "http://localhost:8080/v1/chat/completions" });
  });

  it("accepts valid https URLs", () => {
    expect(validateHttpUrl("https://api.example.com/v1")).toEqual({
      ok: true,
      url: "https://api.example.com/v1",
    });
  });

  it("trims whitespace and trailing slashes", () => {
    expect(validateHttpUrl("  http://host:8080/v1/  ")).toEqual({
      ok: true,
      url: "http://host:8080/v1",
    });
    expect(validateHttpUrl("http://host:8080///")).toEqual({
      ok: true,
      url: "http://host:8080",
    });
  });

  it("is case-insensitive on the scheme", () => {
    expect(validateHttpUrl("HTTP://localhost:8080")).toEqual({
      ok: true,
      url: "HTTP://localhost:8080",
    });
  });
});

describe("urlValidationMessage", () => {
  it("returns localized messages", () => {
    expect(urlValidationMessage("empty", "ja")).toBe("URL を入力してください");
    expect(urlValidationMessage("empty", "en")).toBe("URL is required");
    expect(urlValidationMessage("missing-scheme", "ja")).toContain("http://");
    expect(urlValidationMessage("invalid", "en")).toBe("URL format is invalid");
  });
});
