import { NavLink, Outlet } from "react-router-dom";

import { useAuth } from "../../auth/auth-context/useAuth";

import "./AppShell.css";

export function AppShell() {
  const { currentUser, logout } = useAuth();

  return (
    <div className="app-shell">
      <header className="app-shell-header border-bottom">
        <div className="container-fluid px-3 px-md-4">
          <div className="app-shell-bar">
            <NavLink
              className="navbar-brand fw-semibold"
              to="/"
            >
              MyApp
            </NavLink>

            <nav
              className="app-shell-navigation"
              aria-label="Main navigation"
            >
              <NavLink
                className={({ isActive }) =>
                  `nav-link${isActive ? " active" : ""}`
                }
                to="/"
                end
              >
                Home
              </NavLink>
            </nav>

            <div className="app-shell-user">
              <span className="small text-secondary">
                Signed in as{" "}
                <strong>{currentUser?.username}</strong>
              </span>

              <button
                type="button"
                className="btn btn-outline-danger btn-sm"
                onClick={() => {
                  void logout();
                }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="app-shell-main">
        <Outlet />
      </main>
    </div>
  );
}