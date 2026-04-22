// 問題文のエスケープや簡易マークアップ整形
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function renderMarkedText(text: string): string {
  const withBreaks = text.replace(/<br\s*\/?\s*>/gi, "\n");
  const escaped = escapeHtml(withBreaks);
  const underlined = escaped.replace(
    /__([^_]+)__/g,
    '<span class="underline">$1</span>'
  );
  const withCodeStyle = underlined.replace(
    /%\[([^\]]+)\]%/g,
    '<span class="inline-token">[$1]</span>'
  );

  return withCodeStyle.replace(/\n/g, "<br>");
}

export function stripMarkup(text: string): string {
  return text
    .replace(/<br\s*\/?\s*>/gi, " ")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/%\[([^\]]+)\]%/g, "$1")
    .replace(/\[([^\]]+)\]/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}
