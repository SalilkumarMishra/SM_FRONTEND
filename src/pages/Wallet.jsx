import { useAuth } from "../context/AuthContext";
import { useCallback, useState, useEffect } from "react";
import {
  transactionsAPI,
  cancelWithdrawalAPI,
} from "../services/api";
import Layout from "../components/Layout";
import { Card } from "../components/Card";
import MinimalModal from "../components/MinimalModal";
import "../assets/css/dashboard.css";

/* ────────────────────────────────────────
   Wallet Page
   ──────────────────────────────────────── */
const Wallet = () => {
  const { user } = useAuth();
  const [walletBalance, setWalletBalance] = useState(5000);
  const [transactions, setTransactions] = useState([]);
  const [showAddMoneyModal, setShowAddMoneyModal] = useState(false);
  const [addAmount, setAddAmount] = useState("");
  const [addError, setAddError] = useState("");

  const [cancelLoading, setCancelLoading] = useState(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [infoAnchor, setInfoAnchor] = useState(null);

  const loadWalletData = useCallback(async () => {
    if (!user) return;
    const userId = user.id || user._id;
    const savedBalance = localStorage.getItem(`user_${userId}_walletBalance`);
    setWalletBalance(savedBalance ? JSON.parse(savedBalance) : 5000);

    try {
      const txRes = await transactionsAPI.getAll();
      if (txRes.data?.success) {
        setTransactions(txRes.data.data.transactions || []);
      }
    } catch (err) {
      console.error("Failed to fetch wallet/dashboard data:", err);
    }
  }, [user]);

  useEffect(() => {
    loadWalletData();

    // Listen for storage changes (e.g. from Layout top-up)
    window.addEventListener("storage", loadWalletData);
    return () => window.removeEventListener("storage", loadWalletData);
  }, [loadWalletData]);

  const handleAddMoney = async () => {
    const amount = parseFloat(addAmount);
    if (!amount || amount <= 0) {
      setAddError("Please enter a valid amount");
      return;
    }

    if (!user) return;
    const userId = user.id || user._id;

    try {
      // Create transaction on backend
      const res = await transactionsAPI.create({
        type: "income",
        amount,
        description: "Wallet Top-up",
        category: "salary",
        date: new Date(),
      });

      if (res.data?.success) {
        const newBalance = walletBalance + amount;
        setWalletBalance(newBalance);
        localStorage.setItem(
          `user_${userId}_walletBalance`,
          JSON.stringify(newBalance),
        );

        // Refresh transactions list
        await loadWalletData();

        // Notify other components
        window.dispatchEvent(new Event("storage"));

        setShowAddMoneyModal(false);
        setAddAmount("");
        setAddError("");
      }
    } catch (err) {
      setAddError(
        err.response?.data?.message || "Failed to add money. Try again.",
      );
    }
  };

  const handleCancelWithdrawal = async (goal, transactionId) => {
    // Extract goal ID if goal is an object
    const goalId = goal?._id || goal;
    if (!goalId) {
      alert("Goal ID not found for this withdrawal.");
      return;
    }
    setCancelLoading(transactionId);
    try {
      await cancelWithdrawalAPI(goalId, transactionId);
      await loadWalletData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to cancel withdrawal.");
    } finally {
      setCancelLoading(null);
    }
  };

  const groupTransactionsByDate = () => {
    const grouped = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    transactions.forEach((tx) => {
      const txDate = new Date(tx.date);
      txDate.setHours(0, 0, 0, 0);

      let label = "Older";
      if (txDate.getTime() === today.getTime()) label = "Today";
      else if (txDate.getTime() === yesterday.getTime()) label = "Yesterday";

      if (!grouped[label]) grouped[label] = [];
      grouped[label].push(tx);
    });

    return grouped;
  };

  const getIconClass = (type) =>
    type === "income"
      ? "transaction-icon--deposit"
      : "transaction-icon--withdrawal";

  const groupedTransactions = groupTransactionsByDate();
  const totalDeposited = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalWithdrawn = transactions
    .filter((t) => t.type === "expense" && t.status !== "cancelled")
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <Layout title="Wallet" subtitle="FUNDS" balance={walletBalance}>
      <div className="wallet-content fade-up">
        {/* ── Quick Stats Grid ── */}
        <div
          className="grid grid-cols-2 mb-lg"
          style={{ gap: "var(--sp-6)", marginBottom: "var(--sp-8)" }}
        >
          <div className="db-stat-card">
            <p className="db-stat-card__label">Total Deposited</p>
            <p
              className="db-stat-card__value text-success"
              style={{ color: "var(--accent-teal)" }}
            >
              + ₹{totalDeposited.toFixed(2)}
            </p>
          </div>
          <div className="db-stat-card">
            <p className="db-stat-card__label">Total Withdrawals</p>
            <p className="db-stat-card__value" style={{ color: "#f87171" }}>
              − ₹{totalWithdrawn.toFixed(2)}
            </p>
          </div>
        </div>

        {/* ── Transaction History ── */}
        <div className="db-section" style={{ padding: "0" }}>
          <div className="db-section__header">
            <div>
              <h2 className="db-section__title">Transaction History</h2>
              <p className="db-section__sub">Recent activity in your wallet</p>
            </div>
            <button
              onClick={() => setShowAddMoneyModal(true)}
              className="btn btn-primary"
            >
              ＋ Add Money
            </button>
          </div>

          {Object.keys(groupedTransactions).length === 0 ? (
            <div className="db-empty-state">
              <div className="db-empty-state__icon">
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <rect x="2" y="5" width="20" height="14" rx="2" />
                  <line x1="2" y1="10" x2="22" y2="10" />
                </svg>
              </div>
              <h3>No transactions yet</h3>
              <p>Your wallet transactions will appear here.</p>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--sp-8)",
              }}
            >
              {["Today", "Yesterday", "Older"].map((dateGroup) =>
                groupedTransactions[dateGroup]?.length > 0 ? (
                  <div key={dateGroup}>
                    <p
                      className="db-stat-card__label"
                      style={{
                        marginBottom: "var(--sp-3)",
                        paddingLeft: "var(--sp-2)",
                      }}
                    >
                      {dateGroup}
                    </p>
                    <div className="db-stat-card" style={{ padding: "0" }}>
                      <div className="transaction-list">
                        {groupedTransactions[dateGroup].map((tx, idx) => (
                          <div
                            key={tx._id}
                            className="transaction-item"
                            style={{
                              padding: "var(--sp-4) var(--sp-6)",
                              borderBottom:
                                idx ===
                                groupedTransactions[dateGroup].length - 1
                                  ? "none"
                                  : "var(--border-subtle)",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "var(--sp-4)",
                              }}
                            >
                              <div
                                className={`transaction-icon ${getIconClass(tx.type)}`}
                                style={{
                                  width: "32px",
                                  height: "32px",
                                  borderRadius: "50%",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  background:
                                    tx.type === "income"
                                      ? "rgba(20, 241, 149, 0.1)"
                                      : "rgba(239, 68, 68, 0.1)",
                                  color:
                                    tx.type === "income"
                                      ? "var(--accent-teal)"
                                      : "#f87171",
                                }}
                              >
                                {tx.type === "income" ? (
                                  <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                  >
                                    <path d="M12 5v14M19 12l-7 7-7-7" />
                                  </svg>
                                ) : (
                                  <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                  >
                                    <path d="M12 19V5M5 12l7-7 7 7" />
                                  </svg>
                                )}
                              </div>
                              <div>
                                <p
                                  style={{
                                    fontSize: "var(--text-base)",
                                    fontWeight: "600",
                                    color: "var(--text-primary)",
                                    margin: "0",
                                  }}
                                >
                                  {tx.description}
                                </p>
                                <p
                                  style={{
                                    fontSize: "var(--text-xs)",
                                    color: "var(--text-secondary)",
                                    margin: "0",
                                  }}
                                >
                                  {new Date(tx.date).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </p>
                              </div>
                            </div>
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "flex-end",
                                gap: "var(--sp-2)",
                              }}
                            >
                              <div
                                style={{
                                  fontSize: "var(--text-base)",
                                  fontWeight: "700",
                                  color:
                                    tx.type === "income"
                                      ? "var(--accent-teal)"
                                      : "#f87171",
                                }}
                              >
                                {tx.type === "income" ? "+ " : "− "}₹
                                {tx.amount.toFixed(2)}
                              </div>
                              {tx.status === "pending" && (
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (infoOpen && infoAnchor === e.currentTarget) {
                                        setInfoOpen(false);
                                        setInfoAnchor(null);
                                      } else {
                                        setInfoAnchor(e.currentTarget);
                                        setInfoOpen(true);
                                      }
                                    }}
                                    style={{
                                      background: "rgba(255,255,255,0.1)",
                                      border: "none",
                                      borderRadius: "50%",
                                      width: "20px",
                                      height: "20px",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      color: "var(--text-secondary)",
                                      cursor: "pointer",
                                      fontSize: "10px",
                                      fontWeight: 'bold'
                                    }}
                                  >
                                    i
                                  </button>
                                  <button
                                    className="btn-ghost"
                                    onClick={() => handleCancelWithdrawal(tx.goal, tx._id)}
                                    disabled={cancelLoading === tx._id}
                                    style={{
                                      fontSize: "var(--text-xs)",
                                      padding: "4px 8px",
                                      height: "auto",
                                      color: "var(--accent-red)",
                                    }}
                                  >
                                    {cancelLoading === tx._id ? "..." : "Cancel"}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null,
              )}
            </div>
          )}
        </div>

      </div>

      {/* ── Add Money Modal ── */}
      {showAddMoneyModal && (
        <div className="modal-overlay">
          <Card className="modal-content card--premium">
            <div className="modal-header">
              <h2 className="modal-title">Add Money</h2>
              <button
                className="modal-close"
                onClick={() => setShowAddMoneyModal(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Amount (₹)</label>
                <input
                  type="number"
                  value={addAmount}
                  onChange={(e) => {
                    setAddAmount(e.target.value);
                    setAddError("");
                  }}
                  placeholder="0.00"
                  className="form-input"
                  autoFocus
                />
                {addError && (
                  <p
                    className="form-error"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    {addError}
                  </p>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button
                onClick={handleAddMoney}
                className="btn btn-success"
                style={{ flex: 1 }}
              >
                Add Money
              </button>
              <button
                onClick={() => setShowAddMoneyModal(false)}
                className="btn btn-ghost"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
            </div>
          </Card>
        </div>
      )}
      
      {infoOpen && (
        <MinimalModal anchor={infoAnchor} onClose={() => setInfoOpen(false)}>
          Your withdrawal request is being processed. The funds will be
          automatically credited to your wallet balance after 48 hours.
        </MinimalModal>
      )}
    </Layout>
  );
};

export default Wallet;
