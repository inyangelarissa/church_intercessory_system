import { highlightParts } from "../lib/search";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
}

/** The search field used on each page: magnifier icon, clear button, Escape to clear. */
export default function SearchInput({ value, onChange, placeholder, label }: SearchInputProps) {
  return (
    <div className="relative w-full">
      <svg className="absolute left-3 top-3 pointer-events-none" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
      <input
        type="search"
        value={value}
        onChange={event => onChange(event.target.value)}
        onKeyDown={event => { if (event.key === "Escape") onChange(""); }}
        placeholder={placeholder}
        aria-label={label}
        className="w-full rounded-xl py-2.5 pl-9 pr-9 text-sm outline-none"
        style={{ background: "#fff", border: "1px solid rgba(10,22,40,0.12)", color: "#0a1628" }}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute right-2.5 top-2.5 w-5 h-5 rounded-full flex items-center justify-center text-xs hover:bg-slate-100"
          style={{ color: "#64748b" }}
        >
          ✕
        </button>
      )}
    </div>
  );
}

/** Renders text with the matching search words highlighted. */
export function Highlight({ text, tokens }: { text: string; tokens: string[] }) {
  return (
    <>
      {highlightParts(text, tokens).map((part, index) =>
        part.match
          ? <mark key={index} style={{ background: "rgba(139,0,0,0.14)", color: "inherit", borderRadius: 3, padding: "0 1px" }}>{part.text}</mark>
          : <span key={index}>{part.text}</span>
      )}
    </>
  );
}
