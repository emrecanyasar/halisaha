import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useGroupAccess, useStore } from '../store/StoreContext'
import MatchRow from '../components/MatchRow'
import { Avatar, ConfirmButton, EmptyState, Icon, PageHeader, RatingBadge, Sheet, Tabs } from '../components/ui'
import { POSITION_LABELS } from '../lib/constants'
import { playerSummary } from '../lib/stats'
import { attrColor, formatDayHeader } from '../lib/utils'
import { membersOf } from '../lib/groups'
import type { AppData, Group, Match, Player } from '../types'

type Tab = 'maclar' | 'uyeler' | 'siralama' | 'ayarlar'

export default function GroupPage() {
  const { id } = useParams()
  const { data } = useStore()
  const { group, isMember, canEdit } = useGroupAccess(id)
  const [params, setParams] = useSearchParams()
  const requested = params.get('sekme') as Tab | null
  const tabs: { id: Tab; label: string }[] = [
    { id: 'maclar', label: 'Maçlar' },
    ...(isMember ? [{ id: 'uyeler' as const, label: 'Üyeler' }, { id: 'siralama' as const, label: 'Sıralama' }] : []),
    ...(isMember && !group?.demo ? [{ id: 'ayarlar' as const, label: 'Ayarlar' }] : []),
  ]
  const tab: Tab = tabs.some((t) => t.id === requested) ? requested! : 'maclar'
  const setTab = (t: Tab) => setParams(t === 'maclar' ? {} : { sekme: t }, { replace: true })

  if (!group || (!group.isPublic && !isMember))
    return (
      <div className="p-4">
        <PageHeader title="Grup" />
        <EmptyState
          title={group ? 'Bu grup özel' : 'Grup bulunamadı'}
          text={group ? 'Grubu görmek için yöneticisinden davet kodu iste.' : undefined}
          action={<Link to="/gruplarim" className="btn-ghost">Gruplarım</Link>}
        />
      </div>
    )

  return (
    <div className="pb-6">
      <PageHeader title={group.name} />
      <div className="px-4 lg:px-0">
        <GroupHeader group={group} isMember={isMember} canEdit={canEdit} />
      </div>
      <div className="mt-3">
        <Tabs<Tab> value={tab} onChange={setTab} tabs={tabs} />
      </div>
      <div className="p-4 lg:px-0">
        {tab === 'maclar' && <MatchesTab group={group} canEdit={canEdit} data={data} />}
        {tab === 'uyeler' && <MembersTab group={group} canEdit={canEdit} />}
        {tab === 'siralama' && <RankingTab group={group} />}
        {tab === 'ayarlar' && <SettingsTab group={group} canEdit={canEdit} />}
      </div>
    </div>
  )
}

function GroupHeader({ group, isMember, canEdit }: { group: Group; isMember: boolean; canEdit: boolean }) {
  const store = useStore()
  const [copied, setCopied] = useState(false)
  // Site # tabanlı yönlendirme kullanıyor: .../#/katil/<kod>
  const link = `${window.location.origin}${window.location.pathname}#/katil/${group.inviteCode}`
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      window.prompt('Davet linkini kopyala:', link)
    }
  }
  return (
    <div className="card p-4">
      <div className="flex items-center gap-4">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-brand text-2xl font-extrabold text-white">
          {group.name[0]?.toLocaleUpperCase('tr')}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-lg font-extrabold">{group.name}</div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-muted">{group.memberIds.length} üye</span>
            <span className={`rounded-full px-2 py-0.5 font-semibold ${group.isPublic ? 'bg-green-50 text-green-700' : 'bg-surface-2 text-muted'}`}>
              {group.isPublic ? 'Herkese açık' : 'Özel'}
            </span>
            {canEdit && <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-800">Yöneticisin</span>}
            {group.demo && <span className="rounded-full bg-surface-2 px-2 py-0.5 font-semibold text-muted">Örnek grup</span>}
          </div>
        </div>
      </div>

      {isMember && !group.demo && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-surface-2/70 p-3">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold text-muted">DAVET KODU</div>
            <div className="font-mono text-xl font-extrabold tracking-[0.25em]">{group.inviteCode}</div>
          </div>
          <button onClick={copy} className="btn-primary py-2">
            <Icon name={copied ? 'check' : 'link'} size={16} /> {copied ? 'Kopyalandı' : 'Davet linkini kopyala'}
          </button>
          {canEdit && (
            <button onClick={() => store.regenerateInviteCode(group.id)} className="text-xs font-semibold text-muted hover:text-ink" title="Eski kod geçersiz olur">
              Kodu yenile
            </button>
          )}
        </div>
      )}
      {!isMember && !group.demo && (
        <p className="mt-3 text-xs text-muted">Bu gruba katılmak için yöneticisinden davet kodu ya da linki iste.</p>
      )}
    </div>
  )
}

function MatchesTab({ group, canEdit, data }: { group: Group; canEdit: boolean; data: AppData }) {
  const matches = data.matches.filter((m) => m.groupId === group.id)
  const key = (m: Match) => m.date + m.time
  const upcoming = matches.filter((m) => m.status === 'planned').sort((a, b) => (key(a) < key(b) ? -1 : 1))
  const finished = matches.filter((m) => m.status === 'finished').sort((a, b) => (key(a) < key(b) ? 1 : -1))
  const section = (title: string, list: Match[]) =>
    list.length > 0 && (
      <section>
        <div className="section-title">{title}</div>
        <div className="card divide-y divide-line overflow-hidden">
          {list.map((m) => (
            <div key={m.id}>
              <div className="px-4 pt-2 text-[11px] font-semibold capitalize text-muted">{formatDayHeader(m.date)}</div>
              <MatchRow match={m} votes={data.votes} currentUserId={data.currentUserId} />
            </div>
          ))}
        </div>
      </section>
    )
  return (
    <div className="space-y-5">
      {canEdit && (
        <Link to={`/mac/yeni?grup=${group.id}`} className="btn-primary w-full lg:w-auto">
          <Icon name="plus" size={18} /> Maç oluştur
        </Link>
      )}
      {matches.length === 0 && (
        <EmptyState title="Henüz maç yok" text={canEdit ? 'İlk maçı oluştur, üyeler katılımlarını bildirsin.' : 'Yönetici maç oluşturunca burada görünecek.'} />
      )}
      {section('Yaklaşan', upcoming)}
      {section('Biten', finished)}
    </div>
  )
}

function MembersTab({ group, canEdit }: { group: Group; canEdit: boolean }) {
  const store = useStore()
  const { data } = store
  const members = membersOf(data, group)
  const [selected, setSelected] = useState<Player | null>(null)
  const hasAccount = (pid: string) => data.accounts.some((a) => a.playerId === pid)
  const me = data.currentUserId
  return (
    <div className="space-y-3">
      {canEdit && (
        <div className="flex flex-wrap gap-2">
          <Link to={`/oyuncu/yeni?grup=${group.id}`} className="btn-ghost">
            <Icon name="plus" size={16} /> Hesapsız oyuncu ekle
          </Link>
          <p className="basis-full text-xs text-muted">
            Arkadaşların davet linkiyle kendi hesaplarıyla katılabilir. Hesabı olmayanları buradan ekleyip kadroya koyabilirsin.
          </p>
        </div>
      )}
      <div className="card divide-y divide-line overflow-hidden">
        {members.map((p) => {
          const admin = group.adminIds.includes(p.id)
          const s = playerSummary(data, p)
          return (
            <div key={p.id} className="flex items-center gap-3 px-4 py-2.5">
              <Link to={`/oyuncu/${p.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar player={p} size={36} />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 truncate text-sm font-semibold">
                    {p.name}
                    {p.id === me && <span className="text-[11px] font-semibold text-brand">(sen)</span>}
                  </div>
                  <div className="flex flex-wrap gap-1 text-[11px] text-muted">
                    {POSITION_LABELS[p.position]}
                    {admin && <span className="rounded bg-amber-100 px-1 font-semibold text-amber-800">Yönetici</span>}
                    {!hasAccount(p.id) && !group.demo && <span className="rounded bg-surface-2 px-1 font-semibold">Hesapsız</span>}
                  </div>
                </div>
              </Link>
              <span className="text-sm font-extrabold" style={{ color: s.ovr != null ? attrColor(s.ovr) : '#94a3b8' }}>{s.ovr ?? '–'}</span>
              {canEdit && p.id !== me && (
                <button onClick={() => setSelected(p)} className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-ink" aria-label={`${p.name} için işlemler`}>
                  <Icon name="settings" size={16} />
                </button>
              )}
            </div>
          )
        })}
      </div>

      <Sheet open={!!selected} onClose={() => setSelected(null)} title={selected?.name ?? ''}>
        {selected && (
          <div className="space-y-1">
            {group.adminIds.includes(selected.id) ? (
              <button className="w-full rounded-xl px-3 py-3 text-left text-sm hover:bg-surface-2" onClick={() => { store.setAdmin(group.id, selected.id, false); setSelected(null) }}>
                Yöneticilikten çıkar
              </button>
            ) : (
              hasAccount(selected.id) && (
                <button className="w-full rounded-xl px-3 py-3 text-left text-sm hover:bg-surface-2" onClick={() => { store.setAdmin(group.id, selected.id, true); setSelected(null) }}>
                  Yönetici yap
                </button>
              )
            )}
            {!hasAccount(selected.id) && (
              <Link to={`/oyuncu/${selected.id}/duzenle`} className="block w-full rounded-xl px-3 py-3 text-left text-sm hover:bg-surface-2">
                Profili düzenle
              </Link>
            )}
            <div className="p-1">
              <ConfirmButton
                danger
                className="w-full rounded-xl px-2 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                question={`${selected.name} gruptan çıkarılacak. Geçmiş maçları ve oyları korunur.`}
                onConfirm={() => { store.removeMember(group.id, selected.id); setSelected(null) }}
              >
                Gruptan çıkar
              </ConfirmButton>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  )
}

type Sort = 'ovr' | 'rating' | 'goals' | 'mvps'
const SORTS: { id: Sort; label: string }[] = [
  { id: 'ovr', label: 'Genel' },
  { id: 'rating', label: 'Ort. rating' },
  { id: 'goals', label: 'Gol' },
  { id: 'mvps', label: 'MVP' },
]

/** Grup içi sıralama: istatistikler sadece bu grubun maçlarından hesaplanır */
function RankingTab({ group }: { group: Group }) {
  const { data } = useStore()
  const [sort, setSort] = useState<Sort>('ovr')
  const rows = useMemo(() => {
    const ids = new Set(data.matches.filter((m) => m.groupId === group.id).map((m) => m.id))
    const scoped: AppData = { ...data, matches: data.matches.filter((m) => ids.has(m.id)), votes: data.votes.filter((v) => ids.has(v.matchId)) }
    const s = membersOf(data, group).map((p) => playerSummary(scoped, p))
    const key = (x: (typeof s)[number]) => (sort === 'ovr' ? x.ovr ?? -1 : sort === 'rating' ? x.avgRating ?? -1 : sort === 'goals' ? x.goals : x.mvps)
    return s.sort((a, b) => key(b) - key(a) || a.player.name.localeCompare(b.player.name, 'tr'))
  }, [data, group, sort])

  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto">
        {SORTS.map((s) => (
          <button
            key={s.id}
            onClick={() => setSort(s.id)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${sort === s.id ? 'bg-ink text-white' : 'bg-surface-2 text-muted'}`}
          >
            {s.label}
          </button>
        ))}
      </div>
      <div className="card divide-y divide-line overflow-hidden">
        {rows.map((r, i) => (
          <Link key={r.player.id} to={`/oyuncu/${r.player.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2">
            <span className="w-5 text-center text-xs font-semibold text-muted">{i + 1}</span>
            <Avatar player={r.player} size={36} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{r.player.name}</div>
              <div className="text-xs text-muted">
                {r.matches} maç · {r.goals} gol{r.mvps > 0 && ` · ⭐${r.mvps}`}
              </div>
            </div>
            <RatingBadge value={r.avgRating} size="sm" />
            <span
              className="grid h-9 w-9 place-items-center rounded-lg text-sm font-extrabold"
              style={{ background: r.ovr != null ? attrColor(r.ovr) + '33' : '#eef0f4', color: r.ovr != null ? attrColor(r.ovr) : '#6b7280' }}
              title="Genel puan (bu gruptaki oylardan)"
            >
              {r.ovr ?? '–'}
            </span>
          </Link>
        ))}
      </div>
      <p className="px-1 text-xs text-muted">Sıralama sadece bu grubun maçlarından hesaplanır. Oyuncu kartları ise tüm gruplardaki oylardan oluşur.</p>
    </div>
  )
}

function SettingsTab({ group, canEdit }: { group: Group; canEdit: boolean }) {
  const store = useStore()
  const nav = useNavigate()
  const me = store.data.currentUserId!
  const [name, setName] = useState(group.name)
  const onlyAdmin = canEdit && group.adminIds.length === 1 && group.memberIds.length > 1
  return (
    <div className="space-y-4 lg:max-w-xl">
      {canEdit && (
        <div className="card space-y-4 p-4">
          <div>
            <label className="label" htmlFor="gn">Grup adı</label>
            <div className="flex gap-2">
              <input id="gn" className="input" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
              <button className="btn-primary" disabled={name.trim().length < 2 || name.trim() === group.name} onClick={() => store.updateGroup(group.id, { name: name.trim() })}>
                Kaydet
              </button>
            </div>
          </div>
          <label className="flex items-start gap-2.5 text-sm">
            <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[var(--color-brand)]" checked={group.isPublic} onChange={(e) => store.updateGroup(group.id, { isPublic: e.target.checked })} />
            <span>
              Maçlar herkese açık
              <span className="block text-xs text-muted">Açıkken maçlar ana sayfada herkese görünür. Katılmak yine davet kodu ister.</span>
            </span>
          </label>
        </div>
      )}

      <div className="card space-y-2 p-3">
        {onlyAdmin ? (
          <p className="px-1 py-2 text-xs text-muted">Gruptaki tek yöneticisin. Ayrılmadan önce Üyeler sekmesinden başka birini yönetici yap.</p>
        ) : (
          <ConfirmButton
            className="w-full rounded-lg px-2 py-2 text-left text-sm hover:bg-surface-2"
            question="Gruptan ayrılacaksın. Geçmiş maçların ve oyların korunur."
            onConfirm={() => {
              store.removeMember(group.id, me)
              nav('/gruplarim', { replace: true })
            }}
          >
            Gruptan ayrıl
          </ConfirmButton>
        )}
        {canEdit && (
          <ConfirmButton
            danger
            className="w-full rounded-lg px-2 py-2 text-left text-sm text-red-600 hover:bg-red-50"
            question="Grup, tüm maçları ve oyları kalıcı olarak silinecek. Emin misin?"
            onConfirm={() => {
              store.deleteGroup(group.id)
              nav('/gruplarim', { replace: true })
            }}
          >
            Grubu sil
          </ConfirmButton>
        )}
      </div>
    </div>
  )
}
