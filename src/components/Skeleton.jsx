// Reusable shimmer skeleton primitives (shared across pages)
// Dark blocks auto-adapt in light theme via index.css overrides.
const BLOCK = "shimmer rounded-md";

const blockColor = (light) => (light ? "bg-gray-200" : "bg-[#101827]");

export function Skeleton({ light = false, className = "", style }) {
  return (
    <div className={`${BLOCK} ${blockColor(light)} ${className}`} style={style} />
  );
}

export function SkeletonText({ lines = 3, light = false, className = "" }) {
  const widths = ["100%", "92%", "78%", "96%", "85%", "70%", "90%", "64%", "88%", "76%", "94%", "82%"];
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={`${BLOCK} h-3 ${blockColor(light)}`} style={{ width: widths[i % widths.length] }} />
      ))}
    </div>
  );
}

export function SkeletonTable({
  rows = 6,
  cols = 5,
  light = false,
  height = "h-9",
  className = "",
}) {
  const gridStyle = { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` };
  return (
    <div
      className={`rounded-xl border p-3 ${
        light ? "border-gray-200 bg-gray-50/60" : "border-white/10 bg-[#101827]/40"
      } ${className}`}
    >
      <div className="mb-2 grid gap-2" style={gridStyle}>
        {Array.from({ length: cols }).map((_, c) => (
          <div key={`h-${c}`} className={`${BLOCK} h-5 ${light ? "bg-gray-100" : "bg-[#1a2333]"}`} />
        ))}
      </div>
      <div className="space-y-1.5">
        {Array.from({ length: rows }).map((_, r) => (
          <div
            key={r}
            className="grid gap-2 animate-fade-up"
            style={{ ...gridStyle, animationDelay: `${r * 60}ms` }}
          >
            {Array.from({ length: cols }).map((_, c) => (
              <div key={c} className={`${BLOCK} ${height} ${blockColor(light)}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonCardGrid({ count = 4, light = false, className = "" }) {
  return (
    <div
      className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 ${className}`}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`animate-fade-up rounded-xl border p-3 space-y-2.5 ${
            light ? "border-gray-200 bg-gray-50" : "border-white/10 bg-[#101827]/40"
          }`}
          style={{ animationDelay: `${i * 70}ms` }}
        >
          <div className="flex items-center gap-2">
            <div className={`${BLOCK} h-8 w-8 rounded-lg ${light ? "bg-gray-200" : "bg-[#1a2333]"}`} />
            <div className="flex-1 space-y-1.5">
              <div className={`${BLOCK} h-2.5 w-2/3 ${blockColor(light)}`} />
              <div className={`${BLOCK} h-2 w-1/3 ${blockColor(light)}`} />
            </div>
          </div>
          <div className={`${BLOCK} h-6 w-1/2 ${blockColor(light)}`} />
          <div className={`${BLOCK} h-1.5 w-full ${blockColor(light)}`} />
        </div>
      ))}
    </div>
  );
}

// For use inside <tbody> — renders skeleton <tr> rows
export function SkeletonRows({ rows = 6, cols = 5, light = false, height = "h-8" }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="animate-fade-up" style={{ animationDelay: `${r * 60}ms` }}>
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} className="px-3 py-2">
              <div className={`${BLOCK} ${height} w-full ${blockColor(light)}`} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
