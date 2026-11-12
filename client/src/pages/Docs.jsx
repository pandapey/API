import { useEffect, useState } from 'react';
import { BookOpen, ExternalLink, Play, Plus, Trash2, Zap } from 'lucide-react';
import axios from 'axios';
import { projectService } from '../services/projectService.js';
import { useProjects } from '../hooks/useProjects.js';
import { GATEWAY_URL } from '../services/api.js';
import { DOCS_URL } from '../utils/constants.js';
import { useToast } from '../context/ToastContext.jsx';
import Table from '../components/Table.jsx';
import { MethodBadge } from '../components/Badge.jsx';
import CopyButton from '../components/CopyButton.jsx';

function arr(x) {
  if (Array.isArray(x)) return x;
  return x?.items || x?.endpoints || x?.data || [];
}

export default function Docs({ embedded = false, projectId: fixedProjectId, project }) {
  const { projects } = useProjects();
  const toast = useToast();
  const [projectId, setProjectId] = useState(fixedProjectId || '');
  const [endpoints, setEndpoints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [swaggerOk, setSwaggerOk] = useState(null);
  const [tryState, setTryState] = useState({
    endpoint: '', apiKey: '', version: 'v1',
    params: [{ key: '', value: '' }], // key/value rows — no raw JSON needed
    body: '{}', method: 'GET', response: null, busy: false,
  });

  // Reliable Swagger reachability: fetch /api-docs.json (iframe onError never fires for HTTP/CORS).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${DOCS_URL}.json`, { method: 'GET' });
        if (!cancelled) setSwaggerOk(res.ok);
      } catch {
        if (!cancelled) setSwaggerOk(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (fixedProjectId) setProjectId(fixedProjectId);
    else if (projects.length && !projectId) setProjectId(projects[0]._id || projects[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, fixedProjectId]);

  useEffect(() => {
    if (!projectId) return undefined;
    let cancelled = false;
    const pid = projectId;
    (async () => {
      setLoading(true);
      try {
        const res = await projectService.listEndpoints(pid);
        if (cancelled) return;
        const list = arr(res);
        setEndpoints(list);
        if (list.length && !tryState.endpoint) {
          setTryState((s) => ({ ...s, endpoint: list[0].path, method: list[0].method || 'GET' }));
        }
      } catch {
        if (cancelled) return;
        setEndpoints([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // --- Try-it console: query-param row helpers -----------------------------
  const setParam = (i, field, v) => setTryState((s) => ({
    ...s,
    params: s.params.map((p, idx) => (idx === i ? { ...p, [field]: v } : p)),
  }));
  const addParam = () => setTryState((s) => ({ ...s, params: [...s.params, { key: '', value: '' }] }));
  const removeParam = (i) => setTryState((s) => {
    const next = s.params.filter((_, idx) => idx !== i);
    return { ...s, params: next.length ? next : [{ key: '', value: '' }] };
  });

  // Named params (from the rows) + the mandatory gateway `version` param.
  const buildUrl = () => {
    const path = tryState.endpoint.startsWith('/') ? tryState.endpoint : `/${tryState.endpoint}`;
    const usp = new URLSearchParams();
    tryState.params.forEach((p) => {
      if (p.key.trim()) usp.append(p.key.trim(), p.value);
    });
    usp.set('version', tryState.version || 'v1');
    return `${GATEWAY_URL}/${projectId || '<projectId>'}${path}?${usp.toString()}`;
  };

  const runTryIt = async () => {
    if (!projectId) return toast.error('Pick a project first');
    if (!tryState.endpoint) return toast.error('Pick an endpoint first');
    if (!tryState.apiKey) return toast.error('Enter an API key');
    let body;
    const needsBody = ['POST', 'PUT', 'PATCH'].includes((tryState.method || 'GET').toUpperCase());
    if (needsBody && (tryState.body || '').trim()) {
      try {
        body = JSON.parse(tryState.body);
      } catch {
        return toast.error('Body must be valid JSON');
      }
    }
    setTryState((s) => ({ ...s, busy: true, response: null }));
    try {
      const url = buildUrl();
      const res = await axios({
        url,
        method: tryState.method || 'GET',
        headers: { 'x-api-key': tryState.apiKey, ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
        ...(body !== undefined ? { data: body } : {}),
        timeout: 20000,
      });
      setTryState((s) => ({ ...s, response: { status: res.status, data: res.data, headers: res.headers } }));
    } catch (e) {
      setTryState((s) => ({
        ...s,
        response: { status: e.response?.status || 'ERR', data: e.response?.data || e.message, headers: e.response?.headers || {} },
      }));
    } finally {
      setTryState((s) => ({ ...s, busy: false }));
    }
  };

  const activeProject = project || projects.find((p) => (p._id || p.id) === projectId);

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-white"><BookOpen size={20} /> API Docs</h1>
          <p className="text-sm text-slate-500">Swagger + live Try-it console against the gateway.</p>
        </div>
        <div className="flex items-center gap-2">
          {!embedded && (
            <select aria-label="Select project" value={projectId} onChange={(e) => setProjectId(e.target.value)} className="input !w-auto">
              {projects.map((p) => <option key={p._id || p.id} value={p._id || p.id}>{p.name}</option>)}
            </select>
          )}
          <a href={DOCS_URL} target="_blank" rel="noreferrer" className="btn-secondary !py-2 !text-xs">
            Swagger <ExternalLink size={13} />
          </a>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="font-semibold text-slate-900 dark:text-white">Endpoints {activeProject ? `· ${activeProject.name}` : ''}</h3>
          <div className="mt-3">
            <Table
              loading={loading}
              data={endpoints}
              emptyTitle="No endpoints documented"
              columns={[
                { key: 'method', title: 'Method', render: (r) => <MethodBadge method={r.method} /> },
                { key: 'path', title: 'Path', render: (r) => (
                  <button
                    onClick={() => setTryState((s) => ({ ...s, endpoint: r.path, method: r.method }))}
                    className="font-mono text-xs text-brand-600 hover:underline"
                  >
                    {r.path}
                  </button>
                ) },
                { key: 'desc', title: 'Description', render: (r) => <span className="text-xs text-slate-500">{r.description || '—'}</span> },
              ]}
            />
          </div>
          <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
            <p className="flex items-center gap-2 bg-slate-50 px-3 py-2 font-mono text-[11px] text-slate-500 dark:bg-slate-800">
              Swagger UI · <a href={DOCS_URL} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">{DOCS_URL}</a>
              {' · '}<a href={`${DOCS_URL}.json`} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">raw JSON</a>
              <span className={`ml-auto rounded-full px-2 py-0.5 font-sans font-semibold ${swaggerOk === null ? 'bg-slate-200 text-slate-500' : swaggerOk ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                {swaggerOk === null ? 'checking…' : swaggerOk ? 'reachable' : 'unreachable'}
              </span>
            </p>
            <iframe
              title="swagger"
              src={DOCS_URL}
              className="h-64 w-full bg-white"
            />
            {swaggerOk === false && (
              <p role="alert" className="bg-rose-50 px-3 py-2 text-[11px] text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                Swagger UI unreachable — is backend on :5000 running? Start `npm run dev:server`, then open the Swagger link above directly.
              </p>
            )}
            <p className="px-3 py-2 text-[11px] text-slate-500">If iframe is blank, backend is down — open Swagger link above directly after starting server.</p>
          </div>
        </div>

        <div className="card p-5">
          <h3 className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white"><Zap size={16} /> Try it live</h3>
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-4 gap-2">
              <select aria-label="HTTP method" value={tryState.method} onChange={(e) => setTryState((s) => ({ ...s, method: e.target.value }))} className="input font-mono">
                {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => <option key={m}>{m}</option>)}
              </select>
              <input aria-label="Endpoint path" value={tryState.endpoint} onChange={(e) => setTryState((s) => ({ ...s, endpoint: e.target.value }))} placeholder="/current" className="input col-span-2 font-mono" autoComplete="off" spellCheck={false} />
              <input aria-label="Version" value={tryState.version} onChange={(e) => setTryState((s) => ({ ...s, version: e.target.value }))} placeholder="v1" title="Gateway ?version= param" className="input font-mono" autoComplete="off" spellCheck={false} />
            </div>
            <div>
              <label htmlFor="try-key" className="label">API key</label>
              <input id="try-key" value={tryState.apiKey} onChange={(e) => setTryState((s) => ({ ...s, apiKey: e.target.value }))} placeholder="dv_live_…" className="input font-mono" autoComplete="off" spellCheck={false} />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <span id="try-params-label" className="label !mb-0">Query params</span>
                <button
                  type="button"
                  onClick={addParam}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-brand-600 transition hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-950/40"
                >
                  <Plus size={13} /> Add param
                </button>
              </div>
              <div className="mt-1.5 space-y-1.5">
                {tryState.params.map((p, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <input
                      aria-label={`Query param ${i + 1} name`}
                      value={p.key}
                      onChange={(e) => setParam(i, 'key', e.target.value)}
                      placeholder="name"
                      className="input !py-1.5 !text-xs font-mono"
                      autoComplete="off"
                      spellCheck={false}
                    />
                    <span className="text-xs text-slate-400" aria-hidden="true">=</span>
                    <input
                      aria-label={`Query param ${i + 1} value`}
                      value={p.value}
                      onChange={(e) => setParam(i, 'value', e.target.value)}
                      placeholder="value"
                      className="input !py-1.5 !text-xs font-mono"
                      autoComplete="off"
                      spellCheck={false}
                    />
                    <button
                      type="button"
                      onClick={() => removeParam(i)}
                      aria-label={`Remove param ${p.key || i + 1}`}
                      title="Remove param"
                      className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950/40"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <p className="form-hint">Appended to the URL automatically — <code>version</code> is always included.</p>
            </div>
            {['POST', 'PUT', 'PATCH'].includes((tryState.method || '').toUpperCase()) && (
              <div>
                <label htmlFor="try-body" className="label">Request body (JSON)</label>
                <textarea id="try-body" value={tryState.body} onChange={(e) => setTryState((s) => ({ ...s, body: e.target.value }))} rows={4} className="input font-mono !text-xs" placeholder='{"name":"Ada"}' />
              </div>
            )}
            <div className="flex items-center gap-2">
              <button onClick={runTryIt} disabled={tryState.busy} className="btn-primary"><Play size={15} /> {tryState.busy ? 'Calling…' : 'Send request'}</button>
              {tryState.endpoint && projectId && <CopyButton text={buildUrl()} label="Copy URL" />}
            </div>
            <p className="break-all font-mono text-[11px] text-slate-500">{tryState.method} {buildUrl()}</p>
            {tryState.response && (
              <div>
                <p className="mb-1 font-mono text-xs text-slate-500">→ {tryState.response.status}</p>
                <pre className="max-h-72 overflow-auto rounded-xl bg-slate-950 p-4 font-mono text-xs text-emerald-200">
                  {JSON.stringify(tryState.response.data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
