import { useAuth } from "../context/AuthContext";
import { useCallback, useState, useEffect } from "react";
import { goalsAPI, transactionsAPI } from "../services/api";
import Layout from "../components/Layout";
import "../assets/css/dashboard.css";

/* ────────────────────────────────────────
   Analytics Page
   ──────────────────────────────────────── */
const Analytics = () => {
  const { user } = useAuth();
  const [goals, setGoals] = useState([]);
  const [transactions, setTransactions] = useState([]);

  const loadData = useCallback(async () => {
    if (!user) return;
    
    try {
      const [goalsRes, txRes] = await Promise.all([
        goalsAPI.getAll(),
        transactionsAPI.getAll()
      ]);

      if (goalsRes.data?.success) {
        setGoals(goalsRes.data.data.goals || []);
      }
      if (txRes.data?.success) {
        setTransactions(txRes.data.data.transactions || []);
      }
    } catch (err) {
      console.error("Failed to fetch analytics data:", err);
    }
  }, [user]);

  useEffect(() => {
    const timer = setTimeout(loadData, 0);
    return () => clearTimeout(timer);
  }, [loadData]);

  // ── Derived metrics ──
  const totalSavings = goals.reduce((sum, g) => sum + g.currentAmount, 0);
  const totalDeposited = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalWithdrawn = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const avgGoalProgress =
    goals.length > 0
      ? Math.round(
          goals.reduce(
            (sum, g) => sum + (g.currentAmount / g.targetAmount) * 100,
            0,
          ) / goals.length,
        )
      : 0;

  const lockedGoals = goals.filter(
    (g) => (g.currentAmount / g.targetAmount) * 100 < 80,
  ).length;
  const unlockedGoals = goals.filter(
    (g) => (g.currentAmount / g.targetAmount) * 100 >= 80,
  ).length;

  const netActivity = totalDeposited - totalWithdrawn;

  return (
    <Layout
      title="Analytics"
      subtitle="INSIGHTS"
    >
      <div className="analytics-content fade-up">
        {/* ── KPI Row ── */}
        <div className="db-stats-row" style={{ padding: '0 0 var(--sp-8)' }}>
          <div className="db-stat-card">
            <p className="db-stat-card__label">Total Savings</p>
            <p className="db-stat-card__value">₹{totalSavings.toFixed(2)}</p>
          </div>
          <div className="db-stat-card">
            <p className="db-stat-card__label">Active Goals</p>
            <p className="db-stat-card__value">{goals.length}</p>
          </div>
          <div className="db-stat-card">
            <p className="db-stat-card__label">Avg Progress</p>
            <p className="db-stat-card__value">{avgGoalProgress}%</p>
          </div>
          <div className="db-stat-card">
            <p className="db-stat-card__label">Net Activity</p>
            <p className="db-stat-card__value" style={{ color: netActivity >= 0 ? 'var(--accent-teal)' : '#f87171' }}>
              ₹{netActivity.toFixed(2)}
            </p>
          </div>
        </div>

        {/* ── Financial Activity Chart ── */}
        <section className="db-section" style={{ padding: '0', marginBottom: 'var(--sp-10)' }}>
          <div className="db-section__header">
            <div>
              <h2 className="db-section__title">Financial Activity</h2>
              <p className="db-section__sub">Overall savings vs withdrawal comparison</p>
            </div>
          </div>
          
          <div className="db-stat-card" style={{ padding: 'var(--sp-8)' }}>
            <div style={{ height: '300px', display: 'flex', gap: 'var(--sp-4)' }}>
              {/* Y-Axis Labels */}
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingBottom: '30px', color: 'var(--text-muted)', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', width: '50px' }}>
                <span>₹{(Math.max(totalSavings, totalWithdrawn) * 1.2).toLocaleString()}</span>
                <span>₹{(Math.max(totalSavings, totalWithdrawn) * 0.9).toLocaleString()}</span>
                <span>₹{(Math.max(totalSavings, totalWithdrawn) * 0.6).toLocaleString()}</span>
                <span>₹{(Math.max(totalSavings, totalWithdrawn) * 0.3).toLocaleString()}</span>
                <span>₹0</span>
              </div>

              {/* Chart Area */}
              <div style={{ flex: 1, position: 'relative', borderLeft: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '30px', overflow: 'hidden' }}>
                {/* Grid Lines */}
                {[0, 25, 50, 75, 100].map(val => (
                  <div key={val} style={{ position: 'absolute', left: 0, right: 0, bottom: `${val}%`, height: '1px', background: 'rgba(255,255,255,0.02)', pointerEvents: 'none' }} />
                ))}

                <svg width="100%" height="100%" viewBox="0 0 1000 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, paddingBottom: '30px', overflow: 'visible', zIndex: 1 }}>
                  <defs>
                    <linearGradient id="gradSavings" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent-teal)" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="var(--accent-teal)" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="gradWithdrawals" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f87171" stopOpacity="0.15" />
                      <stop offset="100%" stopColor="#f87171" stopOpacity="0" />
                    </linearGradient>
                  </defs>

                  {/* Savings Area & Line (Continuous mock trend) */}
                  <path 
                    d={`M 0,${100 - (totalSavings / (Math.max(totalSavings, totalWithdrawn) * 1.2 || 1) * 100)} 
                       Q 250,${80 - (totalSavings / (Math.max(totalSavings, totalWithdrawn) * 1.2 || 1) * 80)} 
                       500,${100 - (totalSavings / (Math.max(totalSavings, totalWithdrawn) * 1.2 || 1) * 100)} 
                       T 1000,${90 - (totalSavings / (Math.max(totalSavings, totalWithdrawn) * 1.2 || 1) * 90)}`}
                    fill="none" 
                    stroke="var(--accent-teal)" 
                    strokeWidth="4" 
                    vectorEffect="non-scaling-stroke"
                    style={{ filter: 'drop-shadow(0 0 8px rgba(20, 241, 149, 0.4))' }}
                  />

                  {/* Withdrawals Area & Line */}
                  <path 
                    d={`M 0,${100 - (totalWithdrawn / (Math.max(totalSavings, totalWithdrawn) * 1.2 || 1) * 100)} 
                       C 200,${95 - (totalWithdrawn / (Math.max(totalSavings, totalWithdrawn) * 1.2 || 1) * 95)} 
                       600,${100 - (totalWithdrawn / (Math.max(totalSavings, totalWithdrawn) * 1.2 || 1) * 100)} 
                       1000,${98 - (totalWithdrawn / (Math.max(totalSavings, totalWithdrawn) * 1.2 || 1) * 98)}`}
                    fill="none" 
                    stroke="#f87171" 
                    strokeWidth="3" 
                    vectorEffect="non-scaling-stroke" 
                    strokeDasharray="6 6"
                    opacity="0.8"
                  />
                </svg>

                {/* Data Points (Decorative) */}
                <div style={{ position: 'absolute', bottom: `${(totalSavings / (Math.max(totalSavings, totalWithdrawn) * 1.2 || 1) * 100)}%`, left: '15%', width: '10px', height: '10px', background: 'var(--accent-teal)', borderRadius: '50%', boxShadow: '0 0 10px var(--accent-teal)', transform: 'translate(-50%, 50%)', zIndex: 2 }} />
                <div style={{ position: 'absolute', bottom: `${(totalWithdrawn / (Math.max(totalSavings, totalWithdrawn) * 1.2 || 1) * 100)}%`, left: '85%', width: '10px', height: '10px', background: '#f87171', borderRadius: '50%', boxShadow: '0 0 10px #f87171', transform: 'translate(-50%, 50%)', zIndex: 2 }} />

                {/* X-Axis labels */}
                <div style={{ position: 'absolute', bottom: '5px', left: 0, right: 0, display: 'flex', justifyContent: 'space-between', padding: '0 10px', fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', zIndex: 2 }}>
                  <span>Q1 START</span>
                  <span>MID PERIOD</span>
                  <span>CURRENT STATUS</span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 'var(--sp-12)', display: 'flex', justifyContent: 'center', gap: 'var(--sp-10)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--accent-teal)', boxShadow: '0 0 10px rgba(20, 241, 149, 0.3)' }} />
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-primary)', fontWeight: '600' }}>Active Savings (₹{totalSavings.toLocaleString()})</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '3px', border: '1px dashed #f87171', background: 'rgba(248, 113, 113, 0.1)' }} />
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-primary)', fontWeight: '600' }}>Total Withdrawals (₹{totalWithdrawn.toLocaleString()})</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Goal Performance ── */}
        <section className="db-section" style={{ padding: '0', marginBottom: 'var(--sp-10)' }}>
          <div className="db-section__header">
            <div>
              <h2 className="db-section__title">Goal Performance</h2>
              <p className="db-section__sub">Progress breakdown across all active goals</p>
            </div>
          </div>
          
          <div className="db-stat-card" style={{ padding: 'var(--sp-8)' }}>
            {goals.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 'var(--sp-8)', color: 'var(--text-secondary)' }}>
                No active goals to analyze.
              </div>
            ) : (
              <div className="goal-analytics-grid" style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
                gap: 'var(--sp-10)' 
              }}>
                {goals.map((goal, idx) => {
                  const progress = (goal.currentAmount / goal.targetAmount) * 100;
                  const isUnlocked = progress >= 80;
                  return (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <p style={{ fontWeight: '600', margin: '0' }}>{goal.title}</p>
                        <span className={`badge ${isUnlocked ? 'badge-success' : 'badge-warning'}`}>
                          {Math.round(progress)}%
                        </span>
                      </div>
                      <div style={{ 
                        height: '8px', 
                        background: 'rgba(255,255,255,0.05)', 
                        borderRadius: '4px', 
                        overflow: 'hidden' 
                      }}>
                        <div style={{ 
                          width: `${progress}%`, 
                          height: '100%', 
                          background: isUnlocked ? 'var(--accent-teal)' : 'var(--accent-teal-dark)',
                          transition: 'width 0.6s ease'
                        }} />
                      </div>
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', margin: '0' }}>
                        ₹{goal.currentAmount.toFixed(0)} / ₹{goal.targetAmount.toFixed(0)}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ── Summaries & Insights ── */}
        <div className="grid grid-cols-2" style={{ gap: 'var(--sp-8)' }}>
          <div className="db-stat-card">
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: '700', marginBottom: 'var(--sp-4)' }}>Lock Status</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--sp-3) var(--sp-4)', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Locked Goals</span>
                <span style={{ fontWeight: '700', color: '#fbbf24' }}>{lockedGoals}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--sp-3) var(--sp-4)', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Unlocked Goals</span>
                <span style={{ fontWeight: '700', color: 'var(--accent-teal)' }}>{unlockedGoals}</span>
              </div>
            </div>
          </div>

          <div className="db-stat-card">
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: '700', marginBottom: 'var(--sp-4)' }}>Transaction Flow</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--sp-3) var(--sp-4)', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Deposited</span>
                <span style={{ fontWeight: '700', color: 'var(--accent-teal)' }}>+₹{totalDeposited.toFixed(0)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--sp-3) var(--sp-4)', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Withdrawn</span>
                <span style={{ fontWeight: '700', color: '#f87171' }}>-₹{totalWithdrawn.toFixed(0)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Analytics;
