import { useEffect, useRef, useState } from "react";

/**
 * ProgressBar — Premium animated progress visualization
 * Features: gradient fill, shimmer overlay, 80% threshold marker,
 * lock/unlock badge with bounce animation
 */
const ProgressBar = ({ currentAmount, targetAmount, showAnimation = false }) => {
  const [animateUnlock, setAnimateUnlock] = useState(false);
  const prevProgressRef = useRef(0);

  const progress = Math.min(
    Math.round((currentAmount / targetAmount) * 100),
    100,
  );

  const isWithdrawable = progress >= 80;
  const requiredFor80 = Math.ceil((targetAmount * 80) / 100);
  const amountNeeded = Math.max(0, requiredFor80 - currentAmount);

  useEffect(() => {
    const prev = prevProgressRef.current;
    prevProgressRef.current = progress;

    if (showAnimation && progress >= 80 && prev < 80) {
      const start = setTimeout(() => setAnimateUnlock(true), 0);
      const stop = setTimeout(() => setAnimateUnlock(false), 1200);
      return () => {
        clearTimeout(start);
        clearTimeout(stop);
      };
    }
  }, [progress, showAnimation]);

  return (
    <div className="progress-wrapper">
      {/* Status row */}
      <div className="progress-header">
        <div className="progress-status">
          <span
            className={`progress-icon${animateUnlock ? " unlocking" : ""}`}
          >
            {isWithdrawable ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 9.9-1" />
              </svg>
            )}
          </span>
          <span
            style={{
              color: isWithdrawable
                ? "var(--color-success-light)"
                : "var(--color-warning-light)",
            }}
          >
            {isWithdrawable ? "Unlocked" : "Locked"}
          </span>
        </div>
        <span className="progress-percent">{progress}%</span>
      </div>

      {/* Bar track */}
      <div className="progress-bar-track">
        <div
          className={`progress-bar-fill${isWithdrawable ? "" : " locked"}`}
          style={{ width: `${progress}%` }}
        />
        <div className="progress-threshold" title="80% unlock threshold" />
      </div>

      {/* Amount info */}
      <div className="progress-info">
        <span>₹{currentAmount?.toFixed(2) || "0.00"}</span>
        <span>₹{targetAmount?.toFixed(2) || "0.00"}</span>
      </div>

      {/* Status messages */}
      {!isWithdrawable && amountNeeded > 0 && (
        <div className="progress-message warning">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1m-1.636 6.364l-.707-.707M12 21v-1m-6.364-1.636l.707-.707M3 12h1m1.636-6.364l.707.707" />
          </svg>
          <span>Deposit ₹{amountNeeded.toFixed(2)} more to unlock withdrawal</span>
        </div>
      )}

      {isWithdrawable && (
        <div className="progress-message success">
          <span>✓</span>
          <span>Goal unlocked! Ready for withdrawal</span>
        </div>
      )}
    </div>
  );
};

export default ProgressBar;
