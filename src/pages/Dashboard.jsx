import { useState, useEffect } from "react";
// import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";
import ProgressBar from "../components/ProgressBar";
import { goalsAPI, transactionsAPI } from "../services/api";
import "../assets/css/dashboard.css";
import MinimalModal from "../components/MinimalModal";

/* ────────────────────────────────────────
   Dashboard — Homepage-style parallax shell
   ──────────────────────────────────────── */
const Dashboard = () => {
  const { user } = useAuth();

  const [goals, setGoals] = useState([]);
  const [walletBalance, setWalletBalance] = useState(5000);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [showAddMoneyModal, setShowAddMoneyModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showNewGoalModal, setShowNewGoalModal] = useState(false);
  const [modalAmount, setModalAmount] = useState("");
  const [modalError, setModalError] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldownLeft, setCooldownLeft] = useState(null);

  // New goal form state
  const [newGoal, setNewGoal] = useState({ title: "", targetAmount: "" });

  useEffect(() => {
    loadDashboard();

    // Listen for storage changes (e.g. from Layout top-up)
    window.addEventListener("storage", loadDashboard);
    return () => window.removeEventListener("storage", loadDashboard);
  }, []);

  const loadDashboard = async () => {
    if (!user) return;
    const userId = user.id || user._id;

    // Load local wallet balance
    const b = localStorage.getItem(`user_${userId}_walletBalance`);
    setWalletBalance(b ? JSON.parse(b) : 5000);

    // Fetch goals from API
    try {
      setLoading(true);
      const res = await goalsAPI.getAll();
      if (res.data?.success) {
        setGoals(res.data.data.goals || []);
      }
    } catch (err) {
      console.error("Failed to fetch goals:", err);
    } finally {
      setLoading(false);
    }
  };


  /* ── Helpers ── */
  const saveBalance = (val) => {
    if (!user) return;
    const userId = user.id || user._id;
    setWalletBalance(val);
    localStorage.setItem(`user_${userId}_walletBalance`, JSON.stringify(val));
    // Dispatch storage event so other components (like Layout) update
    window.dispatchEvent(new Event("storage"));
  };

  /* ── Add Money ── */
  const openAddMoney = (goal) => {
    setSelectedGoal(goal);
    setModalAmount("");
    setModalError("");
    setShowAddMoneyModal(true);
  };
  const confirmAddMoney = async () => {
    const amount = parseFloat(modalAmount);
    if (!amount || amount <= 0) return setModalError("Enter a valid amount");
    if (amount > walletBalance)
      return setModalError("Insufficient wallet balance");
    if (amount > selectedGoal.targetAmount - selectedGoal.currentAmount)
      return setModalError("Amount exceeds remaining goal target");

    try {
      setLoading(true);
      const res = await goalsAPI.contribute(selectedGoal._id, {
        amount,
        operation: "add",
      });
      if (res.data?.success) {
        saveBalance(walletBalance - amount);

        // Create actual transaction on backend
        await transactionsAPI.create({
          type: "expense",
          amount,
          description: `Goal Deposit: ${selectedGoal.title}`,
          category: "savings_deposit",
          goal: selectedGoal._id,
          date: new Date(),
        });

        await loadDashboard(); // Refresh goals
        setShowAddMoneyModal(false);
      }
    } catch (err) {
      setModalError(
        err.response?.data?.message || "Failed to update goal. Try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  /* ── Withdraw ── */
  const openWithdraw = (goal) => {
    setSelectedGoal(goal);
    setModalAmount("");
    setModalError("");
    setShowWithdrawModal(true);
  };
  const confirmWithdraw = async () => {
    const amount = parseFloat(modalAmount);
    if (!amount || amount <= 0) return setModalError("Enter a valid amount");
    if (amount > selectedGoal.currentAmount)
      return setModalError("Insufficient goal balance");
    const progress =
      (selectedGoal.currentAmount / selectedGoal.targetAmount) * 100;
    if (progress < 80)
      return setModalError("Goal is locked. Reach 80% to withdraw.");

    try {
      setLoading(true);
      const res = await goalsAPI.withdraw(selectedGoal._id, { amount });
      // Update goal state locally (deduct immediately)
      setGoals((prevGoals) =>
        prevGoals.map((g) =>
          g._id === selectedGoal._id
            ? { ...g, currentAmount: g.currentAmount - amount }
            : g,
        ),
      );
      if (res.data?.success) {
        // Update goal state locally (already done above, but refresh just in case)
        // await loadDashboard(); 
      }
      setShowWithdrawModal(false);
      setModalAmount("");
      setModalError("");
      setCooldownLeft(null);
    } catch (err) {
      setModalError(
        err.response?.data?.message || "Failed to withdraw. Try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  /* ── New Goal ── */
  const createGoal = async () => {
    if (!newGoal.title.trim()) return;
    const target = parseFloat(newGoal.targetAmount);
    if (!target || target <= 0) return;

    try {
      setLoading(true);
      const res = await goalsAPI.create({
        title: newGoal.title.trim(),
        targetAmount: target,
        deadline: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ).toISOString().split("T")[0],
        category: "other",
      });
      if (res.data?.success) {
        await loadDashboard(); // Reload from backend
        setNewGoal({ title: "", targetAmount: "" });
        setShowNewGoalModal(false);
      }
    } catch (err) {
      console.error("Failed to create goal:", err);
    } finally {
      setLoading(false);
    }
  };

  /* ── Derived metrics ── */
  const totalSavings = goals.reduce((s, g) => s + g.currentAmount, 0);
  const totalTargets = goals.reduce((s, g) => s + g.targetAmount, 0);
  const growthPct =
    totalTargets > 0 ? Math.round((totalSavings / totalTargets) * 100) : 0;

  const userName = user?.name || user?.email?.split("@")[0] || "User";

  return (
    <Layout
      title={`Welcome back, ${userName}`}
      subtitle="OVERVIEW"
      balance={walletBalance}
    >
      <div className="dashboard-content fade-up">
        {/* ── Stat Cards ── */}
        <div className="db-stats-row" style={{ padding: "0 0 var(--sp-8)" }}>
          <div className="db-stat-card">
            <p className="db-stat-card__label">Total Savings</p>
            <p className="db-stat-card__value">₹{totalSavings.toFixed(2)}</p>
          </div>
          <div className="db-stat-card">
            <p className="db-stat-card__label">Active Goals</p>
            <p className="db-stat-card__value">{goals.length}</p>
          </div>
          <div className="db-stat-card">
            <p className="db-stat-card__label">Overall Progress</p>
            <p className="db-stat-card__value">{growthPct}%</p>
          </div>
          <div className="db-stat-card">
            <p className="db-stat-card__label">Total Target</p>
            <p className="db-stat-card__value">₹{totalTargets.toFixed(0)}</p>
          </div>
        </div>

        {/* ── Goals Section ── */}
        <section className="db-section" style={{ padding: "0" }}>
          <div className="db-section__header">
            <div>
              <h2 className="db-section__title">Your Goals</h2>
              <p className="db-section__sub">
                Track your progress and manage savings
              </p>
            </div>
            <button
              className="btn btn-primary"
              onClick={() => setShowNewGoalModal(true)}
            >
              ＋ New Goal
            </button>
          </div>

          {goals.length === 0 ? (
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
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="6" />
                  <circle cx="12" cy="12" r="2" />
                </svg>
              </div>
              <h3>No goals yet</h3>
              <p>
                Create your first savings goal and start building your future.
              </p>
              <button
                className="btn btn-primary"
                onClick={() => setShowNewGoalModal(true)}
              >
                Create Goal
              </button>
            </div>
          ) : (
            <div className="db-goals-grid">
              {goals.map((goal) => (
                <GoalCard
                  key={goal._id}
                  goal={goal}
                  onAddMoney={() => openAddMoney(goal)}
                  onWithdraw={() => openWithdraw(goal)}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ───── MODALS ───── */}
      {showNewGoalModal && (
        <DModal
          title="Create New Goal"
          onClose={() => setShowNewGoalModal(false)}
        >
          <div className="form-group">
            <label className="form-label">Goal Name</label>
            <input
              type="text"
              value={newGoal.title}
              onChange={(e) =>
                setNewGoal((p) => ({ ...p, title: e.target.value }))
              }
              placeholder="e.g. MacBook Pro, Trip to Goa…"
              className="form-input"
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label">Target Amount (₹)</label>
            <input
              type="number"
              value={newGoal.targetAmount}
              onChange={(e) =>
                setNewGoal((p) => ({ ...p, targetAmount: e.target.value }))
              }
              placeholder="0.00"
              className="form-input"
            />
          </div>
          <div className="modal-footer">
            <button
              onClick={createGoal}
              className="btn btn-primary"
              style={{ flex: 1 }}
            >
              Create Goal
            </button>
            <button
              onClick={() => setShowNewGoalModal(false)}
              className="btn btn-ghost"
              style={{ flex: 1 }}
            >
              Cancel
            </button>
          </div>
        </DModal>
      )}

      {showAddMoneyModal && (
        <DModal
          title="Add Money to Goal"
          onClose={() => setShowAddMoneyModal(false)}
          goal={selectedGoal}
        >
          <div className="form-group">
            <label className="form-label">Amount (₹)</label>
            <input
              type="number"
              value={modalAmount}
              onChange={(e) => {
                setModalAmount(e.target.value);
                setModalError("");
              }}
              placeholder="0.00"
              className="form-input"
              autoFocus
            />
            {modalError && <p className="form-error">⚠ {modalError}</p>}
            <p className="form-hint">Available: ₹{walletBalance.toFixed(2)}</p>
          </div>
          <div className="modal-footer">
            <button
              onClick={confirmAddMoney}
              className="btn btn-primary"
              style={{ flex: 1 }}
            >
              Confirm Deposit
            </button>
            <button
              onClick={() => setShowAddMoneyModal(false)}
              className="btn btn-ghost"
              style={{ flex: 1 }}
            >
              Cancel
            </button>
          </div>
        </DModal>
      )}

      {showWithdrawModal && (
        <DModal
          title="Withdraw from Goal"
          onClose={() => setShowWithdrawModal(false)}
          goal={selectedGoal}
        >
          <div className="form-group">
            <label className="form-label">Amount (₹)</label>
            <input
              type="number"
              value={modalAmount}
              onChange={(e) => {
                setModalAmount(e.target.value);
                setModalError("");
              }}
              placeholder="0.00"
              className="form-input"
              autoFocus
            />
            {modalError && <p className="form-error">⚠ {modalError}</p>}
          </div>
          <div className="modal-footer">
            <button
              onClick={confirmWithdraw}
              disabled={loading}
              className="btn btn-danger"
              style={{ flex: 1 }}
            >
              {loading ? "Processing…" : "Withdraw"}
            </button>
            <button
              onClick={() => setShowWithdrawModal(false)}
              className="btn btn-ghost"
              style={{ flex: 1 }}
            >
              Cancel
            </button>
          </div>
        </DModal>
      )}

      {cooldownLeft && (
        <div style={{ color: "red", fontSize: 12 }}>{cooldownLeft}</div>
      )}
    </Layout>
  );
};

/* ──────────────────────────────────────
   Goal Card
   ────────────────────────────────────── */
const GoalCard = ({ goal, onAddMoney, onWithdraw }) => {
  const progress = Math.min(
    (goal.currentAmount / goal.targetAmount) * 100,
    100,
  );
  const isUnlocked = progress >= 80;
  const remaining = goal.targetAmount - goal.currentAmount;

  return (
    <div className="db-goal-card">
      {/* glow accent line at top */}
      <div
        className={`db-goal-card__accent ${isUnlocked ? "db-goal-card__accent--green" : "db-goal-card__accent--blue"}`}
      />

      <div className="db-goal-card__top">
        <div>
          <h3 className="db-goal-card__title">{goal.title}</h3>
          {goal.description && (
            <p className="db-goal-card__desc">{goal.description}</p>
          )}
        </div>
        <div className="db-goal-card__icon-wrapper">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>
      </div>

      <ProgressBar
        currentAmount={goal.currentAmount}
        targetAmount={goal.targetAmount}
        showAnimation
      />

      <div className="db-goal-card__amounts">
        <div className="db-goal-card__amt">
          <span className="db-goal-card__amt-label">Saved</span>
          <span className="db-goal-card__amt-val db-goal-card__amt-val--green">
            ₹{goal.currentAmount.toFixed(0)}
          </span>
        </div>
        <div className="db-goal-card__amt">
          <span className="db-goal-card__amt-label">Target</span>
          <span className="db-goal-card__amt-val">
            ₹{goal.targetAmount.toFixed(0)}
          </span>
        </div>
        <div className="db-goal-card__amt">
          <span className="db-goal-card__amt-label">Remaining</span>
          <span className="db-goal-card__amt-val db-goal-card__amt-val--muted">
            ₹{remaining.toFixed(0)}
          </span>
        </div>
      </div>


      <div className="db-goal-card__badge-row">
        <span
          className={`badge ${isUnlocked ? "badge-success" : "badge-warning"}`}
        >
          {isUnlocked ? "Unlocked" : "Locked"}
        </span>
      </div>

      <div className="db-goal-card__actions">
        <button
          onClick={onAddMoney}
          className="btn btn-secondary"
          style={{ flex: 1 }}
        >
          ＋ Deposit
        </button>
        <button
          onClick={onWithdraw}
          disabled={!isUnlocked}
          className={`btn ${isUnlocked ? "btn-danger" : "btn-ghost"}`}
          style={{ flex: 1 }}
        >
          Withdraw
        </button>
      </div>
    </div>
  );
};

/* ──────────────────────────────────────
   Modal Wrapper
   ────────────────────────────────────── */
const DModal = ({ title, onClose, goal, children }) => (
  <div className="modal-overlay">
    <div className="db-modal">
      <div className="modal-header">
        <h2 className="modal-title">{title}</h2>
        <button className="modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>
      {goal && (
        <div className="db-modal__goal-strip">
          <div className="db-modal__goal-icon">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <div>
            <p className="db-modal__goal-meta">Goal</p>
            <p className="db-modal__goal-name">{goal.title}</p>
          </div>
        </div>
      )}
      <div className="modal-body">{children}</div>
    </div>
  </div>
);

export default Dashboard;
