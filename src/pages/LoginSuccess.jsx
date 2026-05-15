import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { authAPI } from "../services/api";

const LoginSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  const [error, setError] = useState(token ? "" : "No authentication token received.");

  useEffect(() => {
    if (!token) {
      setTimeout(() => navigate("/login"), 2000);
      return;
    }

    // Store token and fetch user profile
    const handleOAuthLogin = async () => {
      try {
        localStorage.setItem("savemore_token", token);

        // Fetch user profile using the token
        const response = await authAPI.getMe();
        const user = response.data.data.user;

        localStorage.setItem("savemore_user", JSON.stringify(user));

        // Redirect to dashboard
        navigate("/dashboard", { replace: true });
        // Force a page reload so AuthContext picks up the new token
        window.location.reload();
      } catch (err) {
        console.error("OAuth login error:", err);
        setError("Authentication failed. Redirecting to login...");
        localStorage.removeItem("savemore_token");
        setTimeout(() => navigate("/login"), 2000);
      }
    };

    handleOAuthLogin();
  }, [token, navigate]);

  return (
    <div className="auth-body">
      <div className="bg-gradient-mesh"></div>
      <div className="bg-noise"></div>
      <div className="auth-container fade-up">
        <div className="auth-card" style={{ textAlign: "center" }}>
          <div className="logo">
            SAVE<span className="highlight">MORE</span>
          </div>
          {error ? (
            <p style={{ color: "#ff4757", marginTop: "1rem" }}>{error}</p>
          ) : (
            <>
              <h1 style={{ fontSize: "20px", marginBottom: "12px" }}>
                Signing you in...
              </h1>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  border: "3px solid rgba(255,255,255,0.1)",
                  borderTopColor: "#14f195",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                  margin: "1.5rem auto 0",
                }}
              />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginSuccess;
