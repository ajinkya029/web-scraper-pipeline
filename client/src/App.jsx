import { useCallback, useEffect, useState } from "react";
import { Activity, ArrowUpRight, Database, Globe, LoaderCircle, RefreshCw, Search, ShieldCheck } from "lucide-react";

const API = "http://localhost:5000/api";
const time = value => value ? new Date(value).toLocaleString() : "—";

function Status({ status }) {
  return <span className={`status ${status || "unknown"}`}><span />{status || "unknown"}</span>;
}

export default function App() {
  const [url, setUrl] = useState("");
  const [jobs, setJobs] = useState([]);
  const [records, setRecords] = useState([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all");

  const load = useCallback(async () => {
    try {
      const [j, r] = await Promise.all([
        fetch(`${API}/jobs?limit=50`), fetch(`${API}/records?limit=50`)
      ]);
      if (!j.ok || !r.ok) throw new Error("API request failed. Is the backend running?");
      const jd = await j.json(), rd = await r.json();
      setJobs(jd.jobs || []); setRecords(rd.records || []); setError("");
    } catch (e) { setError(e.message); }
  }, []);

  useEffect(() => { load(); const id = setInterval(load, 4000); return () => clearInterval(id); }, [load]);

  async function submit(e) {
    e.preventDefault(); setError(""); setNotice("");
    if (!url.trim()) return setError("Enter a public webpage URL.");
    setLoading(true);
    try {
      const response = await fetch(`${API}/jobs`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not queue this URL.");
      setNotice("Job queued. This dashboard refreshes automatically."); setUrl(""); await load();
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function retry(id) {
    setError(""); setNotice("");
    try {
      const response = await fetch(`${API}/jobs/${id}/retry`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Retry failed.");
      setNotice("Job queued for another run."); await load();
    } catch (e) { setError(e.message); }
  }

  const shown = jobs.filter(j => filter === "all" || j.status === filter);
  const completed = jobs.filter(j => j.status === "completed").length;
  const failed = jobs.filter(j => j.status === "failed").length;
  const running = jobs.filter(j => ["queued", "running"].includes(j.status)).length;

  return <main className="shell">
    <header className="topbar">
      <a className="brand" href="#"><span className="brand-icon"><Database size={21}/></span><span>data<span className="brand-accent">forge</span><small>SCRAPER PIPELINE</small></span></a>
      <div className="top-actions"><span className="live-dot" /> API dashboard <button className="icon-button" onClick={load} title="Refresh"><RefreshCw size={17}/></button></div>
    </header>

    <section className="hero">
      <div className="eyebrow"><Activity size={14}/> AUTOMATED DATA COLLECTION</div>
      <h1>Turn public webpages<br/><span>into structured data.</span></h1>
      <p>Queue a URL, extract page metadata and links, then store normalized records in MongoDB.</p>
      <form className="scrape-form" onSubmit={submit}>
        <Globe size={19} className="input-icon"/>
        <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com" aria-label="Webpage URL" />
        <button type="submit" disabled={loading}>{loading ? <LoaderCircle className="spin" size={17}/> : <Search size={17}/>} Start scrape</button>
      </form>
      {error && <div className="message error">{error}</div>}
      {notice && <div className="message success">{notice}</div>}
      <div className="safe-note"><ShieldCheck size={15}/> Public HTML only · robots.txt aware · rate limited</div>
    </section>

    <section className="metrics">
      <Metric label="TOTAL JOBS" value={jobs.length} detail="All submitted URLs" icon={<Activity size={18}/>} />
      <Metric label="COMPLETED" value={completed} detail="Successfully processed" icon={<Database size={18}/>} />
      <Metric label="IN QUEUE / RUNNING" value={running} detail="Waiting or processing" icon={<LoaderCircle size={18}/>} />
      <Metric label="FAILED" value={failed} detail="Review and retry" icon={<RefreshCw size={18}/>} />
    </section>

    <section className="panel">
      <div className="panel-head"><div><h2>Scrape jobs</h2><p>Live status of your pipeline runs</p></div>
        <select value={filter} onChange={e => setFilter(e.target.value)} aria-label="Filter jobs">
          <option value="all">All jobs</option><option value="queued">Queued</option><option value="running">Running</option><option value="completed">Completed</option><option value="failed">Failed</option>
        </select>
      </div>
      <div className="table-wrap"><table><thead><tr><th>SOURCE URL</th><th>STATUS</th><th>CREATED</th><th>ATTEMPTS</th><th></th></tr></thead>
        <tbody>{shown.map(job => <tr key={job._id}>
          <td><div className="url-cell"><span className="site-icon"><Globe size={15}/></span><span><strong>{job.url}</strong><small>{job.error || (job.recordId?.title ? `Title: ${job.recordId.title}` : `Job ${job._id.slice(-8)}`)}</small></span></div></td>
          <td><Status status={job.status}/></td><td className="muted">{time(job.createdAt)}</td><td>{job.attempts || 0}</td>
          <td>{["failed","completed"].includes(job.status) && <button className="retry" onClick={() => retry(job._id)} title="Run again"><RefreshCw size={15}/></button>}</td>
        </tr>)}
        {!shown.length && <tr><td colSpan="5"><div className="empty"><Search size={22}/><strong>No jobs yet</strong><span>Submit a public URL above to start the pipeline.</span></div></td></tr>}
        </tbody></table></div>
      <div className="panel-foot">Showing {shown.length} of {jobs.length} jobs <span>Auto-refreshes every 4 seconds</span></div>
    </section>

    <section className="panel records-panel">
      <div className="panel-head"><div><h2>Extracted records</h2><p>Normalized output stored in MongoDB</p></div><span className="record-count">{records.length} records</span></div>
      {records.length ? <div className="record-grid">{records.slice(0, 6).map(r => <article className="record" key={r._id}>
        <div className="record-top"><span className="record-type"><Database size={14}/> HTML RECORD</span><a href={r.sourceUrl} target="_blank" rel="noreferrer" aria-label="Open source"><ArrowUpRight size={16}/></a></div>
        <h3>{r.title || "Untitled page"}</h3><p>{r.description || r.textSnippet || "No page description extracted."}</p>
        <div className="record-meta"><span>{r.headings?.length || 0} headings</span><span>{r.links?.length || 0} links</span><span>{time(r.scrapedAt)}</span></div>
      </article>)}</div> : <div className="empty record-empty"><Database size={22}/><strong>No extracted records</strong><span>Completed scrape jobs will appear here.</span></div>}
    </section>

    <footer><span>DATAFORGE <b>·</b> MERN SCRAPER STARTER</span><span>Built with React · Express · MongoDB</span></footer>
  </main>;
}

function Metric({ label, value, detail, icon }) {
  return <article className="metric"><div className="metric-top"><span>{label}</span><i>{icon}</i></div><strong>{value}</strong><small>{detail}</small></article>;
}