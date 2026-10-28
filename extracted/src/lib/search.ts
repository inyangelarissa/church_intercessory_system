/** Splits a search box value into lower-case words. Every word has to match (AND search). */
export function tokenize(query: string): string[] {
  return query.toLowerCase().split(/\s+/).filter(Boolean);
}

/** True when every word of the query appears somewhere in the given fields. An empty query matches everything. */
export function matchesQuery(query: string | string[], fields: unknown[]): boolean {
  const tokens = Array.isArray(query) ? query : tokenize(query);
  if (tokens.length === 0) return true;
  const haystack = fields
    .flat()
    .map(value => String(value ?? ""))
    .join(" ")
    .toLowerCase();
  return tokens.every(token => haystack.includes(token));
}

/** Splits text into pieces, flagging the ones that match a search word (used to highlight matches). */
export function highlightParts(text: string, tokens: string[]): { text: string; match: boolean }[] {
  if (!text || tokens.length === 0) return [{ text, match: false }];
  const pattern = new RegExp(`(${tokens.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  return text.split(pattern).filter(part => part !== "").map(part => ({
    text: part,
    match: tokens.some(token => part.toLowerCase() === token),
  }));
}
