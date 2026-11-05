import { useState, useEffect } from "react";
import axios from "axios";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Mail, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";

function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setMessage("Invalid or missing verification link.");
      return;
    }

    let active = true;

    axios
      .post(`${import.meta.env.VITE_API_URL}/auth/verify-email`, { token })
      .then((res) => {
        if (active) {
          setSuccess(true);
          setMessage(res.data.message || "Your email has been verified successfully!");
        }
      })
      .catch((err) => {
        if (active) {
          setSuccess(false);
          const detail = err.response?.data?.detail;
          setMessage(
            typeof detail === "string"
              ? detail
              : "Unable to verify email. The link may have expired or is invalid."
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token]);

  return (
    <div className="owner-auth-container">
      <div className="owner-login-wrapper">
        <div
          className="owner-login-icon"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "52px",
            height: "52px",
            borderRadius: "14px",
            backgroundColor: "#eff6ff",
            color: "#2563eb",
            margin: "0 auto 14px",
          }}
        >
          <Mail size={24} />
        </div>

        <div className="owner-login-heading">
          <span>EMAIL VERIFICATION</span>
          <h1>Account Confirmation</h1>
        </div>

        <div
          className="owner-auth-card"
          style={{ textAlign: "center", padding: "35px 20px" }}
        >
          {loading ? (
            <div>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  backgroundColor: "#eff6ff",
                  color: "#2563eb",
                  margin: "0 auto 15px",
                }}
              >
                <Loader2 size={32} className="lucide-spin" style={{ animation: "spin 1s linear infinite" }} />
              </div>
              <p style={{ color: "#475569", fontSize: "16px" }}>
                Verifying your email address, please wait...
              </p>
            </div>
          ) : success ? (
            <div>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  backgroundColor: "#dcfce7",
                  color: "#16a34a",
                  margin: "0 auto 15px",
                }}
              >
                <CheckCircle2 size={32} />
              </div>
              <h2 style={{ fontSize: "20px", color: "#16a34a", marginBottom: "10px" }}>
                Verified Successfully!
              </h2>
              <p style={{ color: "#475569", marginBottom: "25px", fontSize: "15px" }}>
                {message}
              </p>
              <button
                onClick={() => navigate("/login")}
                className="owner-login-submit"
                style={{ width: "100%", marginBottom: "10px" }}
              >
                Owner Login
              </button>
              <button
                onClick={() => navigate("/student/login")}
                className="owner-login-submit"
                style={{ width: "100%", backgroundColor: "#2563eb" }}
              >
                Student Login
              </button>
            </div>
          ) : (
            <div>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  backgroundColor: "#fee2e2",
                  color: "#dc2626",
                  margin: "0 auto 15px",
                }}
              >
                <AlertTriangle size={32} />
              </div>
              <h2 style={{ fontSize: "20px", color: "#dc2626", marginBottom: "10px" }}>
                Verification Failed
              </h2>
              <p style={{ color: "#475569", marginBottom: "25px", fontSize: "15px" }}>
                {message}
              </p>
              <Link
                to="/"
                style={{
                  display: "inline-block",
                  color: "#2563eb",
                  fontWeight: "500",
                  textDecoration: "underline",
                }}
              >
                Return to Home
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default VerifyEmail;

