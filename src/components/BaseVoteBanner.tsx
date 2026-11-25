import { useMemo, useState } from 'react'
import { usePlayerMap, useStore } from '../store/StoreContext'
import { Avatar, Sheet } from './ui'
import AttrSlider from './AttrSlider'
import { attrKeysFor, attrLabels, keyAttrs, positionText } from '../lib/constants'
import { WATCH_AFTER, baseVoteQueue, overallOf } from '../lib/rating'
import { attrColor } from '../lib/utils'
import { ATTR_KEYS, type Attributes } from '../types'

const DEFAULT: Attributes = { hucum: 6, teknik: 6, pas: 6, savunma: 6, fizik: 6, hiz: 6 }

/** Grup sayfasının üstünde: kartı henüz açılmamış yeni üyeleri gizlice değerlendirme bandı */
export default function BaseVoteBanner({ groupId }: { groupId: string }) {
  const store = useStore()
  const { data } = store
  const players = usePlayerMap()
  const { waiting: pending, skipped } = useMemo(() => baseVoteQueue(data, data.currentUserId, groupId), [data, groupId])
  // Panel açıkken liste kaymasın diye sıra açılışta sabitlenir
  const [queue, setQueue] = useState<string[] | null>(null)
  const [pos, setPos] = useState(0)
  const [vals, setVals] = useState<Attributes>(DEFAULT)

  const close = () => setQueue(null)
  const open = (list: string[]) => {
    setQueue(list)
    setPos(0)
    setVals(DEFAULT)
  }
  const finish = (attrs: Attributes | null) => {
    if (!queue) return
    store.submitBaseVote(queue[pos]!, attrs)
    setVals(DEFAULT)
    if (pos + 1 < queue.length) setPos(pos + 1)
    else close()
  }

  const target = queue ? players.get(queue[pos]!) : undefined
  const ovr = overallOf(Object.fromEntries(ATTR_KEYS.map((k) => [k, vals[k] * 10])) as Attributes, target?.position)
  const labels = attrLabels(target?.position)
  const important = target ? keyAttrs(target.position) : []

  return (
    <>
      {pending.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-green-200 bg-green-50 p-3.5">
          <div className="flex">
            {pending.slice(0, 4).map((id) => (
              <span key={id} className="-mr-2 rounded-full ring-2 ring-green-50">
                <Avatar player={players.get(id)} size={34} color="#16a34a" />
              </span>
            ))}
          </div>
          <div className="min-w-[180px] flex-1 pl-2">
            <div className="text-sm font-bold text-green-900">
              {pending.length} grup arkadaşın ilk değerlendirmeni bekliyor
            </div>
            <div className="text-xs text-green-800">Gizli; kimse kimin kaç verdiğini görmez. Kartları bu puanlarla açılır.</div>
          </div>
          <button className="btn-primary" onClick={() => open(pending)}>
            Değerlendir
          </button>
        </div>
      )}
      {skipped.length > 0 && (
        <div className={`flex flex-wrap items-center gap-2 rounded-xl bg-surface-2/70 px-3 py-2 text-xs text-muted ${pending.length ? 'mt-2' : ''}`}>
          <span className="flex-1">
            Henüz izlemediğin için geçtiğin {skipped.length} kişi var. Birlikte {WATCH_AFTER} maç yapınca tekrar sorulur.
          </span>
          <button className="font-semibold text-brand hover:underline" onClick={() => open(skipped)}>
            Şimdi değerlendir
          </button>
        </div>
      )}

      <Sheet open={!!queue && !!target} onClose={close} title={queue && queue.length > 1 ? `İlk değerlendirme · ${pos + 1} / ${queue.length}` : 'İlk değerlendirme'}>
        {target && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Avatar player={target} size={46} color="#16a34a" />
              <div className="min-w-0">
                <div className="truncate font-bold">{target.name}</div>
                <div className="truncate text-xs text-muted">{positionText(target)}</div>
              </div>
            </div>
            <p className="rounded-xl bg-surface-2 px-3 py-2 text-xs leading-relaxed text-muted">
              Onu birlikte oynadığın maçlara göre puanla. Bu puanlar başlangıç kartını belirler; sonra maç oylarıyla artar ya da azalır. Henüz izlemediysen geç: birlikte {WATCH_AFTER} maç yapınca tekrar sorulur. Kimse senin puanladığını ya da geçtiğini görmez.
            </p>
            <div>
              {attrKeysFor(target.position).map((k) => (
                <AttrSlider key={k} label={labels[k].long.split(' /')[0]! + (important.includes(k) ? ' ★' : '')} value={vals[k]} onChange={(n) => setVals((x) => ({ ...x, [k]: n }))} />
              ))}
            </div>
            <div className="flex items-center justify-between text-xs text-muted">
              <span>Senin puanınla başlangıç</span>
              <b className="text-base" style={{ color: attrColor(ovr) }}>{ovr}</b>
            </div>
            <div className="flex gap-2">
              <button className="btn-ghost flex-1" onClick={() => finish(null)}>Henüz izlemedim, sonra</button>
              <button className="btn-primary flex-1" onClick={() => finish(vals)}>Kaydet</button>
            </div>
          </div>
        )}
      </Sheet>
    </>
  )
}
