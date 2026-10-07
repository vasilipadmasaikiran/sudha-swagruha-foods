// ============================================================
// Admin Users & RBAC Management Tab (Requirements 7, 8, 9, 10, 13, 18)
// Root Admin can create, edit, enable/disable users, reset passwords,
// assign roles, inspect RBAC permissions matrix, and view audit trail.
// ============================================================
import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  UserPlus,
  Shield,
  Key,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Filter,
  Lock,
  Mail,
  User,
  Trash2,
  Clock,
  History,
  Check,
  X,
  FileText,
} from 'lucide-react';
import {
  useAdminAuthStore,
  ROLE_DEFINITIONS,
  type AdminUser,
  type AdminRole,
} from '@/hooks/useAdminAuthStore';
import { useAuditStore } from '@/services/auditLogger';
import toast from 'react-hot-toast';

export default function AdminUsersTab() {
  const {
    currentUser,
    users,
    createUser,
    updateUserRole,
    toggleUserStatus,
    resetPassword,
    deleteUser,
    fetchUsers,
  } = useAdminAuthStore();

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);


  const { logs } = useAuditStore();

  const [activeSubTab, setActiveSubTab] = useState<'users' | 'roles' | 'permissions' | 'audit'>('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Create User Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newConfirmPassword, setNewConfirmPassword] = useState('');
  const [newRole, setNewRole] = useState<AdminRole>('ORDER_PROCESSOR');
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

  // Reset Password Modal State
  const [resetTargetUser, setResetTargetUser] = useState<AdminUser | null>(null);
  const [newPasswordVal, setNewPasswordVal] = useState('');
  const [isSubmittingReset, setIsSubmittingReset] = useState(false);

  // Delete User Confirm State
  const [deleteTargetUser, setDeleteTargetUser] = useState<AdminUser | null>(null);

  const isRootAdmin = currentUser?.role === 'ROOT_ADMIN';

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        u.full_name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q);
      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  // Handle Create User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName || !newUsername || !newEmail || !newPassword) {
      toast.error('All fields are required');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }
    if (newPassword !== newConfirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsSubmittingCreate(true);
    try {
      const res = await createUser({
        full_name: newFullName,
        username: newUsername,
        email: newEmail,
        password: newPassword,
        role: newRole,
      });

      if (res.success) {
        toast.success(`User ${newFullName} (${ROLE_DEFINITIONS[newRole].name}) created successfully!`);
        setCreateModalOpen(false);
        setNewFullName('');
        setNewUsername('');
        setNewEmail('');
        setNewPassword('');
        setNewConfirmPassword('');
        setNewRole('ORDER_PROCESSOR');
      } else {
        toast.error(res.error || 'Failed to create user');
      }
    } catch {
      toast.error('Failed to create user');
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // Handle Reset Password Submit
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTargetUser || !newPasswordVal) return;
    if (newPasswordVal.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsSubmittingReset(true);
    try {
      await resetPassword(resetTargetUser.id, newPasswordVal);
      toast.success(`Password reset successfully for ${resetTargetUser.full_name}`);
      setResetTargetUser(null);
      setNewPasswordVal('');
    } catch {
      toast.error('Failed to reset password');
    } finally {
      setIsSubmittingReset(false);
    }
  };

  if (!isRootAdmin) {
    return (
      <div className="bg-slate-950 p-8 rounded-3xl border border-red-500/30 text-center space-y-3">
        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto" />
        <h3 className="text-lg font-bold text-white">Access Restricted</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Role-Based Access Control: You are logged in as{' '}
          <strong className="text-white">{currentUser?.role}</strong>. User management and RBAC administration are strictly restricted to Root / Super Administrators.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Sub-Tabs Navigation (Requirement 6) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-400" />
            <span>Admin Users & Role-Based Access Control (RBAC)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage administrative personnel, assign roles, enforce server-side security, and inspect audit logs.
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/30 cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Create Admin User</span>
        </button>
      </div>

      {/* Sub Tabs */}
      <div className="flex gap-2 border-b border-slate-800 pb-2 text-xs">
        <button
          onClick={() => setActiveSubTab('users')}
          className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'users'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Users Directory ({users.length})</span>
        </button>
        <button
          onClick={() => setActiveSubTab('roles')}
          className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'roles'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Roles & Access Levels</span>
        </button>
        <button
          onClick={() => setActiveSubTab('permissions')}
          className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'permissions'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Key className="w-3.5 h-3.5" />
          <span>RBAC Matrix</span>
        </button>
        <button
          onClick={() => setActiveSubTab('audit')}
          className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'audit'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Security Audit Trail ({logs.length})</span>
        </button>
      </div>

      {/* ─── TAB 1: USERS DIRECTORY (Requirement 10) ─── */}
      {activeSubTab === 'users' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/40 p-3 rounded-2xl border border-slate-800">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search user by name, email, or username..."
                className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">Role:</span>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs cursor-pointer focus:outline-none"
              >
                <option value="all">All Roles</option>
                <option value="ROOT_ADMIN">Root Admin</option>
                <option value="STORE_KEEPER">Store Keeper</option>
                <option value="ORDER_PROCESSOR">Order Processor</option>
              </select>

              <span className="text-slate-400 ml-2">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs cursor-pointer focus:outline-none"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>
          </div>

          {/* Users Table (Requirement 10) */}
          <div className="bg-slate-950/60 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-3.5">User & Details</th>
                    <th className="px-4 py-3.5">Assigned Role</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5">Last Login & Created</th>
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredUsers.map((u) => {
                    const isSelf = currentUser?.id === u.id;
                    const roleCfg = ROLE_DEFINITIONS[u.role];
                    return (
                      <tr key={u.id} className="hover:bg-slate-900/40 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-slate-800 text-indigo-400 font-bold flex items-center justify-center uppercase text-sm border border-slate-700">
                              {u.full_name[0] || u.username[0]}
                            </div>
                            <div>
                              <p className="font-bold text-white text-sm flex items-center gap-1.5">
                                <span>{u.full_name}</span>
                                {isSelf && (
                                  <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.2 rounded-full">
                                    You
                                  </span>
                                )}
                              </p>
                              <p className="text-slate-400 font-mono text-[11px] mt-0.5">
                                {u.email} • <span className="text-slate-500">@{u.username}</span>
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Assigned Role (Requirement 10) */}
                        <td className="px-4 py-3.5 align-middle">
                          <div className="flex items-center gap-2">
                            <select
                              value={u.role}
                              disabled={u.role === 'ROOT_ADMIN' && isSelf}
                              onChange={(e) => updateUserRole(u.id, e.target.value as AdminRole)}
                              className={`px-3 py-1 rounded-xl text-xs font-bold border transition-colors cursor-pointer focus:outline-none ${
                                u.role === 'ROOT_ADMIN'
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                  : u.role === 'STORE_KEEPER'
                                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              }`}
                            >
                              <option value="ROOT_ADMIN">Root / Super Admin</option>
                              <option value="STORE_KEEPER">Store Keeper</option>
                              <option value="ORDER_PROCESSOR">Order Processor</option>
                            </select>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-0.5 max-w-xs truncate">
                            {roleCfg?.description}
                          </p>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5 align-middle">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              u.status === 'active'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-red-500/20 text-red-400 border border-red-500/30'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${u.status === 'active' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                            <span>{u.status}</span>
                          </span>
                        </td>

                        {/* Last Login & Created */}
                        <td className="px-4 py-3.5 align-middle text-slate-400 text-[11px]">
                          <div>
                            <span className="text-slate-500">Last login: </span>
                            <span className="font-medium text-slate-300">
                              {u.last_login ? new Date(u.last_login).toLocaleString() : 'Never'}
                            </span>
                          </div>
                          <div className="mt-0.5 text-slate-500">
                            Created: {new Date(u.created_at).toLocaleDateString()}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3.5 text-right align-middle">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Enable/Disable Toggle */}
                            {u.role !== 'ROOT_ADMIN' && (
                              <button
                                onClick={() => toggleUserStatus(u.id)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                                  u.status === 'active'
                                    ? 'bg-slate-800 hover:bg-red-950/60 text-slate-300 hover:text-red-300 border border-slate-700'
                                    : 'bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/40'
                                }`}
                                title={u.status === 'active' ? 'Disable this user' : 'Enable this user'}
                              >
                                {u.status === 'active' ? 'Disable' : 'Enable'}
                              </button>
                            )}

                            {/* Reset Password */}
                            <button
                              onClick={() => {
                                setResetTargetUser(u);
                                setNewPasswordVal('');
                              }}
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                              title="Reset Password"
                            >
                              <Key className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete User */}
                            {u.role !== 'ROOT_ADMIN' && (
                              <button
                                onClick={() => setDeleteTargetUser(u)}
                                className="p-1.5 bg-slate-800/80 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                                title="Delete User"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: ROLES & ACCESS LEVELS (Requirement 8) ─── */}
      {activeSubTab === 'roles' && (
        <div className="grid md:grid-cols-3 gap-6">
          {(Object.keys(ROLE_DEFINITIONS) as AdminRole[]).map((roleKey) => {
            const role = ROLE_DEFINITIONS[roleKey];
            const userCount = users.filter((u) => u.role === roleKey).length;
            return (
              <div
                key={roleKey}
                className="bg-slate-950/70 p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`px-3 py-1 rounded-xl text-xs font-bold uppercase ${
                      roleKey === 'ROOT_ADMIN'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : roleKey === 'STORE_KEEPER'
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    {roleKey.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {userCount} user{userCount === 1 ? '' : 's'} assigned
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-white">{role.name}</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{role.description}</p>
                </div>

                <div className="pt-3 border-t border-slate-800/80 space-y-2 text-xs">
                  <p className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">
                    Allowed Admin Modules:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {role.allowedCategories.map((cat) => (
                      <span
                        key={cat}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700/80 text-slate-300 capitalize font-medium text-[11px]"
                      >
                        ✓ {cat}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── TAB 3: RBAC MATRIX (Requirement 8 & Final Matrix) ─── */}
      {activeSubTab === 'permissions' && (
        <div className="bg-slate-950/70 rounded-3xl border border-slate-800 overflow-hidden shadow-xl p-6 space-y-4">
          <div>
            <h3 className="font-bold text-white text-base">Enterprise RBAC Permissions Matrix</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Enforced across both frontend navigation routing and server-side authorization checks.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-800 rounded-xl overflow-hidden">
              <thead className="bg-slate-900 text-slate-300 uppercase text-[11px]">
                <tr>
                  <th className="px-4 py-3">Feature / Module</th>
                  <th className="px-4 py-3 text-center text-amber-400">Root / Super Admin</th>
                  <th className="px-4 py-3 text-center text-blue-400">Store Keeper</th>
                  <th className="px-4 py-3 text-center text-emerald-400">Order Processor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                <tr>
                  <td className="px-4 py-3 font-semibold text-white">Dashboard & Overview</td>
                  <td className="px-4 py-3 text-center text-emerald-400 font-bold">✓ Full Access</td>
                  <td className="px-4 py-3 text-center text-slate-500">✗ Restricted</td>
                  <td className="px-4 py-3 text-center text-slate-500">✗ Restricted</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-semibold text-white">User Management & Roles</td>
                  <td className="px-4 py-3 text-center text-emerald-400 font-bold">✓ Full Access</td>
                  <td className="px-4 py-3 text-center text-red-400">✗ Denied (403)</td>
                  <td className="px-4 py-3 text-center text-red-400">✗ Denied (403)</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-semibold text-white">Product Catalog & Images</td>
                  <td className="px-4 py-3 text-center text-emerald-400 font-bold">✓ Full Edit</td>
                  <td className="px-4 py-3 text-center text-blue-400 font-semibold">✓ View & Stock</td>
                  <td className="px-4 py-3 text-center text-red-400">✗ Denied (403)</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-semibold text-white">Inventory & Stock Adjustments</td>
                  <td className="px-4 py-3 text-center text-emerald-400 font-bold">✓ Full Access</td>
                  <td className="px-4 py-3 text-center text-emerald-400 font-bold">✓ Full Access</td>
                  <td className="px-4 py-3 text-center text-red-400">✗ Denied (403)</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-semibold text-white">Customer Orders & Tracking ID</td>
                  <td className="px-4 py-3 text-center text-emerald-400 font-bold">✓ Full Access</td>
                  <td className="px-4 py-3 text-center text-red-400">✗ Denied (403)</td>
                  <td className="px-4 py-3 text-center text-emerald-400 font-bold">✓ Full Access</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-semibold text-white">Customer Records</td>
                  <td className="px-4 py-3 text-center text-emerald-400 font-bold">✓ Full Access</td>
                  <td className="px-4 py-3 text-center text-red-400">✗ Denied</td>
                  <td className="px-4 py-3 text-center text-emerald-400 font-medium">✓ Delivery Info Only</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-semibold text-white">Business Settings & Name</td>
                  <td className="px-4 py-3 text-center text-emerald-400 font-bold">✓ Full Access</td>
                  <td className="px-4 py-3 text-center text-red-400">✗ Denied (403)</td>
                  <td className="px-4 py-3 text-center text-red-400">✗ Denied (403)</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-semibold text-white">Email & SMTP Configuration</td>
                  <td className="px-4 py-3 text-center text-emerald-400 font-bold">✓ Full Access</td>
                  <td className="px-4 py-3 text-center text-red-400">✗ Denied (403)</td>
                  <td className="px-4 py-3 text-center text-red-400">✗ Denied (403)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB 4: AUDIT TRAIL (Requirement 18) ─── */}
      {activeSubTab === 'audit' && (
        <div className="bg-slate-950/70 rounded-3xl border border-slate-800 p-6 space-y-4">
          <div>
            <h3 className="font-bold text-white text-base">Security Audit Log</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Immutable chronological record of administrative actions, role assignments, and dispatch updates.
            </p>
          </div>

          <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
            {logs.map((log) => (
              <div
                key={log.id}
                className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-500/30 text-[11px]">
                      {log.action}
                    </span>
                    <span className="text-slate-300 font-semibold">{log.entity}</span>
                    {log.entity_id && (
                      <span className="text-slate-400 font-mono text-[11px]">#{log.entity_id}</span>
                    )}
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    Executed by: <strong className="text-slate-200">{log.user_email}</strong> (
                    <span className="text-amber-300">{log.user_role}</span>)
                  </p>
                  {log.details && (
                    <p className="text-[10px] text-slate-500 font-mono">
                      {JSON.stringify(log.details)}
                    </p>
                  )}
                </div>

                <div className="text-slate-500 text-[11px] font-mono flex items-center gap-1 flex-shrink-0">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{new Date(log.timestamp).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── MODAL: CREATE USER (Requirement 7) ─── */}
      <AnimatePresence>
        {createModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 text-slate-100 space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600/30 text-indigo-400 border border-indigo-500/40 flex items-center justify-center">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-white text-base">Create Admin User</h3>
                </div>
                <button
                  onClick={() => setCreateModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold uppercase tracking-wider text-slate-300 mb-1">
                      Username *
                    </label>
                    <input
                      type="text"
                      required
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      placeholder="e.g. ramesh_admin"
                      className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold uppercase tracking-wider text-slate-300 mb-1">
                      Assign Role *
                    </label>
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value as AdminRole)}
                      className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-bold cursor-pointer focus:outline-none focus:border-indigo-500"
                    >
                      <option value="ORDER_PROCESSOR">Order Processor</option>
                      <option value="STORE_KEEPER">Store Keeper</option>
                      <option value="ROOT_ADMIN">Root / Super Admin</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="ramesh@sudhaswagruha.com"
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold uppercase tracking-wider text-slate-300 mb-1">
                      Password *
                    </label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 6 chars"
                      className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold uppercase tracking-wider text-slate-300 mb-1">
                      Confirm Password *
                    </label>
                    <input
                      type="password"
                      required
                      value={newConfirmPassword}
                      onChange={(e) => setNewConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCreateModalOpen(false)}
                    className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingCreate}
                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-colors shadow-lg shadow-indigo-600/30 cursor-pointer disabled:opacity-60"
                  >
                    {isSubmittingCreate ? 'Saving...' : 'Create User'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── MODAL: RESET PASSWORD ─── */}
      <AnimatePresence>
        {resetTargetUser && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 text-slate-100 space-y-4 shadow-2xl"
            >
              <div>
                <h3 className="font-bold text-white text-base">Reset Password</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Enter a new secure password for <strong className="text-white">{resetTargetUser.full_name}</strong>.
                </p>
              </div>

              <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={newPasswordVal}
                    onChange={(e) => setNewPasswordVal(e.target.value)}
                    placeholder="Enter at least 6 characters"
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setResetTargetUser(null)}
                    className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingReset}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl cursor-pointer disabled:opacity-60"
                  >
                    {isSubmittingReset ? 'Updating...' : 'Set Password'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── MODAL: DELETE CONFIRM ─── */}
      <AnimatePresence>
        {deleteTargetUser && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 text-slate-100 text-center space-y-4 shadow-2xl"
            >
              <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Delete Admin User?</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Are you sure you want to delete <strong className="text-white">{deleteTargetUser.full_name}</strong>?
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setDeleteTargetUser(null)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    await deleteUser(deleteTargetUser.id);
                    toast.success('User deleted successfully');
                    setDeleteTargetUser(null);
                  }}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-red-600/30 cursor-pointer"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
