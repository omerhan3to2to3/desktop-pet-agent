/** Uzun cevaplari balon boyutuna sigdir. */
function trimReply(text, max = 180) {
  const dusuncesiz = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
  const emojisiz = dusuncesiz.replace(/[\p{Extended_Pictographic}‍️]/gu, '');
  const tek = emojisiz.replace(/\s+/g, ' ').trim();
  if (tek.length <= max) return tek;
  const kes = tek.slice(0, max);
  const son = Math.max(kes.lastIndexOf('. '), kes.lastIndexOf('! '), kes.lastIndexOf('? '));
  return (son > 40 ? kes.slice(0, son + 1) : kes.trimEnd() + '…').trim();
}

module.exports = { trimReply };
