import { useEffect, useState } from 'react';
import { adminService } from '../services/adminService.js';
import { useToast } from '../context/ToastContext.jsx';
import { extractError } from '../services/api.js';
import Table from '../components/Table.jsx';
import { MethodBadge, StatusBadge } from '../components/Badge.jsx';
import { formatDate, formatMs } from '../utils/format.js';

function arr(x) {
  if (Array.isArray(x)) return x;
  return x?.items || x?.requests || x?.logs || x?.data || [];
}

export default function AdminRequests() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const res = await adminService.requests({ page, limit: 25 });
      setItems(arr(res));
      setMeta(res?.pagination || res?.meta || null);
    } catch (e) {
      toast.error(extractError(e, 'Failed to load requests'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Platform requests</h1>
          <p className="text-sm text-slate-500">Cross-project gateway traffic.</p>
        </div>
        <button onClick={fetchAll} className="btn-secondary !py-1.5 !text-xs">Refresh</button>
      </div>
      <Table
        loading={loading}
        data={items}
        emptyTitle="No requests"
        columns={[
          { key: 'time', title: 'Time', render: (r) => <span className="text-xs">{formatDate(r.createdAt || r.timestamp)}</span> },
          { key: 'method', title: 'Method', render: (r) => <MethodBadge method={r.method} /> },
          { key: 'path', title: 'Path', render: (r) => <code className="font-mono text-xs">{r.path || r.endpoint}</code> },
          { key: 'status', title: 'Status', render: (r) => <StatusBadge status={r.status || r.statusCode} /> },
          { key: 'latency', title: 'Latency', render: (r) => formatMs(r.responseTimeMs ?? r.latencyMs ?? r.latency) },
        ]}
      />
      <div className="flex items-center justify-between text-sm">
        <p className="text-slate-500">Page {page}{meta?.totalPages ? ` of ${meta.totalPages}` : ''}{meta?.total != null ? ` · ${meta.total} rows` : ''}</p>
        <div className="flex justify-end gap-2">
          <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="btn-secondary !py-1.5 !text-xs disabled:opacity-40">Prev</button>
          <button disabled={meta?.totalPages ? page >= meta.totalPages : items.length < 25} onClick={() => setPage((p) => p + 1)} className="btn-secondary !py-1.5 !text-xs disabled:opacity-40">Next</button>
        </div>
      </div>
    </div>
  );
}
