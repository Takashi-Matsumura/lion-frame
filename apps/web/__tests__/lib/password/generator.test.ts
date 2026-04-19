import {
  generatePassword,
  generateTemporaryPassword,
} from "@/lib/password/generator";
import { validatePassword } from "@/lib/password/validator";

describe("generatePassword", () => {
  it("デフォルトは 16 文字", () => {
    expect(generatePassword()).toHaveLength(16);
  });

  it("指定の長さで生成される", () => {
    expect(generatePassword(24)).toHaveLength(24);
  });

  it("12 文字未満は例外", () => {
    expect(() => generatePassword(8)).toThrow();
  });

  it("生成結果は 4 種類の文字を必ず含む", () => {
    for (let i = 0; i < 20; i++) {
      const pw = generatePassword(16);
      expect(pw).toMatch(/[a-z]/);
      expect(pw).toMatch(/[A-Z]/);
      expect(pw).toMatch(/[0-9]/);
      expect(pw).toMatch(/[^a-zA-Z0-9]/);
    }
  });

  it("曖昧文字（I, l, 1, O, 0）は含まれない", () => {
    for (let i = 0; i < 20; i++) {
      const pw = generatePassword(16);
      expect(pw).not.toMatch(/[Il1O0]/);
    }
  });

  it("生成結果は validatePassword で strong 判定", () => {
    for (let i = 0; i < 10; i++) {
      const pw = generatePassword(16);
      const r = validatePassword(pw);
      expect(r.valid).toBe(true);
      expect(r.strength).toBe("strong");
    }
  });
});

describe("generateTemporaryPassword", () => {
  it("デフォルトは 12 文字", () => {
    expect(generateTemporaryPassword()).toHaveLength(12);
  });

  it("生成結果は validatePassword で valid 判定（medium 以上）", () => {
    for (let i = 0; i < 10; i++) {
      const pw = generateTemporaryPassword();
      const r = validatePassword(pw);
      expect(r.valid).toBe(true);
      expect(["medium", "strong"]).toContain(r.strength);
    }
  });
});
