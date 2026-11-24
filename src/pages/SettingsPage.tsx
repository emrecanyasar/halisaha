import { useRef, useState } from 'react'
import { migrate, useStore } from '../store/StoreContext'
import { Avatar, ConfirmButton, Icon } from '../components/ui'
import { isDemoPlayer } from '../lib/groups'

export default function SettingsPage() {
  const store = useStore()
  const { data } = store
  const fileRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `halisaha-yedek-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const copyData = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(data))
      setMsg('Yedek panoya kopyalandı.')
    } catch {
      setMsg('Kopyalanamadı.')
    }
  }

  const importData = async (file: File) => {
    try {
      const parsed = migrate(JSON.parse(await file.text()))
      if (!parsed) throw new Error()
      store.replaceAll({ ...parsed, currentUserId: data.currentUserId })
      setMsg('Veriler içe aktarıldı.')
    } catch {
      setMsg('Dosya okunamadı. Geçerli bir Halısaha yedeği seç.')
    }
  }

  return (
    <div className="space-y-6 p-4 lg:max-w-2xl">
      <h1 className="text-2xl font-extrabold">Ayarlar</h1>

      <section>
        <div className="section-title">Test: başka oyuncu olarak geç</div>
        <p className="mb-2 px-1 text-xs text-muted">
          Veriler şimdilik sadece bu cihazda olduğu için, oylamayı denemek için şifresiz olarak başka bir oyuncunun yerine geçebilirsin.
          Ortak sunucuya geçince bu bölüm kalkacak.
        </p>
        <div className="card max-h-80 divide-y lg:max-h-[28rem] divide-line overflow-y-auto">
          {data.players.filter((p) => !isDemoPlayer(p.id)).map((p) => (
            <button key={p.id} onClick={() => store.setCurrentUser(p.id)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-surface-2">
              <Avatar player={p} size={32} />
              <span className="flex-1 text-sm">{p.name}</span>
              {data.currentUserId === p.id && <Icon name="check" className="text-brand" />}
            </button>
          ))}
          {data.players.length === 0 && <div className="p-4 text-sm text-muted">Önce oyuncu ekle.</div>}
        </div>
      </section>

      <section>
        <div className="section-title">Veriler</div>
        <p className="mb-2 px-1 text-xs text-muted">
          Şu an veriler sadece bu cihazda (tarayıcıda) tutuluyor. Başka bir cihaza taşımak için yedeği dışa aktarıp orada içe aktarabilirsin.
        </p>
        <div className="card divide-y divide-line">
          {import.meta.env.MODE !== 'single' && (
            <button onClick={exportData} className="w-full px-4 py-3 text-left text-sm hover:bg-surface-2">Yedeği dışa aktar (JSON)</button>
          )}
          <button onClick={() => fileRef.current?.click()} className="w-full px-4 py-3 text-left text-sm hover:bg-surface-2">Yedeği içe aktar</button>
          <button onClick={copyData} className="w-full px-4 py-3 text-left text-sm hover:bg-surface-2">Yedeği panoya kopyala</button>
          <div className="p-2">
            <ConfirmButton className="w-full rounded-lg px-2 py-1 text-left text-sm hover:bg-surface-2" question="Tüm gruplar, maçlar, oylar ve hesaplar silinip başlangıç verisi (takım kadrosu ve ilk grup) yüklenecek. Emin misin?" onConfirm={store.loadSeed}>
              Sıfırla: sadece takım kadrosuyla başla
            </ConfirmButton>
          </div>
          <div className="p-2">
            <ConfirmButton danger className="w-full rounded-lg px-2 py-1 text-left text-sm text-red-600 hover:bg-surface-2" question="Tüm oyuncular, maçlar ve oylar silinecek. Emin misin?" onConfirm={store.clearAll}>
              Her şeyi sil (sıfırdan başla)
            </ConfirmButton>
          </div>
        </div>
        <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])} />
        {msg && <p className="mt-2 px-1 text-xs text-brand">{msg}</p>}
      </section>

      <section className="px-1 text-xs text-muted">
        <div>Halısaha v0.2 · deneme sürümü</div>
        <div>{data.accounts.length} hesap · {data.groups.filter((g) => !g.demo).length} grup · {data.players.filter((p) => !isDemoPlayer(p.id)).length} oyuncu · {data.matches.filter((m) => !m.id.startsWith('demo-')).length} maç · {data.votes.length} oy</div>
      </section>
    </div>
  )
}
