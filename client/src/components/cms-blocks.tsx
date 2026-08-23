import { interpolate } from "@shared/content-catalog";

type Vars = Record<string, string | number | undefined | null>;

export function CmsBlocks({ text, vars }: { text: string; vars?: Vars }) {
  const rendered = interpolate(text, vars || {}).trim();
  if (!rendered) return null;

  const blocks = rendered.split(/\n{2,}/);
  return (
    <div className="space-y-4 text-foreground">
      {blocks.map((block, i) => {
        const lines = block.split("\n").map((l) => l.trimEnd());
        const nonEmpty = lines.filter((l) => l.trim());
        if (nonEmpty.length > 0 && nonEmpty.every((l) => /^[-•]\s+/.test(l.trim()))) {
          return (
            <ul key={i} className="list-disc pl-6 space-y-2">
              {nonEmpty.map((l, j) => (
                <li key={j}>{l.trim().replace(/^[-•]\s+/, "")}</li>
              ))}
            </ul>
          );
        }
        const first = lines[0]?.trim() || "";
        if (/^#\s+/.test(first) || /^\d+\.\s+/.test(first)) {
          const heading = first.replace(/^#\s+/, "");
          return (
            <section key={i}>
              <h2 className="text-xl font-semibold mb-3">{heading}</h2>
              {lines.slice(1).filter(Boolean).map((line, j) =>
                /^[-•]\s+/.test(line.trim()) ? (
                  <p key={j} className="leading-relaxed pl-4">• {line.trim().replace(/^[-•]\s+/, "")}</p>
                ) : (
                  <p key={j} className="leading-relaxed mb-2 whitespace-pre-line">{line}</p>
                ),
              )}
            </section>
          );
        }
        return (
          <p key={i} className="leading-relaxed whitespace-pre-line">
            {block}
          </p>
        );
      })}
    </div>
  );
}
