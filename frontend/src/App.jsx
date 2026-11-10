import { Routes, Route, Link, Navigate } from "react-router-dom";
import {
  Building2,
  Menu,
  X,
  ChevronDown,
  User,
  Heart,
  LogOut,
  GraduationCap,
} from "lucide-react";
import Home from "./pages/Home";
import Login from "./pages/login";
import "./App.css";
import Register from "./pages/Register.jsx";
import OwnerDashboard from "./pages/OwnerDashboard.jsx";
import AddRoom from "./pages/AddRoom.jsx";
import EditRoom from "./pages/EditRoom.jsx";
import RoomDetails from "./pages/RoomDetails.jsx";
import UploadRoomImage from "./pages/UploadRoomImage.jsx"; 
import ManageRoomImages from "./pages/ManageRoomImages.jsx";
import Favorites from "./pages/favorites.jsx";
import OwnerEnquiries from "./pages/OwnerEnquiries.jsx";
import StudentRegister from "./pages/StudentRegister.jsx";
import StudentLogin from "./pages/StudentLogin.jsx";
import StudentDashboard from "./pages/StudentDashboard.jsx";
import StudentChangePassword from "./pages/StudentChangePassword";
import StudentProfile from "./pages/StudentProfile";
import {useEffect, useState} from "react";
import {useLocation,useNavigate} from "react-router-dom";
import OwnerProfile from "./pages/OwnerProfile";
import OwnerChangePassword from "./pages/OwnerChangePassword";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import VerifyEmail from "./pages/VerifyEmail";


function ProtectedRoute({ children }) {
  const isOwner = !!sessionStorage.getItem("access_token");
  const isStudent = !!sessionStorage.getItem("student_access_token");

  // If already logged in as Student, redirect to Student Dashboard rather than asking to log in again
  if (isStudent) {
    return <Navigate to="/student/dashboard" replace />;
  }

  return isOwner ? children : <Navigate to="/login" replace />;
}

function StudentProtectedRoute({ children }) {
  const isStudent = !!sessionStorage.getItem("student_access_token");
  const isOwner = !!sessionStorage.getItem("access_token");

  // If already logged in as Owner, redirect to Owner Dashboard rather than asking to log in again
  if (isOwner) {
    return <Navigate to="/owner/dashboard" replace />;
  }

  return isStudent ? children : <Navigate to="/student/login" replace />;
}
function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
const [dropdownOpen, setDropdownOpen] = useState(false);
  const [auth, setAuth] = useState({
    owner: false,
    student: false,
  });

  useEffect(() => {
    const updateAuth = () => {
      setAuth({
        owner: !!sessionStorage.getItem("access_token"),
        student: !!sessionStorage.getItem("student_access_token"),
      });
    };

    updateAuth();

    window.addEventListener("auth-changed", updateAuth);

    return () => {
      window.removeEventListener("auth-changed", updateAuth);
    };
  }, [location.pathname]);

  // ADD THIS FUNCTION HERE
  const handleLogout = () => {
    sessionStorage.removeItem("access_token");
    sessionStorage.removeItem("student_access_token");
    sessionStorage.removeItem("student_name");

    window.dispatchEvent(new Event("auth-changed"));

    navigate("/", { replace: true });
  };
  const closeMenus = () => {
    setMenuOpen(false);
    setDropdownOpen(false);
  };

  // Lock background scrolling on mobile when right drawer is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  // Close menus on route navigation
  useEffect(() => {
    closeMenus();
  }, [location.pathname]);

  return (
    <>
      <nav className="navbar">
        <Link to="/" className="nav-logo" onClick={closeMenus}>
          <Building2 size={20} className="nav-logo-icon" />
          <span>RoomRentFinder</span>
        </Link>

        {/* Mobile hamburger button */}
        <button
          type="button"
          className="nav-hamburger"
          aria-label="Toggle navigation"
          aria-expanded={menuOpen}
          aria-controls="main-navigation"
          onClick={() => {
            setMenuOpen((prev) => !prev);
            setDropdownOpen(false);
          }}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        {/* Mobile backdrop overlay - tapping outside closes right drawer */}
        <div
          className={`nav-backdrop ${menuOpen ? "nav-backdrop-open" : ""}`}
          onClick={closeMenus}
          aria-hidden="true"
        />

        <div
          id="main-navigation"
          className={`nav-links ${menuOpen ? "nav-links-open" : ""}`}
        >
          {/* Mobile Drawer Header with Close Button */}
          <div className="nav-drawer-header">
            <div className="nav-drawer-brand">
              <Building2 size={18} className="nav-logo-icon" />
              <span>RoomRentFinder</span>
            </div>
            <button
              type="button"
              className="nav-drawer-close"
              onClick={closeMenus}
              aria-label="Close menu"
            >
              <X size={20} />
            </button>
          </div>

          <div className="nav-drawer-body">
            <Link to="/" className="nav-link-item" onClick={closeMenus}>
              Home
            </Link>

            {auth.owner ? (
              <>
                <div className="nav-drawer-section-title">Owner Portal</div>
                <Link to="/owner/dashboard" className="nav-link-item" onClick={closeMenus}>
                  Dashboard
                </Link>

                <Link to="/owner/enquiries" className="nav-link-item" onClick={closeMenus}>
                  Enquiries
                </Link>

                <div
                  className={`nav-dropdown ${
                    dropdownOpen ? "nav-dropdown-open" : ""
                  }`}
                >
                  <button
                    type="button"
                    className="nav-account"
                    aria-expanded={dropdownOpen}
                    onClick={() => setDropdownOpen((prev) => !prev)}
                    style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                  >
                    <User size={15} />
                    <span>Account</span>
                    <ChevronDown size={14} className="nav-chevron" />
                  </button>

                  <div className="nav-dropdown-menu">
                    <Link to="/owner/profile" onClick={closeMenus}>
                      My Profile
                    </Link>

                    <Link to="/owner/change-password" onClick={closeMenus}>
                      Change Password
                    </Link>

                    <button
                      type="button"
                      className="nav-menu-logout"
                      onClick={() => {
                        closeMenus();
                        handleLogout();
                      }}
                      style={{ display: "flex", alignItems: "center", gap: "6px" }}
                    >
                      <LogOut size={14} /> Logout
                    </button>
                  </div>
                </div>
              </>
            ) : auth.student ? (
              <>
                <div className="nav-drawer-section-title">Renter Portal</div>
                <Link
                  to="/favorites"
                  className="nav-link-item"
                  onClick={closeMenus}
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  <Heart size={15} style={{ color: "#e11d48" }} />
                  <span>Saved Rooms</span>
                </Link>

                <Link to="/student/dashboard" className="nav-link-item" onClick={closeMenus}>
                  Dashboard
                </Link>

                <div
                  className={`nav-dropdown ${
                    dropdownOpen ? "nav-dropdown-open" : ""
                  }`}
                >
                  <button
                    type="button"
                    className="nav-account"
                    aria-expanded={dropdownOpen}
                    onClick={() => setDropdownOpen((prev) => !prev)}
                    style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                  >
                    <User size={15} />
                    <span>Account</span>
                    <ChevronDown size={14} className="nav-chevron" />
                  </button>

                  <div className="nav-dropdown-menu">
                    <Link to="/student/profile" onClick={closeMenus}>
                      My Profile
                    </Link>

                    <Link
                      to="/student/change-password"
                      onClick={closeMenus}
                    >
                      Change Password
                    </Link>

                    <button
                      type="button"
                      className="nav-menu-logout"
                      onClick={() => {
                        closeMenus();
                        handleLogout();
                      }}
                      style={{ display: "flex", alignItems: "center", gap: "6px" }}
                    >
                      <LogOut size={14} /> Logout
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div
                className={`nav-dropdown ${
                  dropdownOpen ? "nav-dropdown-open" : ""
                }`}
              >
                <button
                  type="button"
                  className="nav-login"
                  aria-expanded={dropdownOpen}
                  onClick={() => setDropdownOpen((prev) => !prev)}
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  <span>Login / Register</span>
                  <ChevronDown size={14} className="nav-chevron" />
                </button>

                <div className="nav-dropdown-menu">
                  <div className="nav-dropdown-category">
                    Users &amp; Renters
                  </div>
                  <Link to="/student/login" onClick={closeMenus}>
                    User Login
                  </Link>

                  <Link to="/student/register" onClick={closeMenus}>
                    User Register
                  </Link>

                  <div className="nav-dropdown-category nav-category-divider">
                    Property Owners
                  </div>
                  <Link to="/login" onClick={closeMenus}>
                    Owner Login
                  </Link>

                  <Link to="/register" onClick={closeMenus}>
                    Owner Register
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route
          path="/owner/dashboard"
          element={
            <ProtectedRoute>
              <OwnerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/add-room"
          element={
            <ProtectedRoute>
              <AddRoom />
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/edit-room/:roomId"
          element={
            <ProtectedRoute>
              <EditRoom />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rooms/:roomId"
          element={<RoomDetails />}
        />
        <Route
          path="/owner/upload-image/:roomId"
          element={
            <ProtectedRoute>
              <UploadRoomImage />
            </ProtectedRoute>
          }
        />
        <Route path="/owner/rooms/:roomId/upload"
            element={
                <ProtectedRoute>
                    <UploadRoomImage />
                </ProtectedRoute>
            }
        />  
        <Route
        path="/owner/rooms/:roomId/photos"
        element={
            <ProtectedRoute>
            <ManageRoomImages />
            </ProtectedRoute>
        }
        />
        <Route
          path="/favorites"
          element={
            <StudentProtectedRoute>
              <Favorites />
            </StudentProtectedRoute>
          }
        />
        <Route
        path="/owner/enquiries"
        element={
            <ProtectedRoute>
            <OwnerEnquiries />
            </ProtectedRoute>
        }
        />
        <Route
        path="/student/register"
        element={<StudentRegister />}
        />
        <Route
        path="/user/register"
        element={<StudentRegister />}
        />

        <Route
        path="/student/login"
        element={<StudentLogin />}
        />
        <Route
        path="/user/login"
        element={<StudentLogin />}
        />

        <Route
        path="/student/dashboard"
        element={
            <StudentProtectedRoute>
            <StudentDashboard />
            </StudentProtectedRoute>
        }
        />
        <Route
        path="/user/dashboard"
        element={
            <StudentProtectedRoute>
            <StudentDashboard />
            </StudentProtectedRoute>
        }
        />
        <Route
        path="/student/profile"
        element={
            <StudentProtectedRoute>
            <StudentProfile />
            </StudentProtectedRoute>
        }
        />
        <Route
        path="/user/profile"
        element={
            <StudentProtectedRoute>
            <StudentProfile />
            </StudentProtectedRoute>
        }
        />
        <Route
        path="/student/change-password"
        element={
            <StudentProtectedRoute>
            <StudentChangePassword />
            </StudentProtectedRoute>
        }
        />
        <Route
        path="/user/change-password"
        element={
            <StudentProtectedRoute>
            <StudentChangePassword />
            </StudentProtectedRoute>
        }
        />
        <Route
          path="/owner/profile"
          element={
            <ProtectedRoute>
              <OwnerProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/change-password"
          element={
            <ProtectedRoute>
              <OwnerChangePassword />
            </ProtectedRoute>
          }
        />
        {/* Catch-all route: gracefully redirects any unknown or 404 path back to the home page */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;