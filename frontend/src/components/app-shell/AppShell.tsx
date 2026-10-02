import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";

import { useAuth } from "../../auth/auth-context/useAuth";

import "./AppShell.css";

type NavItemProps = {
  to: string;
  label: string;
  end?: boolean;
  onNavigate?: () => void;
  children: React.ReactNode;
};

function NavItem({
  to,
  label,
  end = false,
  onNavigate,
  children,
}: NavItemProps) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      className={({ isActive }) =>
        `app-shell-nav-item${isActive ? " app-shell-nav-item--active" : ""}`
      }
    >
      <span className="app-shell-nav-item__icon" aria-hidden="true">
        {children}
      </span>

      <span className="app-shell-nav-item__label">{label}</span>
    </NavLink>
  );
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <path
        d="M3.5 10.5 12 3l8.5 7.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M5.5 9.5V20h13V9.5M9.5 20v-5.5h5V20"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <rect
        x="3"
        y="4"
        width="18"
        height="16"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.8"
      />

      <circle
        cx="8.5"
        cy="9"
        r="1.4"
        stroke="currentColor"
        strokeWidth="1.8"
      />

      <path
        d="m21 15-4.5-4.5L11 16l-2.5-2.5L3 19"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CreateUserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <path
        d="M15.5 19c0-2.5-2-4.5-4.5-4.5S6.5 16.5 6.5 19"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />

      <circle
        cx="11"
        cy="8"
        r="3.25"
        stroke="currentColor"
        strokeWidth="1.8"
      />

      <path
        d="M18 8.5v6M15 11.5h6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <circle
        cx="9"
        cy="8"
        r="3"
        stroke="currentColor"
        strokeWidth="1.8"
      />

      <path
        d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />

      <path
        d="M16 6.5a3 3 0 0 1 0 5.9M16 14c2.5.3 4.5 2.1 4.5 5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <path
        d="M10 5H5.5v14H10"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M13 8.5 16.5 12 13 15.5M9.5 12h7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <path
        d="M4 7h16M4 12h16M4 17h16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <path
        d="M6 6l12 12M18 6 6 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CollapseIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      {collapsed ? (
        <path
          d="m9 5 7 7-7 7"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <path
          d="m15 5-7 7 7 7"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <path
        d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="m13.5 8.5 2 2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function AppShell() {
  const { currentUser, logout } = useAuth();

  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);

  const accountMenuRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    setIsAccountMenuOpen(false);
    setIsMobileOpen(false);
    void logout();
  };

  const closeMobileNavigation = () => {
    setIsMobileOpen(false);
  };

  useEffect(() => {
    if (!isAccountMenuOpen) {
      return;
    }

    const handleDocumentMouseDown = (event: MouseEvent) => {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (!accountMenuRef.current?.contains(target)) {
        setIsAccountMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleDocumentMouseDown);

    return () => {
      document.removeEventListener(
        "mousedown",
        handleDocumentMouseDown,
      );
    };
  }, [isAccountMenuOpen]);

  return (
    <div className="app-shell">
      <header className="app-shell-mobile-header">
        <button
          type="button"
          className="app-shell-menu-button"
          onClick={() => setIsMobileOpen(true)}
          aria-label="Open navigation"
          aria-expanded={isMobileOpen}
        >
          <MenuIcon />
        </button>

        <span className="app-shell-mobile-brand">MyApp</span>
      </header>

      {isMobileOpen && (
        <button
          type="button"
          className="app-shell-mobile-backdrop"
          onClick={closeMobileNavigation}
          aria-label="Close navigation"
        />
      )}

      <aside
        className={[
          "app-shell-sidebar",
          isCollapsed ? "app-shell-sidebar--collapsed" : "",
          isMobileOpen ? "app-shell-sidebar--mobile-open" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="app-shell-brand">
          <span className="app-shell-brand__mark">M</span>

          <span className="app-shell-brand__name">MyApp</span>

          {!isCollapsed && (
            <button
              type="button"
              className="app-shell-mobile-close"
              onClick={closeMobileNavigation}
              aria-label="Close navigation"
            >
              <CloseIcon />
            </button>
          )}
        </div>

        <div className="app-shell-navigation-header">
          <span className="app-shell-navigation-title">
            Navigation
          </span>

          <button
            type="button"
            className="app-shell-collapse-button"
            onClick={() => setIsCollapsed((current) => !current)}
            aria-label={
              isCollapsed
                ? "Expand navigation"
                : "Collapse navigation"
            }
            title={
              isCollapsed
                ? "Expand navigation"
                : "Collapse navigation"
            }
          >
            <CollapseIcon collapsed={isCollapsed} />
          </button>
        </div>

        <nav
          className="app-shell-navigation"
          aria-label="Main navigation"
        >
          <NavItem
            to="/"
            label="Home"
            end
            onNavigate={closeMobileNavigation}
          >
            <HomeIcon />
          </NavItem>

          <NavItem
            to="/images"
            label="Images"
            onNavigate={closeMobileNavigation}
          >
            <ImageIcon />
          </NavItem>

          {currentUser?.account_type === "A" && (
            <>
              <NavItem
                to="/admin/users/create"
                label="Create user"
                onNavigate={closeMobileNavigation}
              >
                <CreateUserIcon />
              </NavItem>

              <NavItem
                to="/admin/users"
                label="Users"
                onNavigate={closeMobileNavigation}
              >
                <UsersIcon />
              </NavItem>
            </>
          )}
        </nav>

        <div className="app-shell-sidebar-spacer" />

        <div
          className="app-shell-account"
          ref={accountMenuRef}
        >
          {isAccountMenuOpen && (
            <div
              className="app-shell-account-menu"
              role="menu"
            >
              <NavLink
                to="/account"
                className="app-shell-account-menu__item"
                role="menuitem"
                onClick={() => {
                  setIsAccountMenuOpen(false);
                  setIsMobileOpen(false);
                }}
              >
                <span
                  className="app-shell-account-menu__icon"
                  aria-hidden="true"
                >
                  <EditIcon />
                </span>

                <span>Edit details</span>
              </NavLink>

              <button
                type="button"
                className="app-shell-account-menu__item app-shell-account-menu__item--logout"
                role="menuitem"
                onClick={handleLogout}
              >
                <span
                  className="app-shell-account-menu__icon"
                  aria-hidden="true"
                >
                  <LogoutIcon />
                </span>

                <span>Logout</span>
              </button>
            </div>
          )}

          <button
            type="button"
            className="app-shell-account-toggle"
            onClick={() => {
              setIsAccountMenuOpen((current) => !current);
            }}
            aria-expanded={isAccountMenuOpen}
            aria-haspopup="menu"
          >
            <span className="app-shell-account__avatar">
              {currentUser?.username?.charAt(0).toUpperCase()}
            </span>

            <span className="app-shell-account__details">
              <strong>{currentUser?.username}</strong>

              <small>
                {currentUser?.account_type === "A"
                  ? "Administrator"
                  : "User"}
              </small>
            </span>
          </button>
        </div>
      </aside>

      <main className="app-shell-content">
        <Outlet />
      </main>
    </div>
  );
}