import { Routes, Route, Link, Navigate } from "react-router-dom";
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


function ProtectedRoute({ children }) {
  const token = sessionStorage.getItem("access_token");

  return token ? children : <Navigate to="/login" replace />;
}
function StudentProtectedRoute({ children }) {
  const token = sessionStorage.getItem("student_access_token");

  return token
    ? children
    : <Navigate to="/student/login" replace />;
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


  return (
    
    <>
 <nav className="navbar">
  <Link to="/" className="nav-logo" onClick={closeMenus}>
    🏠 RoomRentFinder
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
    {menuOpen ? "✕" : "☰"}
  </button>

  <div
    id="main-navigation"
    className={`nav-links ${menuOpen ? "nav-links-open" : ""}`}
  >
    <Link to="/" onClick={closeMenus}>
      Home
    </Link>

    {auth.owner ? (
      <>
        <Link to="/owner/dashboard" onClick={closeMenus}>
          Dashboard
        </Link>

        <Link to="/owner/enquiries" onClick={closeMenus}>
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
          >
            👤 Account ▾
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
            >
              Logout
            </button>
          </div>
        </div>
      </>
    ) : auth.student ? (
      <>
        <Link to="/favorites" onClick={closeMenus}>
          ♥ Saved Rooms
        </Link>

        <Link to="/student/dashboard" onClick={closeMenus}>
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
          >
            👤 Account ▾
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
            >
              Logout
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
        >
          Login / Register ▾
        </button>

        <div className="nav-dropdown-menu">
          <Link to="/student/login" onClick={closeMenus}>
            Student Login
          </Link>

          <Link to="/student/register" onClick={closeMenus}>
            Student Register
          </Link>

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
</nav>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
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
        path="/student/login"
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
        path="/student/profile"
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
      </Routes>
    </>
  );
}

export default App;