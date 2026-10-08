// ============================================================
// Customer Authentication & Account Management Modal
// Requirements: 4.1, 4.2, 4.3 (Mobile OTP, Google Sign-in,
// Profile, Saved Addresses, Order History & Direct Tracking)
// ============================================================
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Smartphone,
  ShieldCheck,
  User,
  MapPin,
  Package,
  LogOut,
  ArrowRight,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { useCustomerAuthStore, type CustomerAddress } from '@/hooks/useCustomerAuthStore';
import { useSettingsStore } from '@/hooks/useSettingsStore';
import { useOrderStore } from '@/hooks/useOrderStore';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function CustomerAuthModal() {
  const {
    customer,
    isAuthenticated,
    isModalOpen,
    modalView,
    activePhone,
    resendCooldown,
    closeAuthModal,
    sendOtp,
    verifyOtp,
    loginWithGoogle,
    updateProfile,
    addAddress,
    removeAddress,
    setDefaultAddress,
    logout,
  } = useCustomerAuthStore();

  const { settings } = useSettingsStore();
  const authConfig = settings.customerAuth;
  const { orders } = useOrderStore();

  // Local Form States
  const [phoneNumber, setPhoneNumber] = useState(activePhone || '');
  const [otpCode, setOtpCode] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [testCodeHint, setTestCodeHint] = useState<string | null>(null);

  // Profile Edit State
  const [editName, setEditName] = useState(customer?.name || '');
  const [editEmail, setEditEmail] = useState(customer?.email || '');

  // Add Address State
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [newAddr, setNewAddr] = useState<Omit<CustomerAddress, 'id'>>({
    house_no: '',
    street: '',
    area: '',
    city: 'Hyderabad',
    district: '',
    state: 'Telangana',
    pincode: '',
    isDefault: false,
  });

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  useEffect(() => {
    if (customer) {
      setEditName(customer.name);
      setEditEmail(customer.email || '');
    }
  }, [customer]);

  if (!isModalOpen) return null;

  // Filter orders belonging to this customer
  const customerOrders = customer
    ? orders.filter(
        (o) =>
          o.customer_mobile === customer.phone ||
          o.customer_whatsapp === customer.phone ||
          (customer.email && o.customer_email?.toLowerCase() === customer.email.toLowerCase())
      )
    : [];

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSendingOtp || cooldown > 0) return;

    setIsSendingOtp(true);
    setTestCodeHint(null);
    try {
      const res = await sendOtp(phoneNumber);
      if (res.success) {
        toast.success(`OTP sent to +91 ${phoneNumber}`);
        setCooldown(res.cooldownSeconds || 30);
        if (res.testCode) {
          setTestCodeHint(res.testCode);
        }
      } else {
        toast.error(res.error || 'Failed to send OTP');
      }
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isVerifyingOtp) return;

    setIsVerifyingOtp(true);
    try {
      const res = await verifyOtp(phoneNumber, otpCode);
      if (res.success) {
        setOtpCode('');
      } else {
        toast.error(res.error || 'Verification failed');
      }
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({ name: editName.trim(), email: editEmail.trim() });
  };

  const handleCreateAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddr.house_no || !newAddr.city || !newAddr.pincode) {
      toast.error('Please fill house number, city, and pincode');
      return;
    }
    addAddress(newAddr);
    setShowAddAddress(false);
    setNewAddr({
      house_no: '',
      street: '',
      area: '',
      city: 'Hyderabad',
      district: '',
      state: 'Telangana',
      pincode: '',
      isDefault: false,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full text-slate-100 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              {isAuthenticated ? <User className="w-5 h-5" /> : <Smartphone className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-white text-base">
                {isAuthenticated ? 'My Account & Orders' : 'Sign in to Sudha Swagruha'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {isAuthenticated
                  ? `Logged in as +91 ${customer?.phone}`
                  : 'Fast, secure checkout & live order tracking'}
              </p>
            </div>
          </div>
          <button
            onClick={closeAuthModal}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* VIEW 1: Phone Input (Unauthenticated) */}
          {!isAuthenticated && modalView === 'login' && (
            <div className="space-y-5">
              {authConfig.mobileOtpEnabled && (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                      Mobile Number
                    </label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3.5 bg-slate-800 border border-r-0 border-slate-700 rounded-l-xl text-slate-400 text-sm font-semibold">
                        +91
                      </span>
                      <input
                        type="tel"
                        maxLength={10}
                        required
                        placeholder="Enter 10-digit mobile"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                        className="flex-1 px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-r-xl text-white text-sm font-mono focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSendingOtp || phoneNumber.length !== 10}
                    className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSendingOtp ? (
                      <>
                        <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                        <span>Sending OTP...</span>
                      </>
                    ) : (
                      <>
                        <span>Get Verification Code</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Google OAuth Option */}
              {authConfig.googleLoginEnabled && (
                <div className="space-y-3 pt-2">
                  <div className="relative flex py-1 items-center">
                    <div className="flex-grow border-t border-slate-800" />
                    <span className="flex-shrink mx-4 text-slate-500 text-[11px] uppercase font-bold">
                      Or Continue With
                    </span>
                    <div className="flex-grow border-t border-slate-800" />
                  </div>

                  <button
                    type="button"
                    onClick={loginWithGoogle}
                    className="w-full py-2.5 bg-slate-800 hover:bg-slate-750 text-white font-semibold text-xs rounded-xl border border-slate-700 transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Continue with Google</span>
                  </button>
                </div>
              )}

              {/* Guest Checkout Notice */}
              {authConfig.allowGuestCheckout && (
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-center">
                  <p className="text-[11px] text-slate-400">
                    Prefer not to sign in? You can still place orders via{' '}
                    <strong className="text-emerald-400">Guest Checkout</strong> at any time.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* VIEW 2: OTP Verification Input */}
          {!isAuthenticated && modalView === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    6-Digit Verification Code
                  </label>
                  <button
                    type="button"
                    onClick={() => useCustomerAuthStore.setState({ modalView: 'login' })}
                    className="text-[11px] text-amber-400 hover:underline"
                  >
                    Change Number
                  </button>
                </div>
                <input
                  type="text"
                  maxLength={6}
                  required
                  placeholder="Enter 6-digit OTP"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-center tracking-[0.5em] text-lg font-bold focus:outline-none focus:border-amber-400"
                />
              </div>

              {testCodeHint && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between">
                  <span>Demo Sandbox Code:</span>
                  <span className="font-mono font-bold text-sm tracking-wider">{testCodeHint}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isVerifyingOtp || otpCode.length < 4}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isVerifyingOtp ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm & Sign In</span>
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                {cooldown > 0 ? (
                  <p className="text-xs text-slate-400 flex items-center justify-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Resend code in {cooldown}s</span>
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    className="text-xs text-amber-400 hover:underline font-semibold"
                  >
                    Didn&apos;t receive code? Resend OTP
                  </button>
                )}
              </div>
            </form>
          )}

          {/* VIEW 3: Logged In Customer Profile & Orders */}
          {isAuthenticated && customer && (
            <div className="space-y-6">
              {/* Profile Details */}
              <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-amber-400" />
                    <span>Profile Info</span>
                  </span>
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    Verified Mobile
                  </span>
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="text-slate-400 block mb-1">Full Name</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">Email Address</label>
                      <input
                        type="email"
                        placeholder="email@example.com"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-semibold rounded-lg transition"
                  >
                    Save Changes
                  </button>
                </form>
              </div>

              {/* Saved Delivery Addresses */}
              <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-sky-400" />
                    <span>Saved Addresses ({customer.savedAddresses?.length || 0})</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAddAddress(!showAddAddress)}
                    className="text-[11px] text-amber-400 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add New</span>
                  </button>
                </div>

                {showAddAddress && (
                  <form onSubmit={handleCreateAddress} className="p-3 bg-slate-900 rounded-xl space-y-2 text-xs">
                    <input
                      type="text"
                      placeholder="House / Flat / Plot No"
                      required
                      value={newAddr.house_no}
                      onChange={(e) => setNewAddr({ ...newAddr, house_no: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white"
                    />
                    <input
                      type="text"
                      placeholder="Street / Colony / Landmark"
                      value={newAddr.street}
                      onChange={(e) => setNewAddr({ ...newAddr, street: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="City"
                        required
                        value={newAddr.city}
                        onChange={(e) => setNewAddr({ ...newAddr, city: e.target.value })}
                        className="px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white"
                      />
                      <input
                        type="text"
                        placeholder="PIN Code"
                        required
                        maxLength={6}
                        value={newAddr.pincode}
                        onChange={(e) => setNewAddr({ ...newAddr, pincode: e.target.value })}
                        className="px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono"
                      />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        type="submit"
                        className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs"
                      >
                        Save Address
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddAddress(false)}
                        className="px-3 py-1 bg-slate-800 text-slate-300 rounded-lg text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                <div className="space-y-2">
                  {customer.savedAddresses?.map((addr) => (
                    <div
                      key={addr.id}
                      className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 flex items-start justify-between text-xs"
                    >
                      <div>
                        <p className="text-white font-medium">
                          {addr.house_no}, {addr.street && `${addr.street}, `}
                          {addr.area && `${addr.area}, `}
                          {addr.city} – <span className="font-mono font-bold">{addr.pincode}</span>
                        </p>
                        {addr.isDefault && (
                          <span className="text-[10px] text-emerald-400 font-bold uppercase mt-1 inline-block">
                            Default Address
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {!addr.isDefault && (
                          <button
                            type="button"
                            onClick={() => setDefaultAddress(addr.id)}
                            className="text-[10px] text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800"
                          >
                            Set Default
                          </button>
                        )}
                        {customer.savedAddresses.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeAddress(addr.id)}
                            className="p-1 text-rose-400 hover:text-rose-300"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order History & Live Tracking */}
              <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-emerald-400" />
                    <span>My Past Orders ({customerOrders.length})</span>
                  </span>
                </div>

                {customerOrders.length === 0 ? (
                  <p className="text-center py-4 text-slate-500 text-xs">
                    No past orders found for +91 {customer.phone}.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {customerOrders.map((ord) => (
                      <div
                        key={ord.id}
                        className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-mono font-bold text-white">{ord.order_number}</span>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            ₹{ord.total} •{' '}
                            <span className="capitalize text-amber-400 font-semibold">{ord.order_status}</span>
                          </p>
                        </div>
                        <Link
                          to={`/track-order?order=${ord.order_number}`}
                          onClick={closeAuthModal}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 text-xs font-semibold border border-emerald-500/30 flex items-center gap-1 transition"
                        >
                          <span>Track</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Logout Action */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={logout}
                  className="w-full py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out of Account</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
