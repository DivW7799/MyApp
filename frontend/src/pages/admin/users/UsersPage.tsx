import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { ApiError, api, type AdminUser } from "../../../api/client/client";

import "./UsersPage.css";

type UserFilter = "all" | "active" | "inactive";

export function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<UserFilter>("all");

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const navigate = useNavigate();

  const fetchUsers = async (): Promise<AdminUser[]> => {
    return api.getUsers();
  };

  const loadUsers = async (showRefreshState = false) => {
    if (showRefreshState) {
      setIsRefreshing(true);
    }

    setErrorMessage("");

    try {
      const data = await fetchUsers();
      setUsers(data);
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Unable to load users. Please try again.");
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    api
      .getUsers()
      .then((data) => {
        if (!cancelled) {
          setUsers(data);
        }
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }

        if (error instanceof ApiError) {
          setErrorMessage(error.message);
        } else {
          setErrorMessage("Unable to load users. Please try again.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredUsers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return users.filter((user) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        user.username.toLowerCase().includes(normalizedSearch);

      const matchesFilter =
        filter === "all" ||
        (filter === "active" && user.is_active) ||
        (filter === "inactive" && !user.is_active);

      return matchesSearch && matchesFilter;
    });
  }, [filter, searchTerm, users]);

  const activeUserCount = users.filter((user) => user.is_active).length;

  const inactiveUserCount = users.length - activeUserCount;

  return (
    <div className="users-page">
      <div className="container-fluid px-3 px-md-4 py-4 py-md-5">
        <div className="users-page__header">
          <div>
            <p className="users-page__eyebrow">Administration</p>

            <h1>Users</h1>

            <p className="users-page__description">
              View and manage accounts in your MyApp workspace.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => {
              void loadUsers(true);
            }}
            disabled={isLoading || isRefreshing}
          >
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <section className="users-page__stats">
          <div className="users-stat">
            <span className="users-stat__label">Total users</span>

            <strong>{users.length}</strong>
          </div>

          <div className="users-stat">
            <span className="users-stat__label">Active</span>

            <strong>{activeUserCount}</strong>
          </div>

          <div className="users-stat">
            <span className="users-stat__label">Inactive</span>

            <strong>{inactiveUserCount}</strong>
          </div>
        </section>

        {errorMessage && (
          <div className="users-page__alert" role="alert">
            <span>{errorMessage}</span>

            <button
              type="button"
              className="btn btn-sm btn-outline-danger"
              onClick={() => {
                void loadUsers();
              }}
            >
              Try again
            </button>
          </div>
        )}

        <section className="users-card">
          <div className="users-card__toolbar">
            <div className="users-search">
              <label htmlFor="users-search">Search users</label>

              <input
                id="users-search"
                type="search"
                placeholder="Search by username..."
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                }}
                disabled={isLoading}
              />
            </div>

            <div className="users-filter" aria-label="Filter users">
              <button
                type="button"
                className={
                  filter === "all"
                    ? "users-filter__button users-filter__button--active"
                    : "users-filter__button"
                }
                onClick={() => setFilter("all")}
              >
                All
              </button>

              <button
                type="button"
                className={
                  filter === "active"
                    ? "users-filter__button users-filter__button--active"
                    : "users-filter__button"
                }
                onClick={() => setFilter("active")}
              >
                Active
              </button>

              <button
                type="button"
                className={
                  filter === "inactive"
                    ? "users-filter__button users-filter__button--active"
                    : "users-filter__button"
                }
                onClick={() => setFilter("inactive")}
              >
                Inactive
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="users-page__state">
              <div
                className="spinner-border spinner-border-sm text-secondary"
                role="status"
                aria-hidden="true"
              />

              <span>Loading users...</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="users-page__empty">
              <h2>No users found</h2>

              <p>
                {users.length === 0
                  ? "There are currently no users to display."
                  : "Try changing your search or filter."}
              </p>
            </div>
          ) : (
            <div className="users-table-wrapper">
              <table className="users-table">
                <thead>
                  <tr>
                    <th scope="col">User</th>
                    <th scope="col">Account type</th>
                    <th scope="col">Status</th>
                    <th scope="col">Password</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div className="users-table__user">
                          <span className="users-table__avatar">
                            {user.username.charAt(0).toUpperCase()}
                          </span>

                          <div>
                            <strong>{user.username}</strong>

                            <span>{user.id}</span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span
                          className={
                            user.account_type === "A"
                              ? "user-badge user-badge--admin"
                              : "user-badge user-badge--user"
                          }
                        >
                          {user.account_type === "A"
                            ? "Administrator"
                            : "Normal user"}
                        </span>
                      </td>

                      <td>
                        <span
                          className={
                            user.is_active
                              ? "user-status user-status--active"
                              : "user-status user-status--inactive"
                          }
                        >
                          <span className="user-status__dot" />

                          {user.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td>
                        {user.must_change_password ? (
                          <span className="user-password-status user-password-status--pending">
                            Change required
                          </span>
                        ) : (
                          <span className="user-password-status">
                            Up to date
                          </span>
                        )}
                      </td>

                      <td>
                        <button
                          type="button"
                          className="users-table__edit-button"
                          onClick={() => {
                            navigate(`/admin/users/${user.id}/edit`);
                          }}
                          aria-label={`Edit user ${user.username}`}
                          title="Edit user"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                            focusable="false"
                          >
                            <path
                              d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />

                            <path
                              d="m13.5 8.5 2 2"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                            />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
