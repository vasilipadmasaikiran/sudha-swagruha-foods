// ============================================================
// Admin Console - Shipping & Delivery Management Tab
// Requirements: 1.2, 1.3, 1.5, 5.1, 5.2
// Fully configurable shipping rules, zones, weight tiers, thresholds,
// COD charges, provider integration, and live simulation engine.
// ============================================================
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Truck,
  ShieldCheck,
  Zap,
  MapPin,
  Scale,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Calculator,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useSettingsStore } from '@/hooks/useSettingsStore';
import {
  calculateShipping,
  defaultShippingSettings,
  type ShippingSettings,
  type DeliveryZone,
} from '@/services/shippingService';
import toast from 'react-hot-toast';

export default function AdminShippingTab() {
  const { settings, updateShippingSettings, resetSettings } = useSettingsStore();
  const currentShipping = settings.shipping;

  // Local state for atomic edits
  const [shippingConfig, setShippingConfig] = useState<ShippingSettings>({
    ...currentShipping,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Simulation test state
  const [simSubtotal, setSimSubtotal] = useState(850);
  const [simWeight, setSimWeight] = useState(500);
  const [simPincode, setSimPincode] = useState('500081');
  const [simIsExpress, setSimIsExpress] = useState(false);
  const [simIsCod, setSimIsCod] = useState(false);

  // Run live calculation simulator using current in-editor config
  const simResult = calculateShipping({
    subtotal: Number(simSubtotal) || 0,
    totalWeightGrams: Number(simWeight) || 0,
    deliveryAddress: { pincode: simPincode },
    deliveryMethod: simIsExpress ? 'express' : 'standard',
    paymentMethod: simIsCod ? 'cod' : 'online',
    settings: shippingConfig,
  });

  // Handle Save with loading & deduplication protection
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    setIsSaving(true);
    setSaveSuccess(false);

    try {
      await updateShippingSettings(shippingConfig);
      setSaveSuccess(true);
      toast.success('Shipping & Delivery settings saved and synced across site!');
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save shipping settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToDefaults = () => {
    if (window.confirm('Reset shipping settings to standard defaults (₹60 flat, free above ₹499)?')) {
      const defaultShipping: ShippingSettings = {
        ...defaultShippingSettings,
        enabled: true,
        defaultCharge: 60,
        defaultShippingCharge: 60,
        freeShippingThreshold: 499,
        minOrderValueForFreeShipping: 499,
        enableFreeShippingThreshold: true,
        calculationMethod: 'threshold',
        enableExpressDelivery: false,
        expressShippingCharge: 120,
        enableCodExtraCharge: false,
        codAdditionalCharge: 30,
        zones: [
          {
            id: 'zone-local',
            name: 'Local (AP & Telangana)',
            charge: 50,
            freeThreshold: 499,
            freeShippingThreshold: 499,
            states: ['Andhra Pradesh', 'Telangana'],
            pincodePrefixes: ['50', '51', '52', '53'],
            pincodes: ['500*', '520*', '521*', '522*', '530*'],
          },
          {
            id: 'zone-national',
            name: 'Rest of India',
            charge: 80,
            freeThreshold: 999,
            freeShippingThreshold: 999,
            states: [],
            pincodePrefixes: [],
            pincodes: ['*'],
          },
        ],
        weightRules: [
          { maxWeightGrams: 500, additionalCharge: 0 },
          { maxWeightGrams: 1000, additionalCharge: 20 },
          { maxWeightGrams: 2000, additionalCharge: 50 },
        ],
        futureProviders: {
          activeProvider: 'manual',
          delhiveryApiKey: '',
          shiprocketApiKey: '',
          mode: 'sandbox',
        },
      };
      setShippingConfig(defaultShipping as any);
      updateShippingSettings(defaultShipping as any);
      toast.success('Reset to standard shipping defaults');
    }
  };

  // Zone handlers
  const handleAddZone = () => {
    const newZone: DeliveryZone = {
      id: `zone-${Date.now()}`,
      name: 'New Delivery Zone',
      charge: 60,
      freeThreshold: 699,
      freeShippingThreshold: 699,
      states: [],
      pincodePrefixes: [],
      pincodes: ['*'],
    };
    setShippingConfig({
      ...shippingConfig,
      zones: [...shippingConfig.zones, newZone],
    });
  };

  const handleRemoveZone = (id: string) => {
    setShippingConfig({
      ...shippingConfig,
      zones: shippingConfig.zones.filter((z) => z.id !== id),
    });
  };

  const handleUpdateZone = (id: string, updates: Partial<DeliveryZone>) => {
    setShippingConfig({
      ...shippingConfig,
      zones: shippingConfig.zones.map((z) => (z.id === id ? { ...z, ...updates } : z)),
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl backdrop-blur-md">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Truck className="w-6 h-6 text-amber-400" />
            <span>Shipping & Delivery Configuration</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Centrally manage delivery fees, free shipping thresholds, express rates, zones, and provider rules.
            All checkout and cart calculations derive from here.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetToDefaults}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold hover:bg-slate-700 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Defaults</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-xs shadow-lg transition-all ${
              saveSuccess
                ? 'bg-emerald-600 text-white'
                : isSaving
                ? 'bg-amber-600/70 text-amber-100 cursor-not-allowed'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950 active:scale-95'
            }`}
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : saveSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span>Saved successfully</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Configuration Forms */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Master Switch & Thresholds */}
          <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 shadow-md space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Core Rules & Thresholds</h3>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-xs text-slate-400 font-medium">
                  {shippingConfig.enabled ? 'Shipping Active' : 'All Free Shipping'}
                </span>
                <input
                  type="checkbox"
                  checked={shippingConfig.enabled}
                  onChange={(e) => setShippingConfig({ ...shippingConfig, enabled: e.target.checked })}
                  className="w-4 h-4 text-amber-500 rounded border-slate-700 bg-slate-800 focus:ring-amber-400"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Default Standard Shipping Fee (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={shippingConfig.defaultShippingCharge}
                  onChange={(e) =>
                    setShippingConfig({
                      ...shippingConfig,
                      defaultShippingCharge: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-amber-400"
                />
                <p className="text-[11px] text-slate-500 mt-1">Charged on orders below the free shipping threshold.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Free Shipping Minimum Cart Value (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={shippingConfig.freeShippingThreshold}
                  onChange={(e) =>
                    setShippingConfig({
                      ...shippingConfig,
                      freeShippingThreshold: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-amber-400"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Orders equal to or above this value get automatic 100% Free Shipping.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={shippingConfig.enableFreeShippingThreshold}
                  onChange={(e) =>
                    setShippingConfig({
                      ...shippingConfig,
                      enableFreeShippingThreshold: e.target.checked,
                    })
                  }
                  className="w-4 h-4 text-amber-500 rounded border-slate-700 bg-slate-800 focus:ring-amber-400"
                />
                <span className="text-xs text-slate-300 font-medium">
                  Enable Free Delivery threshold promotion banner & progress bar in cart
                </span>
              </label>
            </div>
          </div>

          {/* Express & COD Delivery Rules */}
          <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 shadow-md space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
              <Zap className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Express & COD Surcharges</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Express Delivery</span>
                  <input
                    type="checkbox"
                    checked={shippingConfig.enableExpressDelivery}
                    onChange={(e) =>
                      setShippingConfig({
                        ...shippingConfig,
                        enableExpressDelivery: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-amber-500 rounded border-slate-700 bg-slate-800 focus:ring-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Express Surcharge / Total (₹)</label>
                  <input
                    type="number"
                    min="0"
                    disabled={!shippingConfig.enableExpressDelivery}
                    value={shippingConfig.expressShippingCharge}
                    onChange={(e) =>
                      setShippingConfig({
                        ...shippingConfig,
                        expressShippingCharge: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Cash on Delivery (COD) Fee</span>
                  <input
                    type="checkbox"
                    checked={shippingConfig.enableCodExtraCharge}
                    onChange={(e) =>
                      setShippingConfig({
                        ...shippingConfig,
                        enableCodExtraCharge: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-amber-500 rounded border-slate-700 bg-slate-800 focus:ring-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Additional COD Handling (₹)</label>
                  <input
                    type="number"
                    min="0"
                    disabled={!shippingConfig.enableCodExtraCharge}
                    value={shippingConfig.codAdditionalCharge}
                    onChange={(e) =>
                      setShippingConfig({
                        ...shippingConfig,
                        codAdditionalCharge: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs disabled:opacity-50"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Delivery Zones */}
          <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 shadow-md space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-sky-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">PIN & Regional Zones</h3>
              </div>
              <button
                type="button"
                onClick={handleAddZone}
                className="flex items-center gap-1.5 px-3 py-1 bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 text-xs font-semibold rounded-lg border border-sky-500/30 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Zone</span>
              </button>
            </div>

            <div className="space-y-3">
              {shippingConfig.zones.map((zone) => (
                <div
                  key={zone.id}
                  className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-3 items-center"
                >
                  <div className="sm:col-span-1">
                    <label className="block text-[10px] text-slate-400 font-semibold mb-0.5">Zone Name</label>
                    <input
                      type="text"
                      value={zone.name}
                      onChange={(e) => handleUpdateZone(zone.id, { name: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 font-semibold mb-0.5">Charge (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={zone.charge}
                      onChange={(e) => handleUpdateZone(zone.id, { charge: Number(e.target.value) || 0 })}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 font-semibold mb-0.5">Free Above (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={zone.freeThreshold ?? zone.freeShippingThreshold ?? 0}
                      onChange={(e) => {
                        const val = Number(e.target.value) || 0;
                        handleUpdateZone(zone.id, { freeThreshold: val, freeShippingThreshold: val });
                      }}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1">
                      <label className="block text-[10px] text-slate-400 font-semibold mb-0.5">PIN Prefixes</label>
                      <input
                        type="text"
                        placeholder="500*, 520*"
                        value={(zone.pincodes || zone.pincodePrefixes || []).join(', ')}
                        onChange={(e) => {
                          const prefixes = e.target.value.split(',').map((s) => s.trim()).filter(Boolean);
                          handleUpdateZone(zone.id, {
                            pincodes: prefixes,
                            pincodePrefixes: prefixes,
                          });
                        }}
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs"
                      />
                    </div>
                    {shippingConfig.zones.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveZone(zone.id)}
                        className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition mt-4"
                        title="Delete Zone"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: Live Shipping Calculator Simulator */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-5 rounded-2xl border border-amber-500/30 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
              <Calculator className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <span>Live Simulator</span>
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                </h3>
                <p className="text-[11px] text-slate-400">Test how your rules calculate in real-time</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1">Test Order Subtotal (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={simSubtotal}
                  onChange={(e) => setSimSubtotal(Number(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">Delivery PIN Code</label>
                <input
                  type="text"
                  value={simPincode}
                  onChange={(e) => setSimPincode(e.target.value)}
                  placeholder="500081"
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-950/60 border border-slate-800 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={simIsExpress}
                    onChange={(e) => setSimIsExpress(e.target.checked)}
                    className="w-3.5 h-3.5 text-amber-500 rounded border-slate-700"
                  />
                  <span>Express</span>
                </label>
                <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-950/60 border border-slate-800 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={simIsCod}
                    onChange={(e) => setSimIsCod(e.target.checked)}
                    className="w-3.5 h-3.5 text-amber-500 rounded border-slate-700"
                  />
                  <span>Cash on Delivery</span>
                </label>
              </div>
            </div>

            {/* Calculation Output Box */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-slate-400 font-medium">Calculated Charge:</span>
                <span
                  className={`text-xl font-extrabold ${
                    simResult.isFreeShipping ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {simResult.isFreeShipping ? 'FREE (₹0)' : `₹${simResult.shippingCharge}`}
                </span>
              </div>

              <div className="text-[11px] text-slate-400 space-y-1 pt-2 border-t border-slate-800">
                <div className="flex justify-between">
                  <span>Applied Rule:</span>
                  <span className="text-white font-medium capitalize">{simResult.ruleApplied.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Zone:</span>
                  <span className="text-white font-medium">{simResult.zoneApplied || 'Pan-India'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Base Charge:</span>
                  <span className="text-slate-300">₹{simResult.breakdown?.baseCharge ?? simResult.shippingCharge}</span>
                </div>
                {(simResult.breakdown?.expressCharge || 0) > 0 && (
                  <div className="flex justify-between text-amber-300">
                    <span>Express Surcharge:</span>
                    <span>+₹{simResult.breakdown.expressCharge}</span>
                  </div>
                )}
                {(simResult.breakdown?.codCharge || 0) > 0 && (
                  <div className="flex justify-between text-amber-300">
                    <span>COD Fee:</span>
                    <span>+₹{simResult.breakdown.codCharge}</span>
                  </div>
                )}
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900 text-[11px] text-slate-300 border border-slate-800 flex items-start gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span>{simResult.ruleApplied}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
