/** 받침 유무에 따라 조사 선택 (예: josa('홍단', '이', '가') → '이') */
export function josa(word: string, withBatchim: string, without: string): string {
  const ch = word.charCodeAt(word.length - 1);
  const has = ch >= 0xac00 && ch <= 0xd7a3 && (ch - 0xac00) % 28 !== 0;
  return has ? withBatchim : without;
}
