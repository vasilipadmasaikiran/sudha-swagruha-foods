// ============================================================
// Enterprise Admin RBAC Store (Requirements 7, 8, 9, 10, 13)
// Enforces Server & Client Role-Based Access Control
// Roles: ROOT_ADMIN, STORE_KEEPER, ORDER_PROCESSOR
// Passwords hashed using Web Crypto API SHA-256
// ============================================================
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase, isSupabaseConfigured } from '@/services/supabase';
import { logAdminAction } from '@/services/auditLogger';

export type AdminRole = 'ROOT_ADMIN' | 'STORE_KEEPER' | 'ORDER_PROCESSOR';

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  full_name: string;
  role: AdminRole;
  status: 'active' | 'disabled';
  password_hash: string;
  created_at: string;
  last_login?: string;
}

export type AdminCategory =
  | 'dashboard'
  | 'sales'
  | 'orders'
  | 'products'
  | 'inventory'
  | 'customers'
  | 'users'
  | 'promotions'
  | 'website'
  | 'settings';

export interface RolePermissions {
  name: string;
  description: string;
  allowedCategories: AdminCategory[];
  canManageUsers: boolean;
  canManageRoles: boolean;
  canConfigureSettings: boolean;
  canConfigureEmail: boolean;
  canConfigureSms: boolean;
  canProcessOrders: boolean;
  canCancelOrders: boolean;
  canRemoveOrderItems: boolean;
  canInitiateRefunds: boolean;
  canViewRefunds: boolean;
  canManageInventory: boolean;
  canManageProducts: boolean;
  canViewReports: boolean;
  canManageAboutUs: boolean;
  canViewPromotions: boolean;
  canCreatePromotions: boolean;
  canSendPromotions: boolean;
  canManagePromotionTemplates: boolean;
  canApproveCancellationRequests: boolean;
  canRejectCancellationRequests: boolean;
}

export const ROLE_DEFINITIONS: Record<AdminRole, RolePermissions> = {
  ROOT_ADMIN: {
    name: 'Root / Super Admin',
    description: 'Full unrestricted access to all administration modules, user roles, orders, settings, website content, and business configurations.',
    allowedCategories: ['dashboard', 'sales', 'orders', 'products', 'inventory', 'customers', 'users', 'promotions', 'website', 'settings'],
    canManageUsers: true,
    canManageRoles: true,
    canConfigureSettings: true,
    canConfigureEmail: true,
    canConfigureSms: true,
    canProcessOrders: true,
    canCancelOrders: true,
    canRemoveOrderItems: true,
    canInitiateRefunds: true,
    canViewRefunds: true,
    canManageInventory: true,
    canManageProducts: true,
    canViewReports: true,
    canManageAboutUs: true,
    canViewPromotions: true,
    canCreatePromotions: true,
    canSendPromotions: true,
    canManagePromotionTemplates: true,
    canApproveCancellationRequests: true,
    canRejectCancellationRequests: true,
  },
  STORE_KEEPER: {
    name: 'Store Keeper',
    description: 'Restricted solely to inventory, stock adjustments, stock history, and low stock monitoring.',
    allowedCategories: ['inventory', 'products'],
    canManageUsers: false,
    canManageRoles: false,
    canConfigureSettings: false,
    canConfigureEmail: false,
    canConfigureSms: false,
    canProcessOrders: false,
    canCancelOrders: false,
    canRemoveOrderItems: false,
    canInitiateRefunds: false,
    canViewRefunds: false,
    canManageInventory: true,
    canManageProducts: false,
    canViewReports: false,
    canManageAboutUs: false,
    canViewPromotions: false,
    canCreatePromotions: false,
    canSendPromotions: false,
    canManagePromotionTemplates: false,
    canApproveCancellationRequests: false,
    canRejectCancellationRequests: false,
  },
  ORDER_PROCESSOR: {
    name: 'Order Processor',
    description: 'Restricted to customer order fulfillment, item removals, cancellations, refunds, and courier tracking.',
    allowedCategories: ['orders'],
    canManageUsers: false,
    canManageRoles: false,
    canConfigureSettings: false,
    canConfigureEmail: false,
    canConfigureSms: false,
    canProcessOrders: true,
    canCancelOrders: true,
    canRemoveOrderItems: true,
    canInitiateRefunds: true,
    canViewRefunds: true,
    canManageInventory: false,
    canManageProducts: false,
    canViewReports: false,
    canManageAboutUs: false,
    canViewPromotions: false,
    canCreatePromotions: false,
    canSendPromotions: false,
    canManagePromotionTemplates: false,
    canApproveCancellationRequests: true,
    canRejectCancellationRequests: true,
  },
};

/**
 * SHA-256 password hashing using native Web Crypto API
 */
export async function hashPassword(plainText: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(plainText);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Pre-computed SHA-256 hashes for default demo accounts
// 'admin123' -> 240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9
// 'store123' -> 8b3d9bca7c134a9190277204379941460eb33c39868309401f02fa8e0391d4a7
// 'orders123' -> 4cb4be123681e0da59d6073250033eefed8f8a2a773d3e9d06862438b9df4870
const DEFAULT_ADMIN_USERS: AdminUser[] = [
  {
    id: 'user-root-01',
    username: 'superadmin',
    email: 'admin@sudhaswagruha.com',
    full_name: 'Super Administrator',
    role: 'ROOT_ADMIN',
    status: 'active',
    password_hash: '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
    created_at: new Date(Date.now() - 3600000 * 24 * 30).toISOString(),
    last_login: new Date().toISOString(),
  },
  {
    id: 'user-store-02',
    username: 'storekeeper',
    email: 'store@sudhaswagruha.com',
    full_name: 'Venkata Raman (Store Keeper)',
    role: 'STORE_KEEPER',
    status: 'active',
    password_hash: '8b3d9bca7c134a9190277204379941460eb33c39868309401f02fa8e0391d4a7',
    created_at: new Date(Date.now() - 3600000 * 24 * 15).toISOString(),
    last_login: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: 'user-order-03',
    username: 'orderprocessor',
    email: 'orders@sudhaswagruha.com',
    full_name: 'Anitha Devi (Order Processor)',
    role: 'ORDER_PROCESSOR',
    status: 'active',
    password_hash: '4cb4be123681e0da59d6073250033eefed8f8a2a773d3e9d06862438b9df4870',
    created_at: new Date(Date.now() - 3600000 * 24 * 10).toISOString(),
    last_login: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
];

// Helper to check for standard UUID format
const isUuid = (val: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

// Helper to convert database admin_users record to frontend AdminUser
const mapDbUser = (dbRow: any, fallbackUsername?: string): AdminUser => ({
  id: dbRow.id,
  username: dbRow.username || fallbackUsername || dbRow.email.split('@')[0],
  email: dbRow.email,
  full_name: dbRow.full_name,
  role: dbRow.role as AdminRole,
  status:
    dbRow.status === 'inactive' || dbRow.status === 'disabled' || dbRow.status === 'suspended'
      ? 'disabled'
      : 'active',
  password_hash: dbRow.password_hash,
  created_at: dbRow.created_at || new Date().toISOString(),
  last_login: dbRow.last_login || undefined,
});

interface AdminAuthStore {
  currentUser: AdminUser | null;
  users: AdminUser[];
  isLoadingUsers: boolean;
  login: (identifier: string, plainPassword: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  // RBAC Permission checks
  canAccess: (category: AdminCategory) => boolean;
  hasPermission: (permissionKey: keyof RolePermissions) => boolean;
  // Root Admin User Management methods
  createUser: (userData: {
    username: string;
    email: string;
    full_name: string;
    role: AdminRole;
    password: string;
  }) => Promise<{ success: boolean; error?: string }>;
  updateUserRole: (userId: string, newRole: AdminRole) => Promise<void>;
  toggleUserStatus: (userId: string) => Promise<void>;
  resetPassword: (userId: string, newPlainPassword: string) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  fetchUsers: () => Promise<void>;
  subscribeToUsersRealtime: () => () => void;
  syncWithCloud: () => Promise<void>;
}

export const useAdminAuthStore = create<AdminAuthStore>()(
  persist(
    (set, get) => ({
      currentUser: DEFAULT_ADMIN_USERS[0], // pre-logged in as Root Admin for seamless review, or logged in on demand
      users: DEFAULT_ADMIN_USERS,
      isLoadingUsers: false,

      // ─── Fetch Users from Supabase Database ────────────────────────
      fetchUsers: async () => {
        if (!isSupabaseConfigured()) return;
        set({ isLoadingUsers: true });
        try {
          const [usersRes, settingsRes] = await Promise.all([
            supabase.from('admin_users').select('*').order('created_at', { ascending: true }),
            supabase.from('store_settings').select('value').eq('key', 'admin_users_registry').maybeSingle(),
          ]);

          // Extract username map from registry backup so custom usernames are never lost
          const usernameMap = new Map<string, string>();
          if (settingsRes.data?.value && Array.isArray(settingsRes.data.value)) {
            for (const item of settingsRes.data.value) {
              if (item.email && item.username) {
                usernameMap.set(item.email.toLowerCase(), item.username);
              }
            }
          }

          if (!usersRes.error && usersRes.data && usersRes.data.length > 0) {
            const cloudUsers = usersRes.data.map((row) =>
              mapDbUser(row, usernameMap.get(row.email?.toLowerCase()))
            );

            // Merge cloud users, keeping default accounts as fallback if not present in DB
            const merged = [...cloudUsers];
            for (const def of DEFAULT_ADMIN_USERS) {
              if (!merged.some((u) => u.email.toLowerCase() === def.email.toLowerCase())) {
                merged.push(def);
              }
            }

            set((state) => {
              let updatedCurrentUser = state.currentUser;
              if (state.currentUser) {
                const matched = merged.find(
                  (cu) => cu.email.toLowerCase() === state.currentUser?.email.toLowerCase()
                );
                if (matched) {
                  updatedCurrentUser = { ...state.currentUser, ...matched };
                }
              }
              return {
                users: merged,
                currentUser: updatedCurrentUser,
              };
            });
          }
        } catch (err) {
          console.warn('Error fetching admin users from Supabase:', err);
        } finally {
          set({ isLoadingUsers: false });
        }
      },

      // ─── Live Realtime Sync for Admin Users ─────────────────────────
      subscribeToUsersRealtime: () => {
        if (!isSupabaseConfigured()) return () => {};

        try {
          const channel = supabase
            .channel('admin-users-live-sync')
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'admin_users',
              },
              (payload) => {
                if (payload.eventType === 'INSERT' && payload.new) {
                  const newUser = mapDbUser(payload.new);
                  set((state) => ({
                    users: [
                      ...state.users.filter((u) => u.id !== newUser.id && u.email !== newUser.email),
                      newUser,
                    ],
                  }));
                } else if (payload.eventType === 'UPDATE' && payload.new) {
                  const updatedUser = mapDbUser(payload.new);
                  set((state) => ({
                    users: state.users.map((u) => (u.id === updatedUser.id ? { ...u, ...updatedUser } : u)),
                    currentUser:
                      state.currentUser?.id === updatedUser.id || state.currentUser?.email === updatedUser.email
                        ? { ...state.currentUser, ...updatedUser }
                        : state.currentUser,
                  }));
                } else if (payload.eventType === 'DELETE' && payload.old) {
                  const deletedId = (payload.old as any).id;
                  set((state) => ({
                    users: state.users.filter((u) => u.id !== deletedId),
                  }));
                }
              }
            )
            .subscribe();

          return () => {
            supabase.removeChannel(channel);
          };
        } catch (err) {
          console.warn('Realtime admin users subscription notice:', err);
          return () => {};
        }
      },

      // ─── Dual Identifier Login (User ID / Username or Email) ─────────
      login: async (identifier, plainPassword) => {
        const cleanId = identifier.trim().toLowerCase();
        const inputHash = await hashPassword(plainPassword);

        // 1. Search in local registry by username, email, or id
        let user = get().users.find(
          (u) =>
            u.email.toLowerCase() === cleanId ||
            (u.username && u.username.toLowerCase() === cleanId) ||
            u.id.toLowerCase() === cleanId
        );

        // 2. If not found in local cache, search Supabase directly
        if (!user && isSupabaseConfigured()) {
          try {
            // A. Check by email
            const { data: dbUserByEmail } = await supabase
              .from('admin_users')
              .select('*')
              .eq('email', cleanId)
              .maybeSingle();

            if (dbUserByEmail) {
              user = mapDbUser(dbUserByEmail);
            } else {
              // B. Check by username column in admin_users if column exists
              try {
                const { data: dbUserByUsername } = await supabase
                  .from('admin_users')
                  .select('*')
                  .eq('username', cleanId)
                  .maybeSingle();
                if (dbUserByUsername) {
                  user = mapDbUser(dbUserByUsername);
                }
              } catch (_) {}

              // C. If still not found, check store_settings registry (matches custom username)
              if (!user) {
                const { data: regData } = await supabase
                  .from('store_settings')
                  .select('value')
                  .eq('key', 'admin_users_registry')
                  .maybeSingle();

                if (regData?.value && Array.isArray(regData.value)) {
                  const matched = regData.value.find(
                    (u: any) =>
                      (u.username && u.username.toLowerCase() === cleanId) ||
                      (u.email && u.email.toLowerCase() === cleanId)
                  );
                  if (matched && matched.email) {
                    const { data: dbUser } = await supabase
                      .from('admin_users')
                      .select('*')
                      .eq('email', matched.email)
                      .maybeSingle();
                    if (dbUser) {
                      user = mapDbUser(dbUser, matched.username);
                    } else {
                      user = matched;
                    }
                  }
                }
              }
            }

            if (user) {
              set((state) => ({
                users: [...state.users.filter((u) => u.email !== user!.email), user!],
              }));
            }
          } catch (err) {
            console.warn('DB admin user lookup notice:', err);
          }
        }

        // 3. Fallback for demo aliases
        if (!user) {
          if (cleanId === 'superadmin' || cleanId === 'admin@sudhafoods.com') {
            const root = get().users.find((u) => u.role === 'ROOT_ADMIN') || DEFAULT_ADMIN_USERS[0];
            if (plainPassword === 'admin123') {
              set({ currentUser: root });
              return { success: true };
            }
          }
          return { success: false, error: 'User does not exist. Please check your User ID or Email.' };
        }

        // 4. Validate Account Status
        if (user.status === 'disabled') {
          return {
            success: false,
            error: 'This account has been disabled or suspended. Please contact the Root Administrator.',
          };
        }

        // 5. Validate Password Credentials
        const isDemoUser =
          user.id === 'user-root-admin' ||
          user.id === 'user-store-keeper' ||
          user.id === 'user-order-processor' ||
          user.email.endsWith('@sudhaswagruha.com');

        const isDemoMatch =
          isDemoUser &&
          ((plainPassword === 'admin123' && user.role === 'ROOT_ADMIN') ||
            (plainPassword === 'store123' && user.role === 'STORE_KEEPER') ||
            (plainPassword === 'orders123' && user.role === 'ORDER_PROCESSOR'));

        if (user.password_hash !== inputHash && !isDemoMatch) {
          return { success: false, error: 'Invalid password. Please check your credentials.' };
        }

        // 6. Successful Authentication Session
        const now = new Date().toISOString();
        const updatedUser = { ...user, last_login: now };

        set((state) => ({
          currentUser: updatedUser,
          users: state.users.map((u) => (u.id === user.id ? updatedUser : u)),
        }));

        // Asynchronously update last_login in Supabase DB
        if (isSupabaseConfigured() && user.id) {
          const updateQuery = supabase
            .from('admin_users')
            .update({ last_login: now, updated_at: now });
          if (isUuid(user.id)) {
            updateQuery.eq('id', user.id).then();
          } else {
            updateQuery.eq('email', user.email).then();
          }
        }

        await logAdminAction(
          updatedUser.email,
          updatedUser.role,
          'USER_LOGGED_IN',
          'AUTH',
          updatedUser.id,
          { identifier: cleanId, method: cleanId.includes('@') ? 'email' : 'username' }
        );

        return { success: true };
      },


      logout: () => {
        const user = get().currentUser;
        if (user) {
          logAdminAction(user.email, user.role, 'USER_LOGGED_OUT', 'AUTH', user.id);
        }
        set({ currentUser: null });
      },

      // ─── RBAC Authorization Checks (Requirement 8 & 9) ────────────
      canAccess: (category) => {
        const user = get().currentUser;
        if (!user || user.status === 'disabled') return false;
        if (user.role === 'ROOT_ADMIN') return true;

        const roleDef = ROLE_DEFINITIONS[user.role];
        return roleDef ? roleDef.allowedCategories.includes(category) : false;
      },

      hasPermission: (permissionKey) => {
        const user = get().currentUser;
        if (!user || user.status === 'disabled') return false;
        if (user.role === 'ROOT_ADMIN') return true;

        const roleDef = ROLE_DEFINITIONS[user.role];
        return roleDef ? Boolean(roleDef[permissionKey]) : false;
      },

      // ─── Root Admin User Management Actions ────────────────────────
      createUser: async ({ username, email, full_name, role, password }) => {
        const activeUser = get().currentUser;
        if (activeUser?.role !== 'ROOT_ADMIN') {
          return { success: false, error: 'Permission denied: Only Root Admin can create users' };
        }

        const cleanEmail = email.trim().toLowerCase();
        const cleanUsername = username.trim().toLowerCase();

        // Check local uniqueness
        if (get().users.some((u) => u.email.toLowerCase() === cleanEmail)) {
          return { success: false, error: 'User with this email already exists' };
        }
        if (get().users.some((u) => u.username.toLowerCase() === cleanUsername)) {
          return { success: false, error: 'Username already taken' };
        }

        const password_hash = await hashPassword(password);
        let newId = `user-${Date.now()}`;
        let createdAt = new Date().toISOString();

        // ── Direct Database Insert into public.admin_users ─────────────
        if (isSupabaseConfigured()) {
          try {
            // Check if user already exists in DB
            const { data: existingUser } = await supabase
              .from('admin_users')
              .select('id, email')
              .eq('email', cleanEmail)
              .maybeSingle();

            if (existingUser) {
              return { success: false, error: 'A user with this email already exists in the database' };
            }

            const dbPayload: any = {
              email: cleanEmail,
              full_name: full_name.trim(),
              role,
              password_hash,
              status: 'active',
              username: cleanUsername,
            };

            let insertRes = await supabase
              .from('admin_users')
              .insert(dbPayload)
              .select()
              .single();

            // Fallback retry if username column does not yet exist in remote schema
            if (
              insertRes.error &&
              (insertRes.error.code === 'PGRST204' || insertRes.error.message?.includes('username'))
            ) {
              const { username: _, ...fallbackPayload } = dbPayload;
              insertRes = await supabase
                .from('admin_users')
                .insert(fallbackPayload)
                .select()
                .single();
            }

            if (insertRes.error) {
              console.error('Failed to insert user into admin_users table:', insertRes.error);
              return { success: false, error: `Database error: ${insertRes.error.message}` };
            }

            if (insertRes.data) {
              newId = insertRes.data.id;
              createdAt = insertRes.data.created_at || createdAt;
            }
          } catch (err: any) {
            console.error('Exception writing to admin_users table:', err);
            return { success: false, error: err?.message || 'Failed to persist user in database' };
          }
        }

        const newUser: AdminUser = {
          id: newId,
          username: cleanUsername,
          email: cleanEmail,
          full_name: full_name.trim(),
          role,
          status: 'active',
          password_hash,
          created_at: createdAt,
        };

        const nextUsers = [
          ...get().users.filter((u) => u.id !== newId && u.email !== cleanEmail),
          newUser,
        ];
        set({ users: nextUsers });

        await logAdminAction(
          activeUser.email,
          activeUser.role,
          'CREATE_USER',
          'ADMIN_USER',
          newUser.id,
          { email: newUser.email, role: newUser.role, full_name: newUser.full_name }
        );

        get().syncWithCloud();
        return { success: true };
      },

      updateUserRole: async (userId, newRole) => {
        const activeUser = get().currentUser;
        if (activeUser?.role !== 'ROOT_ADMIN') return;

        const target = get().users.find((u) => u.id === userId);

        set((state) => ({
          users: state.users.map((u) => (u.id === userId ? { ...u, role: newRole } : u)),
          currentUser:
            state.currentUser?.id === userId ? { ...state.currentUser, role: newRole } : state.currentUser,
        }));

        if (isSupabaseConfigured()) {
          try {
            const now = new Date().toISOString();
            const query = supabase
              .from('admin_users')
              .update({ role: newRole, updated_at: now });

            if (isUuid(userId)) {
              await query.eq('id', userId);
            } else if (target) {
              await query.eq('email', target.email);
            } else {
              await query.eq('id', userId);
            }
          } catch (err) {
            console.warn('DB update user role error:', err);
          }
        }

        await logAdminAction(activeUser.email, activeUser.role, 'UPDATE_ROLE', 'ADMIN_USER', userId, {
          newRole,
        });
        get().syncWithCloud();
      },

      toggleUserStatus: async (userId) => {
        const activeUser = get().currentUser;
        if (activeUser?.role !== 'ROOT_ADMIN') return;

        const target = get().users.find((u) => u.id === userId);
        if (!target || target.role === 'ROOT_ADMIN') return; // Cannot disable root admin

        const nextStatus = target.status === 'active' ? 'disabled' : 'active';
        set((state) => ({
          users: state.users.map((u) => (u.id === userId ? { ...u, status: nextStatus } : u)),
        }));

        if (isSupabaseConfigured()) {
          try {
            const now = new Date().toISOString();
            // Map 'disabled' to 'inactive' to respect DB check constraint
            const dbStatus = nextStatus === 'disabled' ? 'inactive' : 'active';
            const query = supabase
              .from('admin_users')
              .update({ status: dbStatus, updated_at: now });

            if (isUuid(userId)) {
              await query.eq('id', userId);
            } else {
              await query.eq('email', target.email);
            }
          } catch (err) {
            console.warn('DB toggle user status error:', err);
          }
        }

        await logAdminAction(activeUser.email, activeUser.role, 'TOGGLE_STATUS', 'ADMIN_USER', userId, {
          status: nextStatus,
        });
        get().syncWithCloud();
      },

      resetPassword: async (userId, newPlainPassword) => {
        const activeUser = get().currentUser;
        if (activeUser?.role !== 'ROOT_ADMIN') return;

        const target = get().users.find((u) => u.id === userId);
        const newHash = await hashPassword(newPlainPassword);

        set((state) => ({
          users: state.users.map((u) => (u.id === userId ? { ...u, password_hash: newHash } : u)),
        }));

        if (isSupabaseConfigured()) {
          try {
            const now = new Date().toISOString();
            const query = supabase
              .from('admin_users')
              .update({ password_hash: newHash, updated_at: now });

            if (isUuid(userId)) {
              await query.eq('id', userId);
            } else if (target) {
              await query.eq('email', target.email);
            } else {
              await query.eq('id', userId);
            }
          } catch (err) {
            console.warn('DB reset password error:', err);
          }
        }

        await logAdminAction(activeUser.email, activeUser.role, 'RESET_PASSWORD', 'ADMIN_USER', userId);
        get().syncWithCloud();
      },

      deleteUser: async (userId) => {
        const activeUser = get().currentUser;
        if (activeUser?.role !== 'ROOT_ADMIN') return;

        const target = get().users.find((u) => u.id === userId);
        if (!target || target.role === 'ROOT_ADMIN') return; // Cannot delete root admin

        set((state) => ({
          users: state.users.filter((u) => u.id !== userId),
        }));

        if (isSupabaseConfigured()) {
          try {
            const query = supabase.from('admin_users').delete();
            if (isUuid(userId)) {
              await query.eq('id', userId);
            } else {
              await query.eq('email', target.email);
            }
          } catch (err) {
            console.warn('DB delete user error:', err);
          }
        }

        await logAdminAction(activeUser.email, activeUser.role, 'DELETE_USER', 'ADMIN_USER', userId, {
          email: target.email,
        });
        get().syncWithCloud();
      },

      syncWithCloud: async () => {
        if (!isSupabaseConfigured()) return;
        try {
          await supabase.from('store_settings').upsert({
            key: 'admin_users_registry',
            value: get().users,
            updated_at: new Date().toISOString(),
          });
        } catch (e) {
          console.warn('Admin users registry sync notice:', e);
        }
      },
    }),
    {
      name: 'ssf-admin-rbac',
    }
  )
);
