import { attrLabels } from '../lib/constants'
import type { Position } from '../types'
import { PERIOD, overallOf, type RatingHistory } from '../lib/rating'
import { attrColor } from '../lib/utils'
import { ATTR_KEYS, type Attributes } from '../types'

const deltaText = (d: number) => (d > 0 ? `+${d}` : d < 0 ? `−${Math.abs(d)}` : '0')
const deltaClass = (d: number) => (d > 0 ? 'text-green-700' : d < 0 ? 'text-red-700' : 'text-muted')
const deltaPill = (d: number) => (d > 0 ? 'bg-green-100 text-green-800' : d < 0 ? 'bg-red-100 text-red-800' : 'bg-surface-2 text-muted')

/** Rating gelişimi: özet + çizelge (satırda özellikler, sütunda başlangıç ve dönemler) */
export default function RatingHistoryCard({ h, self, position }: { h: RatingHistory; self?: boolean; position?: Position }) {
  if (!h.base || !h.current) {
    const n = Math.min(h.baseCount, h.baseRequired)
    return (
      <div className="card space-y-3 p-4">
        <h2 className="font-bold">{self ? 'Kartın hazırlanıyor' : 'Kart hazırlanıyor'}</h2>
        <div>
          <div className="mb-1.5 flex justify-between text-sm">
            <span className="text-muted">İlk değerlendirme</span>
            <b>{n} / {h.baseRequired}</b>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: h.baseRequired }, (_, i) => (
              <span key={i} className={`h-2 flex-1 rounded-full ${i < n ? 'bg-brand' : 'bg-line'}`} />
            ))}
          </div>
        </div>
        <p className="text-sm leading-relaxed text-muted">
          {self ? 'Grup arkadaşların seni' : 'Grup arkadaşları oyuncuyu'} gizlice değerlendiriyor; kimin değerlendirdiği ve kaç verdiği görünmez.{' '}
          {h.baseRequired} değerlendirme tamamlanınca kart açılır.
        </p>
        {h.pending.length > 0 && (
          <p className="rounded-xl bg-green-50 px-3 py-2 text-xs text-green-800">
            {h.pending.length} maçın oyları kaydedildi; kart açılınca ilk döneme sayılacak.
          </p>
        )}
      </div>
    )
  }

  const cols: { short: string; sub: string; attrs: Attributes }[] = [
    { short: 'Baş.', sub: h.baseSource === 'maclar' ? 'İlk maçlar' : 'Ana rating', attrs: h.base },
    ...h.periods.map((p) => ({ short: `D${p.index}`, sub: `${p.avg.toFixed(1)} ort.`, attrs: p.to })),
  ]
  const now = overallOf(h.current, position)
  const start = overallOf(h.base, position)
  const labels = attrLabels(position)
  const inPeriod = h.pending.length
  const left = PERIOD - inPeriod
  const rows: { name: string; get: (a: Attributes) => number; bold?: boolean }[] = [
    ...ATTR_KEYS.map((k) => ({ name: labels[k].long.split(' /')[0]!, get: (a: Attributes) => a[k] })),
    { name: 'Genel', get: (a: Attributes) => overallOf(a, position), bold: true },
  ]

  return (
    <div className="card space-y-3 p-4">
      <h2 className="font-bold">Rating gelişimi</h2>
      <div className="flex flex-wrap gap-2">
        <div className="flex min-w-[200px] flex-1 items-center gap-3 rounded-xl border border-line bg-surface-2/50 p-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-xl font-black text-white" style={{ background: attrColor(now) }}>
            {now}
          </span>
          <div className="text-xs text-muted">
            <div className="flex items-center gap-1.5">
              <b className="text-sm text-ink">Kart ratingi</b>
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-extrabold ${deltaPill(now - start)}`}>{deltaText(now - start)}</span>
            </div>
            <div>
              Başlangıç {start} ·{' '}
              {h.baseSource === 'maclar' ? 'ilk maçların oylarından' : `ilk değerlendirme (${h.baseCount} kişi)`}
            </div>
          </div>
        </div>
        <div className="flex min-w-[200px] flex-1 flex-col justify-center gap-1.5 rounded-xl border border-line bg-surface-2/50 p-3">
          <span className="text-xs text-muted">
            <b className="text-ink">Sonraki güncelleme:</b> {left} maç sonra
          </span>
          <div className="flex gap-1">
            {Array.from({ length: PERIOD }, (_, i) => (
              <span key={i} className={`h-1.5 flex-1 rounded-full ${i < inPeriod ? 'bg-brand' : 'bg-line'}`} />
            ))}
          </div>
          <span className="text-[11px] text-muted">
            Bu dönem {inPeriod}/{PERIOD} maç{h.pendingAvg != null && ` · ortalama ${h.pendingAvg.toFixed(1)}`}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[320px] border-collapse text-sm">
          <thead>
            <tr className="bg-surface-2/60 text-[11px] text-muted">
              <th className="px-3 py-2 text-left font-semibold">Özellik</th>
              {cols.map((c, i) => (
                <th key={i} className="whitespace-nowrap px-2 py-2 text-center font-semibold">
                  {c.short}
                  <div className="text-[10px] font-normal">{c.sub}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} className={`border-t border-line ${r.bold ? 'bg-surface-2/40' : ''}`}>
                <td className={`whitespace-nowrap px-3 py-2 ${r.bold ? 'font-extrabold' : 'font-semibold'}`}>{r.name}</td>
                {cols.map((c, i) => {
                  const v = r.get(c.attrs)
                  const d = i > 0 ? v - r.get(cols[i - 1]!.attrs) : 0
                  return (
                    <td key={i} className="whitespace-nowrap px-2 py-2 text-center">
                      <b style={{ color: attrColor(v) }}>{v}</b>
                      {d !== 0 && <span className={`ml-1 text-[10px] font-extrabold ${deltaClass(d)}`}>{deltaText(d)}</span>}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] leading-relaxed text-muted">
        Kart her {PERIOD} maçta bir güncellenir: dönemdeki oyların ortalaması karttan yüksekse artar, düşükse azalır. Genel puan mevkiye göre ağırlıklıdır. Küçük rakamlar bir önceki döneme göre değişim.
      </p>
    </div>
  )
}
