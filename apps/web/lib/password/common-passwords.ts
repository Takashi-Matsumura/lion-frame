/**
 * 共通パスワードブラックリスト
 *
 * SecLists の上位によく使われるパスワードから抜粋。
 * すべて小文字化して格納し、validator 側でも小文字化して比較する。
 */
const BLACKLIST = [
  "password",
  "password1",
  "password123",
  "passw0rd",
  "p@ssw0rd",
  "12345678",
  "123456789",
  "1234567890",
  "qwerty",
  "qwerty123",
  "qwertyuiop",
  "abc123",
  "admin",
  "admin123",
  "administrator",
  "root",
  "letmein",
  "welcome",
  "welcome1",
  "iloveyou",
  "monkey",
  "dragon",
  "master",
  "sunshine",
  "princess",
  "login",
  "passport",
  "starwars",
  "football",
  "baseball",
  "superman",
  "batman",
  "trustno1",
  "changeme",
  "default",
  "secret",
  "hello123",
  "freedom",
  "whatever",
  "asdfghjkl",
  "zxcvbnm",
  "111111",
  "000000",
  "aaaaaaaa",
  "samsung",
  "lionframe",
  "test1234",
  "temporary",
  "company1",
  "summer2024",
  "winter2024",
  "summer2025",
  "winter2025",
] as const;

const BLACKLIST_SET = new Set<string>(BLACKLIST.map((p) => p.toLowerCase()));

export function isCommonPassword(password: string): boolean {
  return BLACKLIST_SET.has(password.toLowerCase());
}
