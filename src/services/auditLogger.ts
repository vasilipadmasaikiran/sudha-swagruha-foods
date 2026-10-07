// ============================================================
// Enterprise Audit Logging Service (Requirement 18)
// Records sensitive administrative actions with user, action, entity, timestamp
// Never logs passwords or sensitive credentials
// ============================================================
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase, isSupabaseConfigured } from './supabase';

export interface AuditLogEntry {
  id: string;
  user_email: string;
  user_role: string;
  action: string;
  entity: string;
  entity_id?: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

interface AuditStore {
  logs: AuditLogEntry[];
  addLog: (entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) => Promise<void>;
  clearLogs: () => void;
}

const initialLogs: AuditLogEntry[] = [
  {
    id: 'log-1',
    user_email: 'admin@sudhaswagruha.com',
    user_role: 'ROOT_ADMIN',
    action: 'SYSTEM_INITIALIZED',
    entity: 'SYSTEM',
    details: { version: '2.0-Enterprise', rbac: 'enabled' },
    timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
];

export const useAuditStore = create<AuditStore>()(
  persist(
    (set, get) => ({
      logs: initialLogs,

      addLog: async (entry) => {
        const newLog: AuditLogEntry = {
          ...entry,
          id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          timestamp: new Date().toISOString(),
        };

        set((state) => ({
          logs: [newLog, ...state.logs.slice(0, 199)], // keep last 200 logs
        }));

        if (isSupabaseConfigured()) {
          try {
            await supabase.from('store_settings').upsert({
              key: 'audit_logs_recent',
              value: get().logs.slice(0, 50),
              updated_at: new Date().toISOString(),
            });
          } catch (e) {
            console.warn('Audit log cloud sync notice:', e);
          }
        }
      },

      clearLogs: () => set({ logs: [] }),
    }),
    {
      name: 'ssf-audit-logs',
    }
  )
);

export async function logAdminAction(
  user_email: string,
  user_role: string,
  action: string,
  entity: string,
  entity_id?: string,
  details?: Record<string, unknown>
) {
  // Sanitize any password or secret keys from details
  const sanitizedDetails = details ? { ...details } : undefined;
  if (sanitizedDetails) {
    if ('password' in sanitizedDetails) delete sanitizedDetails.password;
    if ('password_hash' in sanitizedDetails) delete sanitizedDetails.password_hash;
    if ('razorpayKeySecret' in sanitizedDetails) delete sanitizedDetails.razorpayKeySecret;
    if ('resendApiKey' in sanitizedDetails) delete sanitizedDetails.resendApiKey;
  }

  await useAuditStore.getState().addLog({
    user_email,
    user_role,
    action,
    entity,
    entity_id,
    details: sanitizedDetails,
  });
}
