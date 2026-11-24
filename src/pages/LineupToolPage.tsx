import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Pitch from '../components/Pitch'
import { Icon, Sheet } from '../components/ui'
import { ATTR_LABELS, FORMATIONS, PLAYERS_PER_SIDE_OPTIONS, TEAM_COLORS, formationLabel } from '../lib/constants'
import { moveOnPitch } from '../lib/pitch'
import { ATTR_KEYS } from '../types'
import AttrSlider from '../components/AttrSlider'
import { useIsDesktop } from '../lib/hooks'
import {
  ATTR_PRESETS,
  normalizeLineup,
  attrsOf,
  hasRatings,
  powerOf,
  teamStrength,
  benchOf,
  decodeLineup,
  distribute,
  encodeLineup,
  makePlayer,
  newLineup,
  parseNames,
  resizeLineup,
  toMatch,
  toPlayerMap,
  type LineupPlayer,
  type LineupState,
} from '../lib/lineup'
import { renderLineupPng, shareOrDownloadPng } from '../lib/lineupImage'
import type { Team, TeamSide } from '../types'

const DRAFT_KEY = 'halisaha:kadro'

/** Paylaşım linki: #/kadro?k=<kod> (site # tabanlı yönlendirme kullanıyor) */
const lineupShareUrl =(code: string) => `${window.location.origin}${window.location.pathname}#/kadro?k=${code}`

const loadInitial = (code: string | null): { state: LineupState; fromLink: boolean } => {
  if (code) {
    const s = decodeLineup(code)
    if (s) return { state: s, fromLink: true }
  }
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (raw) return { state: normalizeLineup(JSON.parse(raw) as LineupState), fromLink: false }
  } catch {
    /* taslak okunamadı */
  }
  return { state: newLineup(), fromLink: false }
}

/** Giriş gerektirmeyen kadro kurma aracı. */
export default function LineupToolPage() {
  const [params, setParams] = useSearchParams()
  const [{ state: initial, fromLink }] = useState(() => loadInitial(params.get('k')))
  const [s, setS] = useState<LineupState>(initial)
  const [names, setNames] = useState('')
  const [picker, setPicker] = useState<{ side: TeamSide; index: number } | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Taslağı sakla; linkle açıldıysa adres çubuğunu temizle (sonraki değişiklikler taslağa yazılır)
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(s))
    } catch {
      /* yoksay */
    }
  }, [s])
  useEffect(() => {
    if (fromLink) {
      setParams({}, { replace: true })
      flash('Paylaşılan kadro açıldı')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromLink])

  const flash = (msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(null), 2200)
  }

  const match = useMemo(() => toMatch(s), [s])
  const playerMap = useMemo(() => toPlayerMap(s), [s])
  const bench = useMemo(() => benchOf(s), [s])
  const onPitch = s.players.length - bench.length
  const hasStars = hasRatings(s)
  const isDesktop = useIsDesktop()
  /** Masaüstü: satırda açık oyuncu. Mobil: alttan açılan pencerede düzenlenen oyuncu. */
  const [openId, setOpenId] = useState<string | null>(null)
  const [sheetId, setSheetId] = useState<string | null>(null)
  const sheetIndex = sheetId ? s.players.findIndex((p) => p.id === sheetId) : -1
  const sheetPlayer = sheetIndex >= 0 ? s.players[sheetIndex] : undefined

  // ---- Oyuncu listesi ----
  const addNames = () => {
    const list = parseNames(names)
    if (!list.length) return
    const existing = new Set(s.players.map((p) => p.name.toLocaleLowerCase('tr')))
    const fresh = list.filter((n) => !existing.has(n.toLocaleLowerCase('tr'))).map(makePlayer)
    setS({ ...s, players: [...s.players, ...fresh] })
    setNames('')
    if (fresh.length < list.length) flash(`${list.length - fresh.length} isim zaten listede`)
  }
  const updatePlayer = (id: string, patch: Partial<LineupPlayer>) =>
    setS({ ...s, players: s.players.map((p) => (p.id === id ? { ...p, ...patch } : p)) })
  const removePlayer = (id: string) => {
    const clear = (t: Team): Team => ({ ...t, slots: t.slots.map((x) => (x === id ? null : x)) })
    setS({ ...s, players: s.players.filter((p) => p.id !== id), teamA: clear(s.teamA), teamB: clear(s.teamB) })
  }
  const clearAll = () => setS(newLineup(s.perSide))

  // ---- Takımlar ----
  const setTeam = (side: TeamSide, patch: Partial<Team>) =>
    setS(side === 'A' ? { ...s, teamA: { ...s.teamA, ...patch } } : { ...s, teamB: { ...s.teamB, ...patch } })
  const doDistribute = (mode: 'auto' | 'random') => {
    if (s.players.length < 2) return flash('Önce en az 2 oyuncu ekle')
    const r = distribute(s, mode)
    setS(r.state)
    flash(r.balanced ? 'Yıldızlara göre dengeli dağıtıldı' : 'Rastgele dağıtıldı')
  }
  const assign = (side: TeamSide, index: number, playerId: string | null) => {
    const key = side === 'A' ? 'teamA' : 'teamB'
    const strip = (t: Team): Team => ({ ...t, slots: t.slots.map((x) => (x === playerId ? null : x)) })
    const base = playerId ? { ...s, teamA: strip(s.teamA), teamB: strip(s.teamB) } : s
    const team = base[key]
    const slots = [...team.slots]
    slots[index] = playerId
    setS({ ...base, [key]: { ...team, slots } })
    setPicker(null)
  }

  // ---- Paylaşım ----
  const copyLink = async () => {
    const url = lineupShareUrl(encodeLineup(s))
    try {
      await navigator.clipboard.writeText(url)
      flash('Link kopyalandı')
    } catch {
      window.prompt('Linki kopyala:', url)
    }
  }
  const saveImage = async () => {
    if (onPitch === 0) return flash('Önce takımları dağıt')
    setBusy(true)
    try {
      const blob = await renderLineupPng(s)
      const r = await shareOrDownloadPng(blob, `kadro-${s.teamB.name}-${s.teamA.name}.png`.replace(/\s+/g, '-').toLocaleLowerCase('tr'))
      if (r === 'downloaded') flash('Görsel indirildi')
    } catch {
      flash('Görsel oluşturulamadı')
    } finally {
      setBusy(false)
    }
  }

  const pickerTeam = picker ? (picker.side === 'A' ? s.teamA : s.teamB) : null
  const pickerCurrent = picker && pickerTeam ? pickerTeam.slots[picker.index] : null

  return (
    <div className="px-4 pb-6 pt-4 lg:px-0">
      <div className="mb-4">
        <h1 className="text-2xl font-extrabold">Kadro Kurucu</h1>
        <p className="mt-1 text-sm text-muted">İsimleri yaz, takımları dağıt, sahada diz ve gruba at. Üye olmana gerek yok.</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[400px_minmax(0,1fr)] lg:items-start">
        {/* Sol: ayarlar ve oyuncular */}
        <div className="space-y-4">
          <section className="card p-4">
            <StepTitle n={1} title="Kaça kaç?" />
            <div className="mt-3 flex flex-wrap gap-2">
              {PLAYERS_PER_SIDE_OPTIONS.map((n) => (
                <button
                  key={n}
                  onClick={() => setS(resizeLineup(s, n))}
                  className={`rounded-xl border px-3 py-1.5 text-sm font-semibold ${s.perSide === n ? 'border-brand bg-brand text-white' : 'border-line hover:bg-surface-2'}`}
                >
                  {n}v{n}
                </button>
              ))}
            </div>
          </section>

          <section className="card p-4">
            <div className="flex items-center justify-between">
              <StepTitle n={2} title="Oyuncular" />
              {s.players.length > 0 && (
                <span className="text-xs text-muted">
                  {s.players.length} kişi · {s.perSide * 2} yer
                </span>
              )}
            </div>
            <textarea
              value={names}
              onChange={(e) => setNames(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) addNames()
              }}
              rows={4}
              placeholder={'Her satıra bir isim yaz ya da WhatsApp listesini yapıştır:\nAhmet\nMehmet\nCan'}
              className="input mt-3 resize-y"
            />
            <button onClick={addNames} disabled={!names.trim()} className="btn-ghost mt-2 w-full disabled:opacity-50">
              <Icon name="plus" size={18} /> Listeye ekle
            </button>

            {s.players.length > 0 && (
              <>
                <p className="mt-4 text-xs text-muted">
                  Oyuncuya dokun: hücum, savunma, kondisyon gibi özellikleri 10 üzerinden puanla, kaleciyi işaretle. Takımlar puanlara göre dengelenir.
                </p>
                <ul className="-mx-2 mt-2">
                  {s.players.map((p) => {
                    const open = isDesktop && openId === p.id
                    return (
                      <li key={p.id} className={`rounded-xl transition-colors ${open ? 'bg-surface-2/70' : ''}`}>
                        <PlayerRow
                          player={p}
                          open={open}
                          onTap={() => (isDesktop ? setOpenId(open ? null : p.id) : setSheetId(p.id))}
                        />
                        {open && (
                          <div className="pb-3 pl-[60px] pr-3">
                            <PlayerEditor player={p} onChange={(patch) => updatePlayer(p.id, patch)} />
                            <div className="mt-2 flex items-center gap-2 border-t border-line pt-2.5">
                              <GkToggle on={p.gk} onClick={() => updatePlayer(p.id, { gk: !p.gk })} />
                              <button onClick={() => removePlayer(p.id)} className="h-8 rounded-lg px-2.5 text-xs font-bold text-red-600 hover:bg-red-50">
                                Sil
                              </button>
                              <button onClick={() => setOpenId(null)} className="ml-auto h-8 rounded-lg bg-surface px-3 text-xs font-bold text-ink shadow-sm hover:bg-line">
                                Tamam
                              </button>
                            </div>
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
                <button onClick={clearAll} className="mt-2 text-xs font-semibold text-red-600 hover:underline">
                  Listeyi temizle
                </button>
              </>
            )}
          </section>

          <section className="card p-4">
            <StepTitle n={3} title="Takımlar" />
            <div className="mt-3 space-y-3">
              {(['B', 'A'] as TeamSide[]).map((side) => {
                const t = side === 'A' ? s.teamA : s.teamB
                return (
                  <div key={side} className="space-y-2">
                    <div className="flex gap-2">
                      <input value={t.name} maxLength={24} onChange={(e) => setTeam(side, { name: e.target.value })} className="input flex-1" aria-label="Takım adı" />
                      <select
                        value={t.formation.join('-')}
                        onChange={(e) => setTeam(side, { formation: e.target.value.split('-').map(Number), positions: [] })}
                        className="input w-28"
                        aria-label="Diziliş"
                      >
                        {FORMATIONS[s.perSide]!.map((f) => (
                          <option key={f.join('-')} value={f.join('-')}>
                            {formationLabel(f)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex gap-1.5">
                      {TEAM_COLORS.map((c) => (
                        <button
                          key={c}
                          onClick={() => setTeam(side, { color: c })}
                          className={`h-6 w-6 rounded-full border ${t.color === c ? 'ring-2 ring-brand ring-offset-2' : 'border-black/15'}`}
                          style={{ background: c }}
                          aria-label={`Renk ${c}`}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button onClick={() => doDistribute('auto')} className="btn-primary">
                <Icon name="users" size={18} /> {hasStars ? 'Dengeli dağıt' : 'Dağıt'}
              </button>
              <button onClick={() => doDistribute('random')} className="btn-ghost">
                <Icon name="shuffle" size={18} /> Rastgele
              </button>
            </div>
          </section>
        </div>

        {/* Sağ: saha ve paylaşım */}
        <div className="space-y-4 lg:sticky lg:top-20">
          <div className="grid grid-cols-2 gap-2">
            <button onClick={saveImage} disabled={busy} className="btn-primary disabled:opacity-60">
              <Icon name="download" size={18} /> {busy ? 'Hazırlanıyor…' : 'Görsel kaydet'}
            </button>
            <button onClick={copyLink} className="btn-ghost">
              <Icon name="link" size={18} /> Linki kopyala
            </button>
          </div>

          <Pitch
            match={match}
            players={playerMap}
            editable
            onMove={(side, index, pos) => setS((cur) => {
              const m = moveOnPitch(toMatch(cur), side, index, pos)
              return { ...cur, teamA: m.teamA, teamB: m.teamB }
            })}
            onSlotClick={(side, index) => setPicker({ side, index })}
          />
          <p className="text-center text-xs text-muted">Oyuncuları sürükleyerek yerini değiştir; karşı yarıya bırakırsan takım değiştirir. Bir yere dokun: oyuncu seç.</p>

          {hasStars && s.teamA.slots.some(Boolean) && s.teamB.slots.some(Boolean) && <StrengthCompare s={s} />}

          {bench.length > 0 && (
            <div className="card p-3">
              <div className="mb-2 text-xs font-semibold text-muted">Yedekler ({bench.length})</div>
              <div className="flex flex-wrap gap-1.5">
                {bench.map((p) => (
                  <span key={p.id} className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium">
                    {p.name}
                    {p.gk && <span className="ml-1 text-amber-600">KL</span>}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <Sheet open={!!picker} onClose={() => setPicker(null)} title={pickerCurrent ? 'Oyuncuyu değiştir' : 'Oyuncu seç'}>
        {picker && (
          <div className="space-y-1">
            {pickerCurrent && (
              <button onClick={() => assign(picker.side, picker.index, null)} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-red-600 hover:bg-red-50">
                <Icon name="close" size={18} /> Yedeğe al ({playerMap.get(pickerCurrent)?.name})
              </button>
            )}
            {bench.length === 0 && !pickerCurrent && <p className="px-3 py-4 text-sm text-muted">Yedekte oyuncu yok. Soldan oyuncu ekle.</p>}
            {bench.map((p) => (
              <button key={p.id} onClick={() => assign(picker.side, picker.index, p.id)} className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm hover:bg-surface-2">
                <span className="font-medium">
                  {p.name} {p.gk && <span className="text-xs text-amber-600">KL</span>}
                </span>
                {p.stars > 0 && <span className="text-xs text-amber-500">{'★'.repeat(p.stars)}</span>}
              </button>
            ))}
          </div>
        )}
      </Sheet>

      {sheetPlayer && (
        <Sheet open onClose={() => setSheetId(null)} title={`Oyuncu ${sheetIndex + 1} / ${s.players.length}`}>
          <PlayerDetail
            player={sheetPlayer}
            onChange={(patch) => updatePlayer(sheetPlayer.id, patch)}
            onRemove={() => {
              removePlayer(sheetPlayer.id)
              setSheetId(null)
            }}
            onPrev={() => setSheetId(s.players[(sheetIndex - 1 + s.players.length) % s.players.length]!.id)}
            onNext={() => setSheetId(s.players[(sheetIndex + 1) % s.players.length]!.id)}
          />
        </Sheet>
      )}

      {toast && (
        <div className="fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 lg:bottom-8" role="status">
          <div className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-white shadow-lg">{toast}</div>
        </div>
      )}
    </div>
  )
}

const initialsOf = (name: string) =>
  name
    .split(/[\s.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0]!.toLocaleUpperCase('tr'))
    .join('')

/** Genel güç (10 üzerinden); hiç puan yoksa null */
const scoreOf = (p: LineupPlayer) => (attrsOf(p) || p.stars > 0 ? powerOf(p) : null)

/** Baş harf rozeti: puanlıysa yeşil halkalı */
function Avatar({ player, size = 36 }: { player: LineupPlayer; size?: number }) {
  const rated = scoreOf(player) != null
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full text-xs font-extrabold ${rated ? 'bg-green-100 text-green-800 ring-2 ring-green-300' : 'bg-surface-2 text-muted ring-2 ring-line'}`}
      style={{ width: size, height: size }}
    >
      {initialsOf(player.name)}
    </span>
  )
}

/** Liste satırı: avatar, isim, 5 özelliğin minik çubukları, genel puan ve kalem ikonu. Satırın tamamı tıklanır. */
function PlayerRow({ player, open, onTap }: { player: LineupPlayer; open: boolean; onTap: () => void }) {
  const a = attrsOf(player)
  const score = scoreOf(player)
  return (
    <button onClick={onTap} aria-expanded={open} className="group flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-surface-2/70">
      <Avatar player={player} />
      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="flex items-center gap-1.5 truncate text-sm font-semibold">
          {player.name}
          {player.gk && <span className="rounded bg-amber-100 px-1 text-[10px] font-extrabold text-amber-800">KL</span>}
        </span>
        {a ? (
          <span className="flex gap-[3px]" aria-hidden>
            {ATTR_KEYS.map((k) => (
              <span key={k} className="block h-1 w-[22px] overflow-hidden rounded-full bg-slate-200">
                <span className="block h-1 bg-green-400" style={{ width: `${(a[k] ?? 0) * 10}%` }} />
              </span>
            ))}
          </span>
        ) : (
          <span className="text-[11px] text-slate-400">{score != null ? 'Genel puan · ayrıntı için dokun' : 'Puanlanmadı · dokun'}</span>
        )}
      </span>
      {score != null && <span className="text-[15px] font-extrabold tabular-nums text-green-800">{score.toFixed(1)}</span>}
      <Icon name="edit" size={15} className={`shrink-0 ${open ? 'text-brand' : 'text-slate-400 group-hover:text-ink'}`} />
    </button>
  )
}

/** Kaydırıcılar + hızlı genel puan (yıldız). Masaüstü satırında ve mobil pencerede ortak. */
function PlayerEditor({ player, onChange }: { player: LineupPlayer; onChange: (patch: Partial<LineupPlayer>) => void }) {
  const detailed = !!attrsOf(player)
  return (
    <div>
      {ATTR_KEYS.map((k) => (
        <AttrSlider key={k} label={ATTR_LABELS[k].long} value={player.attrs?.[k] ?? 0} onChange={(v) => onChange({ attrs: { ...player.attrs, [k]: v } })} />
      ))}
      <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-muted">
        {detailed ? (
          <>
            <span>Girilmeyen özellik genel puanı alır.</span>
            <button onClick={() => onChange({ attrs: undefined })} className="font-semibold text-red-600 hover:underline">
              Ayrıntıyı temizle
            </button>
          </>
        ) : (
          <>
            <span>Ya da hızlı genel puan:</span>
            <Stars value={player.stars} onChange={(v) => onChange({ stars: v })} />
          </>
        )}
      </div>
    </div>
  )
}

function GkToggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={`h-8 rounded-lg border px-3 text-xs font-bold ${on ? 'border-amber-300 bg-amber-100 text-amber-800' : 'border-line bg-surface text-muted hover:text-ink'}`}
    >
      Kaleci
    </button>
  )
}

/** Mobilde alttan açılan pencerenin içeriği: başlık, hızlı oyuncu tipi, kaydırıcılar, kaleci/sil, önceki/sonraki */
function PlayerDetail({
  player,
  onChange,
  onRemove,
  onPrev,
  onNext,
}: {
  player: LineupPlayer
  onChange: (patch: Partial<LineupPlayer>) => void
  onRemove: () => void
  onPrev: () => void
  onNext: () => void
}) {
  const score = scoreOf(player)
  const preset = Object.entries(ATTR_PRESETS).find(([, v]) => ATTR_KEYS.every((k) => (player.attrs?.[k] ?? 0) === v[k]))?.[0]
  return (
    <div className="px-1">
      <div className="flex items-center gap-3 pb-3">
        <Avatar player={player} size={40} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-base font-extrabold">{player.name}</div>
          <div className="text-xs text-muted">
            {player.gk ? 'Kaleci · ' : ''}
            {attrsOf(player) ? 'Ayrıntılı puan' : score != null ? 'Genel puan' : 'Henüz puanlanmadı'}
          </div>
        </div>
        <span className="text-2xl font-extrabold tabular-nums text-green-800">{score != null ? score.toFixed(1) : '–'}</span>
      </div>

      <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1">
        {Object.entries(ATTR_PRESETS).map(([name, v]) => (
          <button
            key={name}
            onClick={() => onChange({ attrs: { ...v } })}
            className={`h-7 shrink-0 rounded-full border px-2.5 text-[11px] font-bold ${preset === name ? 'border-green-300 bg-green-100 text-green-800' : 'border-line text-muted'}`}
          >
            {name}
          </button>
        ))}
      </div>

      <PlayerEditor player={player} onChange={onChange} />

      <div className="mt-3 flex items-center gap-2 border-t border-line pt-3">
        <GkToggle on={player.gk} onClick={() => onChange({ gk: !player.gk })} />
        <button onClick={onRemove} className="h-8 rounded-lg px-2.5 text-xs font-bold text-red-600">
          Sil
        </button>
        <button onClick={onPrev} aria-label="Önceki oyuncu" className="ml-auto grid h-10 w-11 place-items-center rounded-xl border border-line">
          ←
        </button>
        <button onClick={onNext} className="btn-primary h-10 py-0">
          Sonraki →
        </button>
      </div>
    </div>
  )
}

/** İki takımın ortalama güçlerini yan yana gösterir */
function StrengthCompare({ s }: { s: LineupState }) {
  const a = teamStrength(s, s.teamA)
  const b = teamStrength(s, s.teamB)
  const rows: { label: string; a: number; b: number; strong?: boolean }[] = [
    { label: 'Genel', a: a.power, b: b.power, strong: true },
    ...ATTR_KEYS.map((k) => ({ label: ATTR_LABELS[k].long, a: a.attrs[k], b: b.attrs[k] })),
  ]
  return (
    <div className="card p-3">
      <div className="mb-2 flex items-center justify-between text-xs font-semibold">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full border border-black/15" style={{ background: s.teamB.color }} />
          {s.teamB.name}
        </span>
        <span className="text-muted">Takım güçleri</span>
        <span className="flex items-center gap-1.5">
          {s.teamA.name}
          <span className="h-2.5 w-2.5 rounded-full border border-black/15" style={{ background: s.teamA.color }} />
        </span>
      </div>
      <div className="space-y-1.5">
        {rows.map((r) => {
          const total = r.a + r.b || 1
          return (
            <div key={r.label}>
              <div className={`flex justify-between text-[11px] ${r.strong ? 'font-bold' : 'text-muted'}`}>
                <span className="tabular-nums">{r.b.toFixed(1)}</span>
                <span>{r.label}</span>
                <span className="tabular-nums">{r.a.toFixed(1)}</span>
              </div>
              <div className="mt-0.5 flex h-1.5 overflow-hidden rounded-full bg-surface-2">
                <div className="bg-slate-500" style={{ width: `${(r.b / total) * 100}%` }} />
                <div className="bg-brand" style={{ width: `${(r.a / total) * 100}%` }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StepTitle({ n, title }: { n: number; title: string }) {
  return (
    <h2 className="flex items-center gap-2 font-bold">
      <span className="grid h-6 w-6 place-items-center rounded-full bg-brand/15 text-xs font-extrabold text-brand">{n}</span>
      {title}
    </h2>
  )
}

function Stars({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <span className="flex" role="radiogroup" aria-label="Güç">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          role="radio"
          aria-checked={value === i}
          onClick={() => onChange(value === i ? 0 : i)}
          className={`px-px text-base leading-none ${i <= value ? 'text-amber-400' : 'text-slate-300 hover:text-amber-200'}`}
          aria-label={`${i} yıldız`}
        >
          ★
        </button>
      ))}
    </span>
  )
}
