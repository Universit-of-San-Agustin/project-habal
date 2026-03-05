import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ArrowUpRight, ArrowDownLeft, Plus, CreditCard, Clock } from "lucide-react";

const PRIMARY = "#4DC8F0";
const PRIMARY_DARK = "#1a9ecb";
const PRIMARY_BG = "#EBF9FE";
const HABAL_LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a8713560c1bb2be40e7e5e/fe9d5d17d_habal.png";

export default function WalletScreen({ user, bookings }) {
  const [walletAction, setWalletAction] = useState(null); // "topup" | "send" | "receive"
  const [actionAmount, setActionAmount] = useState("");
  const [actionNote, setActionNote] = useState("");
  const [actionProcessing, setActionProcessing] = useState(false);
  const [actionDone, setActionDone] = useState(false);
  const [walletTxns, setWalletTxns] = useState([]);
  const [walletBalance, setWalletBalance] = useState(0);

  useEffect(() => {
    if (!user) return;
    base44.entities.WalletTransaction.filter({ network_id: user.id || user.email }, "-created_date", 30)
      .then(txns => {
        setWalletTxns(txns || []);
        // Calculate balance from transactions
        const bal = (txns || []).reduce((s, t) => {
          if (t.type === "credit" || t.type === "refund") return s + (t.amount || 0);
          return s - (t.amount || 0);
        }, 0);
        setWalletBalance(Math.max(0, bal));
      }).catch(() => {});
  }, [user]);

  const completedBookings = (bookings || []).filter(b => b.status === "completed" && b.fare_estimate);
  const totalSpent = completedBookings.reduce((s, b) => s + (b.fare_estimate || 0), 0);
  const completedRides = completedBookings.length;

  const handleWalletAction = async () => {
    const amt = parseFloat(actionAmount);
    if (!amt || amt <= 0) return;
    setActionProcessing(true);
    const typeMap = { topup: "credit", send: "debit", receive: "credit" };
    const descMap = {
      topup: "Top up via GCash",
      send: "Transfer sent",
      receive: "Transfer received",
    };
    const txType = typeMap[walletAction];
    const newBalance = txType === "credit"
      ? walletBalance + amt
      : Math.max(0, walletBalance - amt);
    const tx = await base44.entities.WalletTransaction.create({
      network_id: user?.id || user?.email,
      network_name: user?.full_name,
      amount: amt,
      type: txType,
      description: actionNote || descMap[walletAction],
      balance_after: newBalance,
      performed_by: user?.email,
    }).catch(() => null);
    if (tx) {
      setWalletTxns(prev => [tx, ...prev]);
      setWalletBalance(newBalance);
    }
    setActionProcessing(false);
    setActionDone(true);
    setTimeout(() => { setActionDone(false); setWalletAction(null); setActionAmount(""); setActionNote(""); }, 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto pb-24">
      {/* Wallet Card */}
      <div className="mx-4 mt-4 rounded-3xl overflow-hidden shadow-lg fade-in"
        style={{ background: `linear-gradient(135deg, ${PRIMARY} 0%, ${PRIMARY_DARK} 100%)` }}>
        <div className="px-6 pt-6 pb-8">
          <div className="flex items-center justify-between mb-6">
            <img src={HABAL_LOGO} alt="Habal" className="w-8 h-8 object-contain opacity-90"
              onError={e => { e.target.style.display = "none"; }} />
            <span className="text-white/70 text-xs font-semibold uppercase tracking-widest">Habal Wallet</span>
          </div>
          <div className="mb-6">
            <div className="text-white/70 text-xs font-medium mb-1">Available Balance</div>
            <div className="text-4xl font-black text-white">₱ 0.00</div>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-white/60 text-xs">{user?.full_name?.toUpperCase() || "CUSTOMER"}</div>
            <div className="flex gap-1">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/40" />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-4 grid grid-cols-3 gap-3 mt-4 mb-5">
        {[
          { id: "topup",   icon: <Plus className="w-5 h-5" />, label: "Top Up",  color: "#10b981" },
          { id: "send",    icon: <ArrowUpRight className="w-5 h-5" />, label: "Send",    color: PRIMARY },
          { id: "receive", icon: <ArrowDownLeft className="w-5 h-5" />, label: "Receive", color: "#8b5cf6" },
        ].map(a => (
          <button key={a.label} onClick={() => setWalletAction(a.id)}
            className="flex flex-col items-center gap-2 bg-white border border-gray-100 rounded-2xl py-4 shadow-sm hover:shadow-md transition-shadow active:scale-95">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: a.color + "15", color: a.color }}>
              {a.icon}
            </div>
            <span className="text-xs font-semibold text-gray-700">{a.label}</span>
          </button>
        ))}
      </div>

      {/* Wallet Action Modal */}
      {walletAction && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="w-full bg-white rounded-t-3xl px-5 pt-5 pb-10 max-w-md mx-auto">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
            {actionDone ? (
              <div className="flex flex-col items-center py-8">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: PRIMARY_BG }}>
                  <span className="text-3xl">✅</span>
                </div>
                <p className="font-bold text-gray-900">Done!</p>
                <p className="text-sm text-gray-400 mt-1">Transaction recorded successfully.</p>
              </div>
            ) : (
              <>
                <div className="font-bold text-gray-900 text-lg mb-1 capitalize">{walletAction === "topup" ? "Top Up Wallet" : walletAction === "send" ? "Send Money" : "Receive Money"}</div>
                <div className="text-xs text-gray-400 mb-5">{walletAction === "topup" ? "Add funds to your Habal Wallet via GCash or bank transfer." : walletAction === "send" ? "Transfer funds to another Habal user." : "Receive funds from another user."}</div>
                <div className="space-y-3 mb-5">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Amount (₱)</label>
                    <input type="number" value={actionAmount} onChange={e => setActionAmount(e.target.value)}
                      placeholder="0.00" min="1"
                      className="w-full px-4 py-3.5 rounded-2xl text-gray-800 text-lg font-bold focus:outline-none transition-all"
                      style={{ background: "#f8fbfd", border: `1.5px solid ${PRIMARY}40` }}
                      onFocus={e => { e.target.style.borderColor = PRIMARY; }}
                      onBlur={e => { e.target.style.borderColor = `${PRIMARY}40`; }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Note (optional)</label>
                    <input value={actionNote} onChange={e => setActionNote(e.target.value)}
                      placeholder="Add a note..."
                      className="w-full px-4 py-3.5 rounded-2xl text-gray-800 text-sm focus:outline-none"
                      style={{ background: "#f8fbfd", border: "1.5px solid #e2ecf2" }}
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => { setWalletAction(null); setActionAmount(""); setActionNote(""); }}
                    className="flex-1 py-3.5 border-2 border-gray-200 rounded-2xl font-bold text-gray-600 text-sm">Cancel</button>
                  <button onClick={handleWalletAction} disabled={actionProcessing || !actionAmount}
                    className="flex-1 py-3.5 rounded-2xl font-bold text-white text-sm disabled:opacity-50 flex items-center justify-center"
                    style={{ background: `linear-gradient(135deg, ${PRIMARY} 0%, ${PRIMARY_DARK} 100%)` }}>
                    {actionProcessing
                      ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : "Confirm"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="px-4 mb-5 grid grid-cols-2 gap-3">
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
          <div className="text-xs text-gray-400 mb-1">Total Spent</div>
          <div className="text-2xl font-black" style={{ color: PRIMARY_DARK }}>₱{totalSpent.toLocaleString()}</div>
          <div className="text-[10px] text-gray-400 mt-0.5">All time</div>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
          <div className="text-xs text-gray-400 mb-1">Rides Paid</div>
          <div className="text-2xl font-black text-gray-900">{completedRides}</div>
          <div className="text-[10px] text-gray-400 mt-0.5">Completed trips</div>
        </div>
      </div>

      {/* Transactions */}
      <div className="px-4">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Recent Transactions</div>
        {completedBookings.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-gray-300">
            <CreditCard className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm text-gray-400">No transactions yet</p>
            <p className="text-xs text-gray-300 mt-1">Complete a ride to see your history</p>
          </div>
        ) : completedBookings.slice(0, 15).map(b => (
          <div key={b.id} className="flex items-center gap-3 bg-white border border-gray-100 rounded-2xl px-4 py-3 mb-2 shadow-sm">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: "#fef3c7" }}>🏍</div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-800 text-sm truncate">
                Ride to {b.dropoff_address?.split(",")[0]}
              </div>
              <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {b.created_date ? new Date(b.created_date).toLocaleDateString("en-PH", { month: "short", day: "numeric" }) : "—"}
                <span className="ml-1 capitalize">{b.payment_method || "cash"}</span>
              </div>
            </div>
            <div className="font-black text-gray-900 text-sm flex-shrink-0">-₱{b.fare_estimate}</div>
          </div>
        ))}
      </div>
    </div>
  );
}