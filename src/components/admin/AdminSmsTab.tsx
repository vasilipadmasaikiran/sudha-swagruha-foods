// ============================================================
// Admin Console - SMS Notifications & Gateway Configuration (Requirements 20, 21, 22, 23, 25, 42)
// Strictly restricted to ROOT_ADMIN role.
// Configure Fast2SMS, Twilio, MSG91, Webhook Relay, Event Toggles & Test SMS
// ============================================================
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  MessageSquare,
  Shield,
  Key,
  Lock,
  Save,
  Send,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Clock,
  RefreshCw,
  Sliders,
  Check,
  X,
  History,
} from 'lucide-react';
import { useSettingsStore, type SmsSettings, defaultSmsSettings } from '@/hooks/useSettingsStore';
import { useAdminAuthStore } from '@/hooks/useAdminAuthStore';
import { SmsService, type SmsSendResult } from '@/services/smsService';
import { logAdminAction } from '@/services/auditLogger';
import toast from 'react-hot-toast';

export default function AdminSmsTab() {
  const { settings, updateSmsSettings } = useSettingsStore();
  const { currentUser } = useAdminAuthStore();

  const isRootAdmin = currentUser?.role === 'ROOT_ADMIN';

  const [smsConfig, setSmsConfig] = useState<SmsSettings>({
    ...(settings.sms || defaultSmsSettings),
    events: {
      ...(settings.sms?.events || defaultSmsSettings.events),
    },
  });

  const [testNumber, setTestNumber] = useState(settings.sms?.testMobileNumber || '8374634989');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<SmsSendResult | null>(null);
  const [logs, setLogs] = useState(SmsService.getRecentLogs());

  // ── Access Control Guard (Requirement 25) ──────────────────────────
  if (!isRootAdmin) {
    return (
      <div className="bg-red-950/40 border border-red-500/30 rounded-3xl p-8 text-center max-w-lg mx-auto my-8">
        <Shield className="w-12 h-12 text-red-400 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-white">403 Forbidden - Access Restricted</h3>
        <p className="text-xs text-slate-300 mt-2 leading-relaxed">
          Only <strong className="text-amber-400">Root / Super Administrators</strong> are permitted
          to view, configure, or modify SMS service credentials and global notification triggers.
        </p>
      </div>
    );
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    updateSmsSettings(smsConfig);

    await logAdminAction(
      currentUser?.email || 'admin@sudhaswagruha.com',
      'ROOT_ADMIN',
      'UPDATE_SMS_CONFIGURATION',
      'SETTINGS',
      'SMS_GATEWAY',
      {
        provider: smsConfig.provider,
        enabled: smsConfig.enabled,
        senderId: smsConfig.senderId,
      }
    );

    toast.success('SMS Gateway settings & event triggers saved!');
  };

  const handleSendTest = async () => {
    if (!testNumber.trim()) {
      toast.error('Please enter a test mobile number');
      return;
    }

    setIsSendingTest(true);
    setTestResult(null);

    try {
      const res = await SmsService.sendTestSms(testNumber, {
        ...settings,
        sms: smsConfig,
      });

      setTestResult(res);
      setLogs(SmsService.getRecentLogs());

      if (res.success) {
        toast.success(`Test SMS delivered via ${res.provider}!`);
      } else {
        toast.error(res.message || 'Test SMS failed');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to dispatch test SMS');
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-950/70 p-5 rounded-3xl border border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-indigo-400" />
            <span>SMS Notification Architecture & Gateway</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure automated transactional SMS for order milestones, cancellations, product removals, and refunds.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
              smsConfig.enabled
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}
          >
            {smsConfig.enabled ? 'SMS Active (ON)' : 'SMS Inactive (OFF)'}
          </span>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Left Column: Configuration Form */}
        <div className="lg:col-span-8 space-y-6">
          <form onSubmit={handleSave} className="bg-slate-950/70 p-6 rounded-3xl border border-slate-800 shadow-xl space-y-6">
            {/* Master Toggle */}
            <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-white">Enable Customer SMS Notifications</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  When enabled, real-time transactional SMS is triggered for customer order updates.
                </p>
              </div>

              <div
                onClick={() => setSmsConfig({ ...smsConfig, enabled: !smsConfig.enabled })}
                className={`w-14 h-7 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                  smsConfig.enabled ? 'bg-indigo-600' : 'bg-slate-800'
                }`}
              >
                <div
                  className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform ${
                    smsConfig.enabled ? 'translate-x-7' : 'translate-x-0'
                  }`}
                />
              </div>
            </div>

            {/* Provider Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                SMS Gateway Provider *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { id: 'fast2sms', name: 'Fast2SMS', desc: 'India Quick Route' },
                  { id: 'twilio', name: 'Twilio', desc: 'Global REST API' },
                  { id: 'msg91', name: 'MSG91', desc: 'Indian Gateway' },
                  { id: 'webhook', name: 'Webhook Relay', desc: 'Custom HTTP Endpoint' },
                ].map((prov) => (
                  <button
                    key={prov.id}
                    type="button"
                    onClick={() => setSmsConfig({ ...smsConfig, provider: prov.id as any })}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      smsConfig.provider === prov.id
                        ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <p className="font-bold text-xs">{prov.name}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{prov.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Provider Credentials */}
            <div className="grid sm:grid-cols-2 gap-4 text-xs">
              <div className="sm:col-span-2">
                <label className="block font-bold uppercase tracking-wider text-slate-300 mb-1">
                  API Key / Authorization Token *
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={smsConfig.apiKey}
                    onChange={(e) => setSmsConfig({ ...smsConfig, apiKey: e.target.value })}
                    placeholder="Enter provider API key or auth token"
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {smsConfig.provider === 'twilio' && (
                <>
                  <div>
                    <label className="block font-bold uppercase tracking-wider text-slate-300 mb-1">
                      Twilio Account SID *
                    </label>
                    <input
                      type="text"
                      value={smsConfig.accountSid || ''}
                      onChange={(e) => setSmsConfig({ ...smsConfig, accountSid: e.target.value })}
                      placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold uppercase tracking-wider text-slate-300 mb-1">
                      Twilio Phone / Sender Number *
                    </label>
                    <input
                      type="text"
                      value={smsConfig.senderId}
                      onChange={(e) => setSmsConfig({ ...smsConfig, senderId: e.target.value })}
                      placeholder="+18005550199"
                      className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </>
              )}

              {smsConfig.provider !== 'twilio' && (
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Sender ID / Header (DLT Approved)
                  </label>
                  <input
                    type="text"
                    value={smsConfig.senderId}
                    onChange={(e) => setSmsConfig({ ...smsConfig, senderId: e.target.value.toUpperCase() })}
                    placeholder="e.g. SWAGRU"
                    maxLength={6}
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono uppercase focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              {smsConfig.provider === 'webhook' && (
                <div className="sm:col-span-2">
                  <label className="block font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Webhook Relay URL *
                  </label>
                  <input
                    type="url"
                    value={smsConfig.apiUrl || ''}
                    onChange={(e) => setSmsConfig({ ...smsConfig, apiUrl: e.target.value })}
                    placeholder="https://your-server.com/api/send-sms"
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}
            </div>

            {/* Notification Event Triggers (Requirement 23) */}
            <div className="pt-2 border-t border-slate-800 space-y-3">
              <div>
                <h4 className="font-bold text-white text-xs uppercase tracking-wider">
                  Automated SMS Event Triggers
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Toggle which operational milestones automatically dispatch an SMS to the customer&apos;s mobile number.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-2.5 text-xs">
                {[
                  { key: 'orderConfirmed', label: 'Order Confirmed' },
                  { key: 'orderDispatched', label: 'Order Dispatched / Shipped' },
                  { key: 'trackingUpdated', label: 'Courier Tracking ID Updated' },
                  { key: 'productRemoved', label: 'Product / Item Removed from Order' },
                  { key: 'partialRefundInitiated', label: 'Partial Refund Initiated' },
                  { key: 'fullOrderCancelled', label: 'Full Order Cancelled' },
                  { key: 'fullRefundInitiated', label: 'Full Refund Initiated' },
                  { key: 'refundCompleted', label: 'Refund Completed' },
                  { key: 'refundFailed', label: 'Refund Failed Notification' },
                ].map(({ key, label }) => {
                  const isChecked = (smsConfig.events as any)[key] ?? true;
                  return (
                    <label
                      key={key}
                      className="flex items-center gap-2.5 p-2.5 bg-slate-900/60 border border-slate-800 rounded-xl cursor-pointer hover:bg-slate-900"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) =>
                          setSmsConfig({
                            ...smsConfig,
                            events: {
                              ...smsConfig.events,
                              [key]: e.target.checked,
                            },
                          })
                        }
                        className="w-4 h-4 rounded text-indigo-600 bg-slate-800 border-slate-700 focus:ring-indigo-500 cursor-pointer"
                      />
                      <span className="text-slate-200 text-xs font-medium">{label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save SMS Configuration</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Test SMS & Activity Logs */}
        <div className="lg:col-span-4 space-y-6">
          {/* Test SMS Card (Requirement 42) */}
          <div className="bg-slate-950/70 p-5 rounded-3xl border border-slate-800 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
                <Send className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-white text-xs uppercase tracking-wider">Test SMS Gateway</h3>
                <p className="text-[10px] text-slate-400">Transmit a test notification safely</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Test Mobile Number</label>
                <input
                  type="text"
                  value={testNumber}
                  onChange={(e) => setTestNumber(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                type="button"
                onClick={handleSendTest}
                disabled={isSendingTest}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isSendingTest ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                ) : (
                  <Send className="w-3.5 h-3.5 text-indigo-400" />
                )}
                <span>{isSendingTest ? 'Transmitting...' : 'Send Test SMS'}</span>
              </button>

              {testResult && (
                <div
                  className={`p-3 rounded-xl border text-[11px] space-y-1 ${
                    testResult.success
                      ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                      : 'bg-red-950/40 border-red-500/30 text-red-300'
                  }`}
                >
                  <p className="font-bold flex items-center gap-1">
                    {testResult.success ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                    <span>{testResult.success ? 'Transmission Succeeded' : 'Transmission Failed'}</span>
                  </p>
                  <p className="text-slate-300">{testResult.message}</p>
                  {testResult.providerMessageId && (
                    <p className="font-mono text-[10px] text-slate-400">Ref: {testResult.providerMessageId}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Activity Log Inspector (Requirement 30) */}
          <div className="bg-slate-950/70 p-5 rounded-3xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-slate-400" />
                <h3 className="font-bold text-white text-xs uppercase tracking-wider">SMS Activity Log</h3>
              </div>
              <button
                type="button"
                onClick={() => setLogs(SmsService.getRecentLogs())}
                className="text-slate-400 hover:text-white p-1"
                title="Refresh Logs"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {logs.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-2">No notifications sent yet</p>
              ) : (
                logs.slice(0, 10).map((log) => (
                  <div
                    key={log.id}
                    className="p-2.5 bg-slate-900 border border-slate-800/80 rounded-xl text-[11px] space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-indigo-400">{log.event}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                          log.status === 'sent'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {log.status}
                      </span>
                    </div>
                    <p className="text-slate-300">
                      To: <strong className="font-mono">{log.recipient}</strong>
                    </p>
                    <p className="text-slate-500 text-[10px]">
                      {new Date(log.created_at).toLocaleTimeString()} • {log.provider}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
