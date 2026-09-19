'use client';

import { useState } from 'react';

type Flag = { key: string; description: string; enabled: boolean; rollout: number; version: number; updated_at: string };
type Evaluation = { enabled: boolean; bucket: number; reason: string; version: number };

export default function Home() {
  const [token, setToken] = useState('');
  const [flags, setFlags] = useState<Flag[]>([]);
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('customer-42');
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [message, setMessage] = useState('Enter your local admin key to load flags.');

  async function api(path: string, init: RequestInit = {}) {
    const response = await fetch(path, { ...init, headers: { 'Content-Type': 'application/json', 'x-admin-key': token, ...init.headers }, cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  async function load() {
    try { setFlags(await api('/api/flags')); setMessage('Flags loaded.'); }
    catch (error) { setMessage((error as Error).message); }
  }

  async function create(event: React.FormEvent) {
    event.preventDefault();
    try {
      await api('/api/flags', { method: 'POST', body: JSON.stringify({ key, description }) });
      setKey(''); setDescription(''); await load(); setMessage('Flag created, disabled by default.');
    } catch (error) { setMessage((error as Error).message); }
  }

  async function change(flag: Flag, enabled: boolean, rollout: number) {
    try {
      await api(`/api/flags/${encodeURIComponent(flag.key)}`, { method: 'PATCH', body: JSON.stringify({ version: flag.version, enabled, rollout }) });
      await load(); setMessage(`${flag.key} updated.`);
    } catch (error) { setMessage((error as Error).message); await load(); }
  }

  async function preview(flag: Flag) {
    try { setEvaluation(await api('/api/evaluate', { method: 'POST', body: JSON.stringify({ key: flag.key, subject }) })); setMessage(`Evaluation for ${flag.key}.`); }
    catch (error) { setMessage((error as Error).message); }
  }

  return <main>
    <header><div className="eyebrow">RELEASE ENGINEERING LAB</div><h1>ReleasePilot</h1><p>Control feature exposure with deterministic rollouts, version checks, and an audit trail.</p></header>
    <section className="panel access" aria-label="Access"><div><h2>Local access</h2><p>Your key stays in this browser tab and is sent only to your local server.</p></div><div className="row"><input type="password" aria-label="Admin key" placeholder="Admin key" value={token} onChange={e => setToken(e.target.value)} /><button onClick={load}>Load flags</button></div></section>
    <p role="status" className="status">{message}</p>
    <section className="grid"><div className="panel"><h2>Create a flag</h2><form onSubmit={create}><label>Key<input required pattern="[a-z][a-z0-9_-]{2,63}" placeholder="new_checkout" value={key} onChange={e => setKey(e.target.value)} /></label><label>Purpose<input maxLength={200} placeholder="Gradual release of checkout flow" value={description} onChange={e => setDescription(e.target.value)} /></label><button type="submit">Create disabled flag</button></form></div><div className="panel"><h2>Preview a decision</h2><label>Subject ID<input value={subject} onChange={e => setSubject(e.target.value)} /></label><p>Use a stable customer or account ID. The same subject receives the same decision at a given rollout percentage.</p>{evaluation && <div className="result"><strong>{evaluation.enabled ? 'Enabled' : 'Disabled'}</strong><span>Bucket {evaluation.bucket} · version {evaluation.version} · {evaluation.reason}</span></div>}</div></section>
    <section className="panel"><div className="section-heading"><div><h2>Flags</h2><p>Changes require the current version, so stale updates cannot silently overwrite a teammate&apos;s work.</p></div><button className="secondary" onClick={load}>Refresh</button></div>{flags.length === 0 ? <p className="empty">No flags loaded yet.</p> : <div className="flags">{flags.map(flag => <FlagCard key={flag.key} flag={flag} onChange={change} onPreview={preview} />)}</div>}</section>
    <footer>Portfolio engineering project · Local demonstration · No production customer data</footer>
  </main>;
}

function FlagCard({ flag, onChange, onPreview }: { flag: Flag; onChange: (flag: Flag, enabled: boolean, rollout: number) => void; onPreview: (flag: Flag) => void }) {
  const [draft, setDraft] = useState(flag.rollout);
  return <article className="flag"><div className="flag-header"><div><h3>{flag.key}</h3><p>{flag.description || 'No description'}</p></div><span className={flag.enabled ? 'badge on' : 'badge'}>{flag.enabled ? 'On' : 'Off'}</span></div><div className="controls"><label>Rollout <strong>{draft}%</strong><input aria-label={`${flag.key} rollout`} type="range" min="0" max="100" value={draft} onChange={e => setDraft(Number(e.target.value))} /></label><div className="row"><button className="secondary" onClick={() => onPreview(flag)}>Evaluate</button><button className="secondary" onClick={() => onChange(flag, flag.enabled, draft)}>Save rollout</button><button onClick={() => onChange(flag, !flag.enabled, draft)}>{flag.enabled ? 'Turn off' : 'Turn on'}</button></div></div><small>Version {flag.version} · Updated {new Date(flag.updated_at).toLocaleString()}</small></article>;
}
