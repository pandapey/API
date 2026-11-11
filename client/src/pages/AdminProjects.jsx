import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../services/adminService.js';
import { useToast } from '../context/ToastContext.jsx';
import { extractError } from '../services/api.js';
import Table from '../components/Table.jsx';
import { formatDate } from '../utils/format.js';

function arr(x) {
  if (Array.isArray(x)) return x;
  return x?.items || x?.projects || x?.data || [];
}

export default function AdminProjects() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await adminService.projects();
        setItems(arr(res));
      } catch (e) {
        toast.error(extractError(e, 'Failed to load projects'));
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">All projects</h1>
        <p className="text-sm text-slate-500">Every workspace project on the platform.</p>
      </div>
      <Table
        loading={loading}
        data={items}
        emptyTitle="No projects"
        columns={[
          { key: 'name', title: 'Project', render: (r) => (
            <Link to={`/projects/${r._id || r.id}`} className="font-semibold text-brand-600 hover:underline">{r.name}</Link>
          ) },
          { key: 'owner', title: 'Owner', render: (r) => {
            const o = r.ownerEmail || r.owner;
            const label = typeof o === 'object' && o !== null ? (o.email || o.name || o._id) : (o || r.userId || '—');
            return <span className="font-mono text-xs">{String(label)}</span>;
          } },
          { key: 'basePath', title: 'Base path', render: (r) => <code className="font-mono text-xs">{r.basePath || '/'}</code> },
          { key: 'createdAt', title: 'Created', render: (r) => <span className="text-xs">{formatDate(r.createdAt)}</span> },
        ]}
      />
    </div>
  );
}
