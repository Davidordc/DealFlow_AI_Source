import { useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, ArrowDownRight, ArrowRight, ArrowUpRight, BarChart3, Bell, CalendarDays, ChevronDown, CircleHelp, Command, LayoutDashboard, Mail, Menu, MoreHorizontal, Phone, Plus, Search, Settings2, Sparkles, Target, Users, X } from 'lucide-react'

type Stage = 'new' | 'contacted' | 'qualified' | 'meeting' | 'proposal' | 'won' | 'lost'
type Prospect = { id: number; name: string; company: string; email: string; phone: string; source: string; stage: Stage; value: number; follow_up_at: string | null; activity_count: number; last_contact_at: string | null; created_at: string }
type ActivityEntry = { id: number; kind: 'call' | 'email' | 'meeting' | 'note'; outcome: string; note: string; created_at: string }
type Dashboard = { total: number; pipeline_value: number; overdue: number; activities_week: number; win_rate: number; stages: Record<Stage, number>; attention: { id: number; name: string; company: string; stage: Stage; reason: string; follow_up_at: string | null }[] }
type View = 'overview' | 'prospects' | 'pipeline' | 'activities'
const stages: Stage[] = ['new', 'contacted', 'qualified', 'meeting', 'proposal', 'won', 'lost']
const stageLabels: Record<Stage, string> = { new: 'New lead', contacted: 'Contacted', qualified: 'Qualified', meeting: 'Meeting', proposal: 'Proposal', won: 'Won', lost: 'Lost' }
const money = (n: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(n)
const dateLabel = (value: string | null) => value ? new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'
const initials = (name: string) => name.split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase()
const avatarColors = ['#dfdaf8', '#f8e4d9', '#d5ebe6', '#f8e9bf', '#dee9fa', '#eedcf0']

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...options, headers: { 'Content-Type': 'application/json', ...options?.headers } })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(typeof body.detail === 'string' ? body.detail : `Request failed (${response.status})`)
  }
  return response.json()
}

function App() {
  const [view, setView] = useState<View>('overview')
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Stage | 'all'>('all')
  const [selected, setSelected] = useState<Prospect | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [mobileNav, setMobileNav] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const [p, d] = await Promise.all([request<Prospect[]>('/api/prospects'), request<Dashboard>('/api/dashboard')])
      setProspects(p); setDashboard(d); setError('')
      setSelected(current => current ? p.find(item => item.id === current.id) || null : null)
    } catch (e) { setError((e as Error).message) } finally { setLoading(false) }
  }, [])
  useEffect(() => { void refresh() }, [refresh])
  const visible = useMemo(() => prospects.filter(p => (filter === 'all' || p.stage === filter) && `${p.name} ${p.company} ${p.email}`.toLowerCase().includes(search.toLowerCase())), [prospects, filter, search])
  const activityLeaders = [...prospects].sort((a, b) => b.activity_count - a.activity_count).slice(0, 5)

  const nav = [
    { key: 'overview' as View, label: 'Overview', icon: LayoutDashboard },
    { key: 'prospects' as View, label: 'Prospects', icon: Users },
    { key: 'pipeline' as View, label: 'Pipeline', icon: Target },
    { key: 'activities' as View, label: 'Activity', icon: Activity }
  ]

  return <div className="shell">
    <aside className={`sidebar ${mobileNav ? 'open' : ''}`}>
      <div className="brand"><div className="brand-mark"><Command size={22} strokeWidth={2.8}/></div><span>dealflow<span className="brand-dot">.</span><small>AI</small></span></div>
      <div className="workspace"><div className="workspace-icon">D</div><div><strong>Demo workspace</strong><span>Free workspace</span></div><ChevronDown size={15}/></div>
      <div className="nav-label">WORKSPACE</div>
      <nav>{nav.map(item => <button key={item.key} className={`nav-item ${view === item.key ? 'active' : ''}`} onClick={() => { setView(item.key); setMobileNav(false) }}><item.icon size={18}/>{item.label}{item.key === 'prospects' && <em>{prospects.length}</em>}</button>)}</nav>
      <div className="nav-label insights-label">INTELLIGENCE</div>
      <button className="nav-item" onClick={() => { setView('overview'); document.getElementById('insights')?.scrollIntoView({ behavior: 'smooth' }) }}><Sparkles size={18}/> Smart insights <span className="new-pill">NEW</span></button>
      <div className="sidebar-bottom"><div className="help-card"><div className="help-icon"><Sparkles size={17}/></div><strong>Make every touchpoint count.</strong><p>Keep your next step clear and your pipeline moving.</p><button onClick={() => setView('prospects')}>Explore prospects <ArrowRight size={14}/></button></div><button className="nav-item muted" onClick={() => setError('Settings will arrive with team accounts in a future release.')}><Settings2 size={18}/> Settings</button><button className="nav-item muted" onClick={() => setError('See PRODUCT.md for the roadmap and current limitations.')}><CircleHelp size={18}/> Help & support</button></div>
    </aside>
    <div className="main-area">
      <header className="topbar"><button className="mobile-menu" onClick={() => setMobileNav(!mobileNav)} aria-label="Toggle menu"><Menu size={22}/></button><div className="breadcrumb">Workspace <span>/</span> <strong>{nav.find(n => n.key === view)?.label}</strong></div><div className="top-actions"><span className="today-date"><CalendarDays size={15}/> {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span><button className="icon-button" title="Notifications" onClick={() => setError('Notifications are planned for a later release.')}><Bell size={19}/><i/></button><div className="profile">DC</div></div></header>
      <main className="content">
        {error && <div className="error-banner">{error}<button onClick={() => setError('')} aria-label="Dismiss"><X size={16}/></button></div>}
        {loading ? <div className="loading">Loading workspace…</div> : <>
          <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-dot"/> YOUR SALES WORKSPACE</div><h1>{view === 'overview' ? 'Good to see you, David' : nav.find(n => n.key === view)?.label}<span className="heading-period">.</span></h1><p>{view === 'overview' ? 'Here’s what’s happening across your pipeline today.' : view === 'pipeline' ? 'Keep opportunities moving from first contact to close.' : view === 'activities' ? 'A clear view of every conversation and next step.' : 'All your relationships, in one organised place.'}</p></div><button className="primary-btn" onClick={() => setShowAdd(true)}><Plus size={18}/> Add prospect</button></div>
          {view === 'overview' && dashboard && <>
            <div className="metric-grid">
              <Metric icon={<Users size={20}/>} label="Total prospects" value={dashboard.total.toString()} sub="Across your workspace" tone="purple" />
              <Metric icon={<Target size={20}/>} label="Open pipeline" value={money(dashboard.pipeline_value)} sub="Potential deal value" tone="blue" />
              <Metric icon={<CalendarDays size={20}/>} label="Follow-ups overdue" value={dashboard.overdue.toString()} sub="Need your attention" tone="orange" alert={dashboard.overdue > 0} />
              <Metric icon={<BarChart3 size={20}/>} label="Win rate" value={`${dashboard.win_rate}%`} sub="Of closed opportunities" tone="green" />
            </div>
            <div className="overview-grid">
              <section className="panel pipeline-panel"><div className="panel-head"><div><h2>Pipeline overview</h2><p>Where your opportunities stand</p></div><button className="text-link" onClick={() => setView('pipeline')}>View pipeline <ArrowRight size={15}/></button></div><div className="pipeline-summary">{stages.slice(0, 6).map((stage, i) => <div key={stage} className="pipeline-row"><div className="stage-icon" style={{background: avatarColors[i]}}>{i + 1}</div><span>{stageLabels[stage]}</span><div className="progress-track"><div style={{ width: `${Math.max(8, dashboard.stages[stage] / Math.max(dashboard.total, 1) * 100)}%`, background: ['#b1a2f4','#8879df','#6b5bca','#5144b9','#3b309a','#2a826f'][i] }}/></div><strong>{dashboard.stages[stage]}</strong></div>)}</div><div className="panel-foot"><span><span className="live-dot"/> Live pipeline data</span><span>{dashboard.total} total prospects</span></div></section>
              <section className="panel insight-panel" id="insights"><div className="panel-head"><div><h2>Focus for today <span className="sparkle-mini"><Sparkles size={15}/></span></h2><p>Suggested actions from your pipeline</p></div><span className="rule-tag">RULE BASED</span></div><div className="attention-list">{dashboard.attention.length ? dashboard.attention.slice(0, 4).map((item, i) => <button className="attention-item" key={item.id} onClick={() => setSelected(prospects.find(p => p.id === item.id) || null)}><div className={`attention-number n${i}`}>{String(i + 1).padStart(2, '0')}</div><div><strong>{item.company}</strong><span>{item.reason}</span></div><ArrowUpRight size={17}/></button>) : <p className="empty-small">You’re all caught up. Add a follow-up to see it here.</p>}</div><div className="insight-note"><Sparkles size={17}/><span>Based on follow-up dates and prospect stages. Review every suggestion before acting.</span></div></section>
            </div>
            <div className="section-head"><div><h2>Recent prospects</h2><p>Your latest relationships at a glance</p></div><button className="text-link" onClick={() => setView('prospects')}>View all prospects <ArrowRight size={15}/></button></div>
            <ProspectTable prospects={prospects.slice(0, 5)} onSelect={setSelected}/>
          </>}
          {view === 'prospects' && <><div className="list-toolbar"><div className="searchbox"><Search size={18}/><input placeholder="Search name, company or email…" value={search} onChange={e => setSearch(e.target.value)}/></div><div className="filter-wrap"><Settings2 size={17}/><select value={filter} onChange={e => setFilter(e.target.value as Stage | 'all')}><option value="all">All stages</option>{stages.map(s => <option key={s} value={s}>{stageLabels[s]}</option>)}</select><ChevronDown size={15}/></div></div><ProspectTable prospects={visible} onSelect={setSelected}/><div className="table-caption">Showing {visible.length} of {prospects.length} prospects</div></>}
          {view === 'pipeline' && <div className="board">{stages.filter(s => s !== 'lost').map(stage => <div className="board-column" key={stage}><div className="board-title"><span className={`stage-dot ${stage}`}/><strong>{stageLabels[stage]}</strong><em>{prospects.filter(p => p.stage === stage).length}</em></div><div className="board-cards">{prospects.filter(p => p.stage === stage).map(p => <button className="deal-card" key={p.id} onClick={() => setSelected(p)}><span className="deal-company">{p.company}</span><span className="deal-name">{p.name}</span><strong>{money(p.value)}</strong><div><span><CalendarDays size={13}/> {dateLabel(p.follow_up_at)}</span><ArrowUpRight size={16}/></div></button>)}</div></div>)}</div>}
          {view === 'activities' && <div className="activity-layout"><section className="panel"><div className="panel-head"><div><h2>Activity pulse</h2><p>Meaningful contact is what moves deals forward</p></div><span className="activity-total">{dashboard?.activities_week || 0} this week</span></div><div className="activity-people">{activityLeaders.map(p => <button key={p.id} onClick={() => setSelected(p)}><Avatar prospect={p}/><div><strong>{p.name}</strong><span>{p.company}</span></div><em>{p.activity_count} activities</em><ArrowRight size={16}/></button>)}</div></section><section className="activity-aside"><div className="aside-icon"><Phone size={24}/></div><h2>Keep the conversation going.</h2><p>Select a prospect to log a call, email, meeting, or note. Every touchpoint stays on their record.</p><button className="secondary-btn" onClick={() => setView('prospects')}>Browse prospects <ArrowRight size={16}/></button></section></div>}
        </>}
      </main>
    </div>
    {showAdd && <AddModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); void refresh() }} onError={setError}/ >}
    {selected && <ProspectDrawer prospect={selected} onClose={() => setSelected(null)} onChanged={refresh} onError={setError}/ >}
  </div>
}

function Metric({ icon, label, value, sub, tone, alert }: {icon: React.ReactNode; label: string; value: string; sub: string; tone: string; alert?: boolean}) { return <div className="metric-card"><div className={`metric-icon ${tone}`}>{icon}</div><div className="metric-label">{label}</div><div className="metric-value">{value}</div><div className={`metric-sub ${alert ? 'alert' : ''}`}>{alert ? <ArrowDownRight size={14}/> : <ArrowUpRight size={14}/>} {sub}</div></div> }
function Avatar({ prospect }: {prospect: Prospect}) { return <div className="avatar" style={{ background: avatarColors[prospect.id % avatarColors.length] }}>{initials(prospect.name)}</div> }
function ProspectTable({ prospects, onSelect }: {prospects: Prospect[]; onSelect: (p: Prospect) => void}) { return <div className="table-panel"><div className="table-scroll"><table><thead><tr><th>PROSPECT</th><th>STAGE</th><th>DEAL VALUE</th><th>ACTIVITY</th><th>FOLLOW-UP</th><th></th></tr></thead><tbody>{prospects.map(p => <tr key={p.id} onClick={() => onSelect(p)}><td><div className="person-cell"><Avatar prospect={p}/><div><strong>{p.name}</strong><span>{p.company}</span></div></div></td><td><span className={`stage-badge ${p.stage}`}><i/>{stageLabels[p.stage]}</span></td><td className="value-cell">{money(p.value)}</td><td className="muted-cell">{p.activity_count} touchpoint{p.activity_count === 1 ? '' : 's'}</td><td className="muted-cell">{dateLabel(p.follow_up_at)}</td><td><MoreHorizontal size={19}/></td></tr>)}</tbody></table>{prospects.length === 0 && <div className="empty-small table-empty">No prospects match your search.</div>}</div></div> }

function AddModal({onClose, onSaved, onError}: {onClose: () => void; onSaved: () => void; onError: (value: string) => void}) {
  const [saving, setSaving] = useState(false)
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setSaving(true)
    const data = Object.fromEntries(new FormData(e.currentTarget))
    try { await request('/api/prospects', { method: 'POST', body: JSON.stringify({ ...data, value: Number(data.value) || 0, follow_up_at: data.follow_up_at ? new Date(String(data.follow_up_at)).toISOString() : null }) }); onSaved() }
    catch (error) { onError((error as Error).message); setSaving(false) }
  }
  return <div className="overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}><div className="modal"><div className="modal-head"><div><span className="eyebrow">NEW RELATIONSHIP</span><h2>Add a prospect</h2><p>Start with the essentials. You can add more context later.</p></div><button className="icon-button" onClick={onClose}><X size={20}/></button></div><form onSubmit={submit}><div className="form-grid"><label>Full name<input name="name" required minLength={2} placeholder="e.g. Alex Morgan" autoFocus/></label><label>Company<input name="company" required minLength={2} placeholder="e.g. Northstar Ltd"/></label><label>Email<input name="email" type="email" required placeholder="alex@company.com"/></label><label>Phone<input name="phone" placeholder="Optional"/></label><label>Potential value (£)<input name="value" type="number" min="0" defaultValue="0"/></label><label>Follow-up date<input name="follow_up_at" type="date"/></label><label>Source<select name="source"><option>Outbound</option><option>Referral</option><option>Website</option><option>Other</option></select></label><label>Stage<select name="stage">{stages.map(s => <option key={s} value={s}>{stageLabels[s]}</option>)}</select></label></div><div className="modal-actions"><button type="button" className="secondary-btn" onClick={onClose}>Cancel</button><button className="primary-btn" disabled={saving}><Plus size={17}/>{saving ? 'Saving…' : 'Add prospect'}</button></div></form></div></div>
}

function ProspectDrawer({prospect, onClose, onChanged, onError}: {prospect: Prospect; onClose: () => void; onChanged: () => Promise<void>; onError: (value: string) => void}) {
  const [activities, setActivities] = useState<ActivityEntry[]>([])
  const [saving, setSaving] = useState(false)
  useEffect(() => { void request<ActivityEntry[]>(`/api/prospects/${prospect.id}/activities`).then(setActivities).catch(e => onError(e.message)) }, [prospect.id, onError])
  async function changeStage(e: React.ChangeEvent<HTMLSelectElement>) { try { await request(`/api/prospects/${prospect.id}`, {method: 'PATCH', body: JSON.stringify({stage: e.target.value})}); await onChanged() } catch (error) { onError((error as Error).message) } }
  async function logActivity(e: React.FormEvent<HTMLFormElement>) { e.preventDefault(); setSaving(true); const form = e.currentTarget; const data = Object.fromEntries(new FormData(form)); try { await request(`/api/prospects/${prospect.id}/activities`, {method: 'POST', body: JSON.stringify(data)}); setActivities(await request(`/api/prospects/${prospect.id}/activities`)); form.reset(); await onChanged() } catch (error) { onError((error as Error).message) } finally { setSaving(false) } }
  return <div className="overlay drawer-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}><aside className="drawer"><div className="drawer-top"><span>PROSPECT DETAILS</span><button className="icon-button" onClick={onClose}><X size={20}/></button></div><div className="drawer-profile"><Avatar prospect={prospect}/><h2>{prospect.name}</h2><p>{prospect.company}</p><span className={`stage-badge ${prospect.stage}`}><i/>{stageLabels[prospect.stage]}</span></div><div className="drawer-details"><div><Mail size={16}/><span>{prospect.email}</span></div><div><Phone size={16}/><span>{prospect.phone || 'No phone added'}</span></div><div><CalendarDays size={16}/><span>Follow-up: {dateLabel(prospect.follow_up_at)}</span></div><div><Target size={16}/><span>Potential: {money(prospect.value)}</span></div></div><label className="drawer-stage">Pipeline stage<select value={prospect.stage} onChange={changeStage}>{stages.map(s => <option key={s} value={s}>{stageLabels[s]}</option>)}</select></label><div className="drawer-divider"/><h3>Log an activity</h3><form onSubmit={logActivity} className="activity-form"><div className="form-grid"><label>Type<select name="kind"><option value="call">Call</option><option value="email">Email</option><option value="meeting">Meeting</option><option value="note">Note</option></select></label><label>Outcome<input name="outcome" placeholder="e.g. Connected" maxLength={80}/></label></div><label>Notes<textarea name="note" placeholder="What happened? What comes next?" rows={3} maxLength={3000}/></label><button className="primary-btn" disabled={saving}><Plus size={16}/>{saving ? 'Saving…' : 'Log activity'}</button></form><div className="drawer-divider"/><h3>Activity history <span>{activities.length}</span></h3><div className="history">{activities.length ? activities.map(a => <div className="history-item" key={a.id}><div className="history-icon">{a.kind === 'call' ? <Phone size={15}/> : a.kind === 'email' ? <Mail size={15}/> : <CalendarDays size={15}/>}</div><div><strong>{a.kind[0].toUpperCase() + a.kind.slice(1)}{a.outcome && ` · ${a.outcome}`}</strong><p>{a.note || 'No notes added'}</p><small>{new Date(a.created_at).toLocaleDateString('en-GB', {day:'numeric', month:'short', year:'numeric'})}</small></div></div>) : <p className="empty-small">No activities yet. Log the first touchpoint above.</p>}</div></aside></div>
}

export default App
