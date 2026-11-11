import { useEffect, useRef, useState } from 'react';
import { ShieldBan, ShieldCheck, Trash2, Users } from 'lucide-react';
import { adminService } from '../services/adminService.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { extractError } from '../services/api.js';
import Table from '../components/Table.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Badge from '../components/Badge.jsx';
import { formatDate } from '../utils/format.js';

function arr(x) {
  if (Array.isArray(x)) return x;
  return x?.items || x?.users || x?.data || [];
}

export default function AdminUsers() {
  const toast = useToast();
  const { user: me } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmSuspend, setConfirmSuspend] = useState(null); // { row, next }
  const [rowBusy, setRowBusy] = useState(false);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const res = await adminService.users();
      if (!mountedRef.current) return;
      setItems(arr(res));
    } catch (e) {
      if (!mountedRef.current) return;
      toast.error(extractError(e, 'Failed to load users'));
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setRole = async (row, role) => {
    setRowBusy(true);
    try {
      await adminService.updateUserRole(row._id || row.id, role);
      toast.success(`${row.email} → ${role}`);
      fetchAll();
    } catch (e) {
      toast.error(extractError(e, 'Role update failed'));
      fetchAll(); // re-sync — a failed change must not leave a stale select
    } finally {
      if (mountedRef.current) setRowBusy(false);
    }
  };

  const onConfirmSuspend = async () => {
    if (!confirmSuspend) return;
    const { row, next } = confirmSuspend;
    setRowBusy(true);
    try {
      await adminService.suspend(row._id || row.id, next);
      toast.success(next ? `${row.email} suspended — sign-in & API access blocked` : `${row.email} unsuspended`);
      setConfirmSuspend(null);
      fetchAll();
    } catch (e) {
      toast.error(extractError(e, 'Suspend update failed'));
    } finally {
      if (mountedRef.current) setRowBusy(false);
    }
  };

  const onConfirmDelete = async () => {
    const row = confirmDelete;
    if (!row) return;
    setRowBusy(true);
    try {
      await adminService.deleteUser(row._id || row.id);
      toast.success(`${row.email} deleted`);
      setConfirmDelete(null);
      fetchAll();
    } catch (e) {
      toast.error(extractError(e, 'Delete failed'));
    } finally {
      if (mountedRef.current) setRowBusy(false);
    }
  };

  const isSelf = (row) => (row._id || row.id) === (me?.id || me?._id);

  return (
    <div className="space-y-4">
      <PageHeader icon={Users} title="Users" subtitle="Manage roles, suspension and access." />

      <Table
        loading={loading}
        data={items}
        emptyTitle="No users"
        columns={[
          { key: 'name', title: 'Name', render: (r) => (
            <span className="flex items-center gap-2 font-semibold">
              {r.name || '—'}
              {isSelf(r) && <Badge tone="slate">you</Badge>}
            </span>
          ) },
          { key: 'email', title: 'Email', render: (r) => <span className="font-mono text-xs">{r.email}</span> },
          { key: 'role', title: 'Role', render: (r) => <Badge tone={r.role === 'admin' ? 'purple' : 'blue'}>{r.role}</Badge> },
          { key: 'suspended', title: 'Access', render: (r) => <Badge tone={r.suspended ? 'red' : 'green'}>{r.suspended ? 'suspended' : 'active'}</Badge> },
          { key: 'createdAt', title: 'Joined', render: (r) => <span className="text-xs">{formatDate(r.createdAt)}</span> },
          { key: 'actions', title: 'Actions', render: (r) => (
            <span className="flex justify-end gap-1.5">
              <select
                value={r.role === 'developer' ? 'developer' : r.role}
                onChange={(e) => setRole(r, e.target.value)}
                disabled={rowBusy}
                className="input !w-auto !py-1 !text-xs"
                aria-label={`Role for ${r.email}`}
              >
                <option value="user">user</option>
                <option value="developer">developer</option>
                <option value="admin">admin</option>
              </select>
              {!isSelf(r) && (
                <button
                  onClick={() => setConfirmSuspend({ row: r, next: !r.suspended })}
                  disabled={rowBusy}
                  className={`rounded-lg p-1.5 transition disabled:opacity-50 ${r.suspended ? 'text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40' : 'text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/40'}`}
                  title={r.suspended ? 'Unsuspend — restore sign-in and API access' : 'Suspend — block sign-in and API access'}
                  aria-label={r.suspended ? `Unsuspend ${r.email}` : `Suspend ${r.email}`}
                >
                  {r.suspended ? <ShieldCheck size={15} /> : <ShieldBan size={15} />}
                </button>
              )}
              {!isSelf(r) && (
                <button
                  onClick={() => setConfirmDelete(r)}
                  disabled={rowBusy}
                  className="rounded-lg p-1.5 text-rose-500 transition hover:bg-rose-50 disabled:opacity-50 dark:hover:bg-rose-950/40"
                  title={`Delete ${r.email} and all of their data`}
                  aria-label={`Delete ${r.email}`}
                >
                  <Trash2 size={15} />
                </button>
              )}
            </span>
          ) },
        ]}
      />

      <ConfirmDialog
        open={!!confirmSuspend}
        onClose={() => setConfirmSuspend(null)}
        onConfirm={onConfirmSuspend}
        busy={rowBusy}
        tone={confirmSuspend?.next ? 'danger' : 'brand'}
        title={confirmSuspend?.next ? 'Suspend user?' : 'Unsuspend user?'}
        confirmLabel={confirmSuspend?.next ? 'Suspend' : 'Unsuspend'}
        message={
          confirmSuspend?.next
            ? `${confirmSuspend?.row?.email} will be signed out and blocked from signing in or calling the API until unsuspended.`
            : `${confirmSuspend?.row?.email} will regain sign-in and API access immediately.`
        }
      />
      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={onConfirmDelete}
        busy={rowBusy}
        title="Delete user?"
        confirmLabel="Delete forever"
        message={confirmDelete ? `Permanently deletes ${confirmDelete.email} and cascades their projects, keys, webhooks and logs. This cannot be undone.` : ''}
      />
    </div>
  );
}
