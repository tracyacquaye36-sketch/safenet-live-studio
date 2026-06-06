import { useState, useEffect } from 'react'
import { Shield, Zap, Newspaper, Briefcase, ListChecks, Copy, Check, RefreshCw, Wand2, CalendarPlus, Trash2, TrendingUp, AlertTriangle, RefreshCcw } from 'lucide-react'
import { SERVICES, GHANA_NEWS, GLOBAL_NEWS, PLATFORMS, ANGLES, SYSTEM_PROMPT } from './data'
import { fetchLiveNews, clearNewsCache, getNewsAge } from './NewsService'
import './App.css'

function LiveDot() { return <span className="live-dot" aria-hidden="true" /> }

function Badge({ color, children }) {
  return <span className="badge" style={{ background: color+'22', color, borderColor: color+'44' }}>{children}</span>
}

function Pill({ selected, onClick, red, amber, children }) {
  return <button className={`pill${selected?' selected':''}${red?' red':''}${amber?' amber':''}`} onClick={onClick}>{children}</button>
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  return (
    <button className="action-btn" onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(()=>setCopied(false),2000) }}>
      {copied ? <><Check size={12}/> Copied!</> : <><Copy size={12}/> Copy</>}
    </button>
  )
}

function useNews() {
  const [ghanaNews, setGhanaNews] = useState(GHANA_NEWS)
  const [globalNews, setGlobalNews] = useState(GLOBAL_NEWS)
  const [loading, setLoading] = useState(false)
  const [newsAge, setNewsAge] = useState(getNewsAge())
  const [isLive, setIsLive] = useState(false)

  const loadNews = async (force = false) => {
    setLoading(true)
    if (force) clearNewsCache()
    const news = await fetchLiveNews()
    if (news && news.ghana && news.global) {
      setGhanaNews(news.ghana)
      setGlobalNews(news.global)
      setIsLive(true)
      setNewsAge(getNewsAge())
    }
    setLoading(false)
  }

  useEffect(() => { loadNews() }, [])

  return { ghanaNews, globalNews, loading, newsAge, isLive, refresh: () => loadNews(true) }
}

function GenerateTab({ ghanaNews, globalNews }) {
  const [selNews, setSelNews] = useState(null)
  const [selSvc, setSelSvc] = useState(null)
  const [selPlat, setSelPlat] = useState('facebook')
  const [selAngle, setSelAngle] = useState('authority')
  const [extra, setExtra] = useState('')
  const [loading, setLoading] = useState(false)
  const [post, setPost] = useState(null)
  const [queue, setQueue] = useState(() => JSON.parse(localStorage.getItem('sn_queue')||'[]'))

  const allNews = [...ghanaNews, ...globalNews]
  const platform = PLATFORMS.find(p=>p.id===selPlat)
  const angle = ANGLES.find(a=>a.id===selAngle)
  const service = SERVICES.find(s=>s.id===selSvc)
  const saveQueue = q => { setQueue(q); localStorage.setItem('sn_queue', JSON.stringify(q)) }

  const generate = async () => {
    setLoading(true); setPost(null)
    const news = allNews.find(n=>n.id===selNews)
    const prompt = `${news ? `Real news hook: "${news.title}" (${news.meta}). Build the post around this story.` : extra || 'Use current Ghana security news as the hook.'}
${service ? `SafeNet service to feature: ${service.name} — ${service.desc}. Hook: "${service.hook}"` : 'Feature SafeNet manned guarding.'}
${extra && !news ? `Additional angle: ${extra}` : ''}
${platform.prompt}
${angle.prompt}
Write the complete post. Make a Ghana business owner stop scrolling.`
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:1000,system:SYSTEM_PROMPT,messages:[{role:'user',content:prompt}]})})
      const data = await res.json()
      setPost({ text: data.content?.map(b=>b.text||'').join('')||'Error', platform: selPlat, service: service?.name, newsTitle: news?.badge, id: Date.now() })
    } catch { setPost({ text:'Error generating. Please try again.', error:true }) }
    setLoading(false)
  }

  const addToQueue = () => {
    if (!post||post.error) return
    const pl = PLATFORMS.find(p=>p.id===post.platform)
    const d = new Date(); d.setDate(d.getDate()+queue.length+1)
    saveQueue([...queue, {...post, platformLabel:pl.label, platformColor:pl.color, date:d.toISOString()}])
  }

  return (
    <div className="tab-content">
      <div className="card">
        <div className="field">
          <label>Live News Hook <LiveDot/></label>
          <div className="pill-group">
            {ghanaNews.map(n=><Pill key={n.id} selected={selNews===n.id} red onClick={()=>setSelNews(selNews===n.id?null:n.id)}><span style={{color:n.color,fontSize:9,fontWeight:600,marginRight:3}}>{n.badge}</span>{n.title.substring(0,42)}...</Pill>)}
            {globalNews.map(n=><Pill key={n.id} selected={selNews===n.id} amber onClick={()=>setSelNews(selNews===n.id?null:n.id)}><span style={{color:n.color,fontSize:9,fontWeight:600,marginRight:3}}>{n.badge}</span>{n.title.substring(0,42)}...</Pill>)}
          </div>
        </div>
        <div className="field">
          <label>Service to Feature</label>
          <div className="pill-group">{SERVICES.map(s=><Pill key={s.id} selected={selSvc===s.id} onClick={()=>setSelSvc(selSvc===s.id?null:s.id)}>{s.icon} {s.name}</Pill>)}</div>
        </div>
        <div className="field">
          <label>Platform</label>
          <div className="pill-group">{PLATFORMS.map(p=><Pill key={p.id} selected={selPlat===p.id} onClick={()=>setSelPlat(p.id)}>{p.label}</Pill>)}</div>
        </div>
        <div className="field">
          <label>Content Angle</label>
          <div className="pill-group">{ANGLES.map(a=><Pill key={a.id} selected={selAngle===a.id} onClick={()=>setSelAngle(a.id)}>{a.label}</Pill>)}</div>
        </div>
        <div className="field">
          <label>Extra context (optional)</label>
          <input type="text" value={extra} onChange={e=>setExtra(e.target.value)} placeholder="Specific detail, client type, location..."/>
        </div>
        <button className="btn-primary" onClick={generate} disabled={loading}>
          {loading ? <span className="loading"><span/><span/><span/></span> : <Zap size={14}/>}
          {loading ? ' Generating...' : ' Generate Live Post'}
        </button>
      </div>
      {post && !post.error && (
        <div className="post-card">
          <div className="post-meta">
            <Badge color={PLATFORMS.find(p=>p.id===post.platform)?.color}>{PLATFORMS.find(p=>p.id===post.platform)?.label}</Badge>
            {post.newsTitle && <Badge color="#22c55e"><LiveDot/>Live hook</Badge>}
            {post.service && <Badge color="#64748b">{post.service}</Badge>}
          </div>
          <div className="post-text">{post.text}</div>
          <div className="post-char">{post.text.length} chars</div>
          <div className="post-actions">
            <button className="action-btn" onClick={addToQueue}><CalendarPlus size={12}/> Add to queue</button>
            <CopyButton text={post.text}/>
            <button className="action-btn" onClick={generate}><RefreshCw size={12}/> Regenerate</button>
          </div>
        </div>
      )}
    </div>
  )
}

function NewsTab({ ghanaNews, globalNews, loading, newsAge, isLive, refresh }) {
  const [copied, setCopied] = useState(null)
  const copy = (hook, id) => { navigator.clipboard.writeText(hook); setCopied(id); setTimeout(()=>setCopied(null),2000) }
  return (
    <div className="tab-content">
      <div className="news-header">
        <div className="news-status">
          {loading ? <span style={{color:'var(--text3)',fontSize:12}}>Fetching latest news...</span> :
           isLive ? <span style={{color:'#22c55e',fontSize:12,display:'flex',alignItems:'center',gap:5}}><LiveDot/> Live — updated {newsAge || 'just now'}</span> :
           <span style={{color:'var(--amber)',fontSize:12}}>Showing cached news</span>}
        </div>
        <button className="action-btn" onClick={refresh} disabled={loading}>
          <RefreshCcw size={12}/> {loading ? 'Refreshing...' : 'Refresh news'}
        </button>
      </div>
      <div className="card">
        <div className="section-label"><LiveDot/> Ghana — Latest Security News</div>
        {ghanaNews.map(n=>(
          <div key={n.id} className="news-item">
            <Badge color={n.color}>{n.badge}</Badge>
            <div className="news-body"><div className="news-title">{n.title}</div><div className="news-meta">{n.meta}</div></div>
            <button className="action-btn" onClick={()=>copy(n.hook,n.id)}>{copied===n.id?<><Check size={11}/> Copied</>:<><Copy size={11}/> Use</>}</button>
          </div>
        ))}
        <div className="section-label" style={{marginTop:'1.25rem'}}><TrendingUp size={11} style={{marginRight:4}}/>Global Security 2026</div>
        {globalNews.map(n=>(
          <div key={n.id} className="news-item">
            <Badge color={n.color}>{n.badge}</Badge>
            <div className="news-body"><div className="news-title">{n.title}</div><div className="news-meta">{n.meta}</div></div>
            <button className="action-btn" onClick={()=>copy(n.hook,n.id)}>{copied===n.id?<><Check size={11}/> Copied</>:<><Copy size={11}/> Use</>}</button>
          </div>
        ))}
      </div>
      <div className="info-box"><AlertTriangle size={13}/> News refreshes automatically every 3 hours. Click "Refresh news" to fetch breaking stories instantly.</div>
    </div>
  )
}

function ServicesTab() {
  return (
    <div className="tab-content">
      <div className="card">
        <p className="desc-text">SafeNet's 8 core services — each one can be featured in any generated post.</p>
        <div className="services-grid">
          {SERVICES.map(s=>(
            <div key={s.id} className="service-card">
              <div className="service-icon">{s.icon}</div>
              <div className="service-name">{s.name}</div>
              <div className="service-desc">{s.desc}</div>
              <div className="service-hook">"{s.hook}"</div>
            </div>
          ))}
        </div>
      </div>
      <div className="contact-card">
        <div className="contact-label">SafeNet Contact</div>
        {['📧 info@safenetsecuritygh.com','📞 +233 (0) 547 858 573','🌐 safenetsecuritygh.com','📍 Adjetey Adjei Sueley St, Trasacco Valley, Accra'].map(r=><div key={r} className="contact-row">{r}</div>)}
      </div>
    </div>
  )
}

function QueueTab() {
  const [queue, setQueue] = useState(() => JSON.parse(localStorage.getItem('sn_queue')||'[]'))
  const [published, setPublished] = useState(0)
  const saveQueue = q => { setQueue(q); localStorage.setItem('sn_queue', JSON.stringify(q)) }
  const remove = id => saveQueue(queue.filter(p=>p.id!==id))
  const markDone = id => { remove(id); setPublished(p=>p+1) }
  const thisWeek = queue.filter(p=>Math.abs(new Date(p.date)-new Date())<7*86400000).length

  return (
    <div className="tab-content">
      <div className="stats-row">
        {[{v:queue.length,l:'Queued'},{v:published,l:'Published'},{v:thisWeek,l:'This week'}].map(s=>(
          <div key={s.l} className="stat"><div className="stat-val">{s.v}</div><div className="stat-label">{s.l}</div></div>
        ))}
      </div>
      {queue.length===0 ? (
        <div className="empty-state"><ListChecks size={28}/><p>No posts queued yet.<br/>Generate posts and add them to your queue.</p></div>
      ) : queue.map(p=>(
        <div key={p.id} className="post-card">
          <div className="post-meta">
            <Badge color={p.platformColor}>{p.platformLabel}</Badge>
            {p.newsTitle && <Badge color="#22c55e"><LiveDot/>{p.newsTitle}</Badge>}
            {p.service && <Badge color="#64748b">{p.service}</Badge>}
            <span className="post-date">{new Date(p.date).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</span>
          </div>
          <div className="post-text small">{p.text.substring(0,200)}{p.text.length>200?'...':''}</div>
          <div className="post-actions">
            <button className="action-btn green" onClick={()=>markDone(p.id)}><Check size={12}/> Published</button>
            <CopyButton text={p.text}/>
            <button className="action-btn red" onClick={()=>remove(p.id)}><Trash2 size={12}/></button>
          </div>
        </div>
      ))}
    </div>
  )
}

const TABS = [
  {id:'generate',label:'Generate',icon:<Wand2 size={13}/>},
  {id:'news',label:'Live News',icon:<Newspaper size={13}/>},
  {id:'services',label:'Services',icon:<Briefcase size={13}/>},
  {id:'queue',label:'Queue',icon:<ListChecks size={13}/>},
]

export default function App() {
  const [activeTab, setActiveTab] = useState('generate')
  const { ghanaNews, globalNews, loading, newsAge, isLive, refresh } = useNews()

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <Shield size={20} className="logo-icon"/>
            <div>
              <div className="logo-title">SafeNet Live Studio</div>
              <div className="logo-sub"><LiveDot/>Live Ghana news · AI-powered · All platforms</div>
            </div>
          </div>
          <div className="header-badge">{new Date().toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}</div>
        </div>
      </header>
      <nav className="nav">
        <div className="nav-inner">
          {TABS.map(t=>(
            <button key={t.id} className={`nav-tab${activeTab===t.id?' active':''}`} onClick={()=>setActiveTab(t.id)}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </nav>
      <main className="main">
        {activeTab==='generate' && <GenerateTab ghanaNews={ghanaNews} globalNews={globalNews}/>}
        {activeTab==='news' && <NewsTab ghanaNews={ghanaNews} globalNews={globalNews} loading={loading} newsAge={newsAge} isLive={isLive} refresh={refresh}/>}
        {activeTab==='services' && <ServicesTab/>}
        {activeTab==='queue' && <QueueTab/>}
      </main>
      <footer className="footer">SafeNet Security Services Ltd · Smart Security, Global Standard</footer>
    </div>
  )
}
