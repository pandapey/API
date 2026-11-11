import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { adminService } from '../services/adminService.js';
import { useToast } from '../context/ToastContext.jsx';
import { extractError } from '../services/api.js';
import Table from '../components/Table.jsx';
import Badge from '../components/Badge.jsx';
import { formatDate } from '../utils/format.js';

function arr(x) {
  if (Array.isArray(x)) return x;
  return x?.items || x?.users || x?.data || [];
}

export default function AdminUsers() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const res = await adminService.users();
      setItems(arr(res));
    } catch (e) {
      toast.error(extractError(e, 'Failed to load users'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setRole = async (row, role) => {
    try {
      await adminService.updateUserRole(row._id || row.id, role);
      toast.success(`Role → ${role}`);
      fetchAll();
    } catch (e) {
      toast.error(extractError(e, 'Role update failed'));
    }
  };

  const remove = async (row) => {
    if (!confirm(`Delete user ${row.email}?`)) return;
    try {
      await adminService.deleteUser(row._id || row.id);
      toast.success('User deleted');
      fetchAll();
    } catch (e) {
      toast.error(extractError(e, 'Delete failed'));
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Users</h1>
        <p className="text-sm text-slate-500">Manage roles and access.</p>
      </div>
      <Table
        loading={loading}
        data={items}
        emptyTitle="No users"
        columns={[
          { key: 'name', title: 'Name', render: (r) => <span className="font-semibold">{r.name || '—'}</span> },
          { key: 'email', title: 'Email', render: (r) => <span className="font-mono text-xs">{r.email}</span> },
          { key: 'role', title: 'Role', render: (r) => <Badge tone={r.role === 'admin' ? 'purple' : 'blue'}>{r.role}</Badge> },
          { key: 'createdAt', title: 'Joined', render: (r) => <span className="text-xs">{formatDate(r.createdAt)}</span> },
          { key: 'actions', title: '', render: (r) => (
            <span className="flex gap-1.5">
              <select value={r.role === 'developer' ? 'developer' : r.role} onChange={(e) => setRole(r, e.target.value)} className="input !w-auto !py-1 !text-xs" aria-label={`Role for ${r.email}`}>
                <option value="user">user</option>
                <option value="developer">developer</option>
                <option value="admin">admin</option>
              </select>
              <button onClick={() => remove(r)} aria-label={`Delete ${r.email}`} className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"><Trash2 size={15} /></button>
            </span>
          ) },
        ]}
      />
    </div>
  );
}
