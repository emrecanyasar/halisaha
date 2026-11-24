/**
 * Kompakt 1-10 özellik kaydırıcısı: tek satır (etiket · ince kaydırıcı · değer), sade yeşil tonlar.
 * value 0 = girilmedi (değer "–", kaydırıcı ortada ve gri durur).
 */
export default function AttrSlider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const set = value > 0
  return (
    <label className="grid h-9 grid-cols-[84px_minmax(0,1fr)_32px] items-center gap-2.5">
      <span className="truncate text-xs font-semibold text-muted">{label}</span>
      <input
        type="range"
        min={1}
        max={10}
        step={1}
        value={set ? value : 5}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        className="h-5 w-full cursor-pointer"
        style={{ accentColor: set ? '#16a34a' : '#94a3b8' }}
      />
      <span className={`rounded-md py-0.5 text-center text-xs font-extrabold tabular-nums ${set ? 'bg-green-100 text-green-800' : 'bg-surface-2 text-muted'}`}>
        {set ? value : '–'}
      </span>
    </label>
  )
}
