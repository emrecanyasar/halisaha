import { supabase } from './supabase'
import type { ServerAggregates } from './server'
import type { Account, AppData, Attendance, Attributes, BaseVote, Group, Match, OpponentAd, Player, Team, Vote } from '../types'

/**
 * Veritabanı (Supabase) okuma / yazma. Tablolar ve güvenlik kuralları: supabase/schema.sql.
 * Satırlar uygulamanın tiplerine burada çevrilir; sayfalar veritabanını bilmez.
 */

const db = () => {
  if (!supabase) throw new Error('Supabase bağlı değil')
  return supabase
}

/** Supabase hatasını kullanıcıya gösterilecek metne çevirir */
const check = <T>(r: { data: T; error: { message: string } | null }): T => {
  if (r.error) throw new Error(r.error.message)
  return r.data
}

type Row = Record<string, unknown>
const num = (v: unknown) => Number(v)
const attrsOf = (r: Row): Attributes => ({
  hucum: num(r.hucum),
  teknik: num(r.teknik),
  pas: num(r.pas),
  savunma: num(r.savunma),
  fizik: num(r.fizik),
  // Hız sonradan eklendi; eski oylarda boşsa fizik puanı kullanılır
  hiz: r.hiz == null ? num(r.fizik) : num(r.hiz),
})

const toPlayer = (r: Row): Player => ({
  id: r.id as string,
  name: r.name as string,
  number: num(r.number),
  foot: r.foot as Player['foot'],
  size: (r.size as Player['size']) ?? undefined,
  position: r.position as Player['position'],
  position2: (r.position2 as Player['position2']) ?? undefined,
  legacyRating: !!r.legacy_rating,
  createdAt: r.created_at as string,
})

const toMatch = (r: Row, attendance: Record<string, Attendance> | undefined): Match => ({
  id: r.id as string,
  groupId: r.group_id as string,
  date: r.date as string,
  time: r.time as string,
  venue: r.venue as string,
  playersPerSide: num(r.players_per_side),
  status: r.status as Match['status'],
  teamA: r.team_a as Team,
  teamB: r.team_b as Team,
  goals: (r.goals as Match['goals']) ?? [],
  votingClosed: !!r.voting_closed,
  attendance,
  createdAt: r.created_at as string,
})

const toAd = (r: Row): OpponentAd => ({
  id: r.id as string,
  ownerId: r.owner_id as string,
  groupId: (r.group_id as string) ?? undefined,
  teamName: r.team_name as string,
  date: r.date as string,
  time: r.time as string,
  venue: r.venue as string,
  playersPerSide: num(r.players_per_side),
  level: r.level as OpponentAd['level'],
  feeSplit: r.fee_split as OpponentAd['feeSplit'],
  phone: (r.phone as string) ?? '',
  note: (r.note as string) ?? undefined,
  status: r.status as OpponentAd['status'],
  createdAt: r.created_at as string,
})

const AD_PUBLIC_COLUMNS = 'id, owner_id, group_id, team_name, date, time, venue, players_per_side, level, fee_split, note, status, created_at'

/** Görülebilen her şeyi tek seferde çeker (veri az olduğu için basit tutuldu) */
export async function fetchAll(): Promise<AppData> {
  const s = db()
  const { data: sess } = await s.auth.getSession()
  const user = sess.session?.user ?? null

  const [players, groups, members, codes, matches, attendance, votes, baseVotes, ads, stats, ratings, averages, base] = await Promise.all([
    s.from('players').select('*').then(check),
    s.from('groups').select('id, name, is_public, created_at').then(check),
    s.from('group_members').select('*').then(check),
    user ? s.rpc('my_invite_codes').then(check) : Promise.resolve([]),
    s.from('matches').select('*').then(check),
    s.from('attendance').select('*').then(check),
    user ? s.from('votes').select('*').then(check) : Promise.resolve([]),
    user ? s.from('base_votes').select('*').then(check) : Promise.resolve([]),
    s.from('opponent_ads').select(user ? '*' : AD_PUBLIC_COLUMNS).then(check),
    s.rpc('match_stats').then(check),
    s.rpc('all_match_ratings').then(check),
    s.rpc('all_player_averages').then(check),
    s.rpc('all_player_base').then(check),
  ])

  const playerRows = players as Row[]
  const me = user ? playerRows.find((p) => p.user_id === user.id) : undefined
  const codeOf = new Map((codes as Row[]).map((c) => [c.group_id as string, c.invite_code as string]))
  const memberRows = members as Row[]

  const att = new Map<string, Record<string, Attendance>>()
  for (const a of attendance as Row[]) {
    const m = att.get(a.match_id as string) ?? {}
    m[a.player_id as string] = a.status as Attendance
    att.set(a.match_id as string, m)
  }

  const server: ServerAggregates = { matchStats: {}, ratings: {}, averages: {}, base: {} }
  for (const r of stats as Row[])
    server.matchStats[r.match_id as string] = { total: num(r.total), done: num(r.done), iVoted: !!r.i_voted, revealed: !!r.revealed }
  for (const r of ratings as Row[]) (server.ratings[r.match_id as string] ??= []).push({ playerId: r.player_id as string, rating: num(r.rating), votes: num(r.votes) })
  for (const r of averages as Row[])
    (server.averages[r.player_id as string] ??= []).push({ matchId: r.match_id as string, date: r.match_date as string, time: r.match_time as string, votes: num(r.votes), attrs: attrsOf(r) })
  for (const r of base as Row[])
    server.base[r.player_id as string] = { count: num(r.vote_count), required: num(r.required), attrs: r.hucum == null ? null : attrsOf(r) }

  // Hesaplar: diğer kullanıcıların e-postası gelmez; sadece "hesabı var" bilgisi
  const accounts: Account[] = playerRows
    .filter((p) => p.user_id)
    .map((p) => ({ id: p.user_id as string, email: p.user_id === user?.id ? (user?.email ?? '') : '', passwordHash: '', playerId: p.id as string, createdAt: p.created_at as string }))

  return {
    version: 10,
    players: playerRows.map(toPlayer),
    groups: (groups as Row[]).map(
      (g): Group => ({
        id: g.id as string,
        name: g.name as string,
        inviteCode: codeOf.get(g.id as string) ?? '',
        isPublic: !!g.is_public,
        memberIds: memberRows.filter((m) => m.group_id === g.id).map((m) => m.player_id as string),
        adminIds: memberRows.filter((m) => m.group_id === g.id && m.is_admin).map((m) => m.player_id as string),
        createdAt: g.created_at as string,
      }),
    ),
    matches: (matches as Row[]).map((m) => toMatch(m, att.get(m.id as string))),
    votes: (votes as Row[]).map(
      (v): Vote => ({ id: v.id as string, matchId: v.match_id as string, voterId: v.voter_id as string, targetId: v.target_id as string, attrs: attrsOf(v), createdAt: v.created_at as string }),
    ),
    baseVotes: (baseVotes as Row[]).map(
      (v): BaseVote => ({ id: `${v.voter_id}-${v.target_id}`, voterId: v.voter_id as string, targetId: v.target_id as string, attrs: v.hucum == null ? null : attrsOf(v), createdAt: v.created_at as string }),
    ),
    opponentAds: (ads as unknown as Row[]).map(toAd),
    accounts,
    currentUserId: (me?.id as string) ?? null,
    server,
  }
}

// ---------------------------- Yazma işlemleri ----------------------------

const matchRow = (m: Match) => ({
  id: m.id,
  group_id: m.groupId,
  date: m.date,
  time: m.time,
  venue: m.venue,
  players_per_side: m.playersPerSide,
  status: m.status,
  team_a: m.teamA,
  team_b: m.teamB,
  goals: m.goals,
  voting_closed: m.votingClosed,
})

const playerRow = (p: Partial<Player>) => {
  const r: Row = {}
  if (p.name !== undefined) r.name = p.name
  if (p.number !== undefined) r.number = p.number
  if (p.foot !== undefined) r.foot = p.foot
  if ('size' in p) r.size = p.size ?? null
  if (p.position !== undefined) r.position = p.position
  if ('position2' in p) r.position2 = p.position2 ?? null
  return r
}

export const remote = {
  async signIn(email: string, password: string) {
    const r = await db().auth.signInWithPassword({ email, password })
    if (r.error) throw new Error(r.error.message === 'Invalid login credentials' ? 'E-posta ya da şifre hatalı.' : r.error.message)
  },
  async signUp(email: string, password: string) {
    const r = await db().auth.signUp({ email, password })
    if (r.error) throw new Error(r.error.message.includes('already registered') ? 'Bu e-posta ile zaten bir hesap var.' : r.error.message)
    if (!r.data.session) throw new Error('Hesap oluşturuldu. E-postana gelen onay linkine tıklayıp giriş yap.')
    return r.data.session.user.id
  },
  async signOut() {
    await db().auth.signOut()
  },
  async updateEmail(email: string) {
    const r = await db().auth.updateUser({ email })
    if (r.error) throw new Error(r.error.message)
  },
  async changePassword(email: string, current: string, next: string) {
    const v = await db().auth.signInWithPassword({ email, password: current })
    if (v.error) throw new Error('Mevcut şifre hatalı.')
    const r = await db().auth.updateUser({ password: next })
    if (r.error) throw new Error(r.error.message)
  },

  async createOwnPlayer(userId: string, p: Pick<Player, 'id' | 'name' | 'position' | 'position2' | 'number' | 'foot'>) {
    check(await db().from('players').insert({ id: p.id, user_id: userId, ...playerRow(p) }))
  },
  async claimPlayer(playerId: string) {
    check(await db().rpc('claim_player', { pid: playerId }))
  },
  async addGuestPlayer(groupId: string, p: Player) {
    check(
      await db().rpc('add_guest_player', {
        p_id: p.id,
        g: groupId,
        p_name: p.name,
        p_number: p.number,
        p_foot: p.foot,
        p_size: p.size ?? null,
        p_position: p.position,
        p_position2: p.position2 ?? null,
      }),
    )
  },
  async updatePlayer(id: string, patch: Partial<Player>) {
    const row = playerRow(patch)
    if (Object.keys(row).length) check(await db().from('players').update(row).eq('id', id))
  },
  async deletePlayer(id: string) {
    check(await db().from('players').delete().eq('id', id))
  },

  async createGroup(g: Group) {
    check(await db().rpc('create_group', { p_id: g.id, p_name: g.name, p_public: g.isPublic }))
  },
  async joinGroup(code: string): Promise<string> {
    return check(await db().rpc('join_group', { p_code: code })) as string
  },
  async invitePreview(code: string) {
    const rows = check(await db().rpc('invite_preview', { p_code: code })) as Row[]
    const r = rows[0]
    return r ? { id: r.group_id as string, name: r.name as string, members: num(r.member_count), admins: (r.admin_names as string[]) ?? [] } : null
  },
  async updateGroup(id: string, patch: Partial<Pick<Group, 'name' | 'isPublic'>>) {
    const row: Row = {}
    if (patch.name !== undefined) row.name = patch.name
    if (patch.isPublic !== undefined) row.is_public = patch.isPublic
    check(await db().from('groups').update(row).eq('id', id))
  },
  async regenerateInviteCode(id: string) {
    check(await db().rpc('regenerate_invite_code', { g: id }))
  },
  async deleteGroup(id: string) {
    check(await db().from('groups').delete().eq('id', id))
  },
  async removeMember(groupId: string, playerId: string) {
    check(await db().from('group_members').delete().eq('group_id', groupId).eq('player_id', playerId))
  },
  async setAdmin(groupId: string, playerId: string, on: boolean) {
    check(await db().from('group_members').update({ is_admin: on }).eq('group_id', groupId).eq('player_id', playerId))
  },

  async saveMatch(m: Match) {
    check(await db().from('matches').upsert(matchRow(m)))
  },
  async deleteMatch(id: string) {
    check(await db().from('matches').delete().eq('id', id))
  },
  async reopenMatch(id: string) {
    check(await db().rpc('reopen_match', { mid: id }))
  },
  async setAttendance(matchId: string, playerId: string, value: Attendance | null) {
    if (value) check(await db().from('attendance').upsert({ match_id: matchId, player_id: playerId, status: value }))
    else check(await db().from('attendance').delete().eq('match_id', matchId).eq('player_id', playerId))
  },

  async submitVotes(matchId: string, voterId: string, entries: { targetId: string; attrs: Attributes }[]) {
    const rows = entries.map((e) => ({ match_id: matchId, voter_id: voterId, target_id: e.targetId, ...e.attrs }))
    check(await db().from('votes').upsert(rows, { onConflict: 'match_id,voter_id,target_id' }))
  },
  async submitBaseVote(voterId: string, targetId: string, attrs: Attributes | null) {
    const a = attrs ?? { hucum: null, teknik: null, pas: null, savunma: null, fizik: null, hiz: null }
    check(await db().from('base_votes').upsert({ voter_id: voterId, target_id: targetId, ...a, created_at: new Date().toISOString() }, { onConflict: 'voter_id,target_id' }))
  },

  async createAd(ad: OpponentAd) {
    check(
      await db().from('opponent_ads').insert({
        id: ad.id,
        owner_id: ad.ownerId,
        group_id: ad.groupId ?? null,
        team_name: ad.teamName,
        date: ad.date,
        time: ad.time,
        venue: ad.venue,
        players_per_side: ad.playersPerSide,
        level: ad.level,
        fee_split: ad.feeSplit,
        phone: ad.phone,
        note: ad.note ?? null,
        status: ad.status,
      }),
    )
  },
  async setAdStatus(id: string, status: OpponentAd['status']) {
    check(await db().from('opponent_ads').update({ status }).eq('id', id))
  },
  async deleteAd(id: string) {
    check(await db().from('opponent_ads').delete().eq('id', id))
  },
}
