import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  ApiError,
  api,
  type AdminUser,
  type UpdateUserRequest,
} from "../../../api/client/client";
import { useAuth } from "../../../auth/auth-context/useAuth";
import {
  UserForm,
  type UserFormValues,
} from "../../../components/user-form/UserForm";
import { ResetUserPassword } from "../../../components/reset-user-password/ResetUserPassword";
import { ChangeOwnPassword } from "../../../components/change-own-password/ChangeOwnPassword";

import "./EditUserPage.css";

export function EditUserPage() {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const { currentUser, refreshUser } = useAuth();

  const isEditingOwnAccount = !userId || userId === currentUser?.id;

  const [user, setUser] = useState<AdminUser | null>(
    currentUser
      ? {
          id: currentUser.id,
          username: currentUser.username,
          account_type: currentUser.account_type,
          is_active: currentUser.is_active,
          must_change_password: currentUser.must_change_password,
        }
      : null,
  );

  const [users, setUsers] = useState<AdminUser[]>([]);

  const [isLoading, setIsLoading] = useState(Boolean(userId));

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    if (!userId) {
      if (currentUser.account_type !== "A") {
        setIsLoading(false);
        return;
      }

      let cancelled = false;

      api
        .getUsers()
        .then((userList) => {
          if (cancelled) {
            return;
          }

          setUsers(userList);
          setIsLoading(false);
        })
        .catch((error: unknown) => {
          if (cancelled) {
            return;
          }

          if (error instanceof ApiError) {
            setErrorMessage(error.message);
          } else {
            setErrorMessage(
              "Unable to load account information. Please try again.",
            );
          }

          setIsLoading(false);
        });

      return () => {
        cancelled = true;
      };
    }

    let cancelled = false;

    Promise.all([api.getUser(userId), api.getUsers()])
      .then(([userData, userList]) => {
        if (cancelled) {
          return;
        }

        setUser(userData);
        setUsers(userList);
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }

        if (error instanceof ApiError) {
          setErrorMessage(error.message);
        } else {
          setErrorMessage("Unable to load this user. Please try again.");
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
  }, [currentUser, userId]);

  if (!currentUser) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="edit-user-page">
        <div className="edit-user-state">
          <div
            className="spinner-border spinner-border-sm text-secondary"
            role="status"
            aria-hidden="true"
          />

          <span>Loading account...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="edit-user-page">
        <div className="container-fluid px-3 px-md-4 py-4 py-md-5">
          <div className="edit-user-error-card" role="alert">
            <h1>Unable to load account</h1>

            <p>{errorMessage || "The requested account could not be found."}</p>

            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => {
                navigate(isEditingOwnAccount ? "/" : "/admin/users");
              }}
            >
              {isEditingOwnAccount ? "Back to home" : "Back to users"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const activeAdminCount = users.filter(
    (item) => item.account_type === "A" && item.is_active,
  ).length;

  const isLastActiveAdmin =
    user.account_type === "A" && user.is_active && activeAdminCount <= 1;

  const isAdmin = currentUser.account_type === "A";

  const canManageAccount = isAdmin && !isEditingOwnAccount ? true : isAdmin;

  const canChangeAccountType = canManageAccount && !isLastActiveAdmin;

  const canChangeStatus = canManageAccount && !isLastActiveAdmin;

  const handleSubmit = async (values: UserFormValues) => {
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      if (isEditingOwnAccount) {
        if (!isAdmin) {
          if (values.username === user.username) {
            navigate("/", { replace: true });
            return;
          }

          await api.updateOwnProfile({
            username: values.username,
          });
        } else {
          const update: UpdateUserRequest = {};

          if (values.username !== user.username) {
            update.username = values.username;
          }

          if (values.accountType !== user.account_type) {
            update.account_type = values.accountType;
          }

          if (values.isActive !== user.is_active) {
            update.is_active = values.isActive;
          }

          if (Object.keys(update).length > 0) {
            await api.updateUser(user.id, update);
          }
        }

        await refreshUser();

        navigate("/", {
          replace: true,
        });

        return;
      }

      const update: UpdateUserRequest = {};

      if (values.username !== user.username) {
        update.username = values.username;
      }

      if (values.accountType !== user.account_type) {
        update.account_type = values.accountType;
      }

      if (values.isActive !== user.is_active) {
        update.is_active = values.isActive;
      }

      if (Object.keys(update).length === 0) {
        navigate("/admin/users", {
          replace: true,
        });

        return;
      }

      await api.updateUser(user.id, update);

      navigate("/admin/users", {
        replace: true,
        state: {
          message: `User "${values.username.trim().toLowerCase()}" was updated successfully.`,
        },
      });
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Unable to update this account. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="edit-user-page">
      <div className="container-fluid px-3 px-md-4 py-4 py-md-5">
        <div className="edit-user-layout">
          <section className="edit-user-header">
            <p className="edit-user-eyebrow">
              {isEditingOwnAccount ? "Account" : "Administration"}
            </p>

            <h1>{isEditingOwnAccount ? "Edit account" : "Edit user"}</h1>

            <p>
              {isEditingOwnAccount
                ? "Update your account details."
                : `Update the account details and access level for ${user.username}.`}
            </p>
          </section>

          <section className="edit-user-card">
            <div className="edit-user-card-header">
              <div className="edit-user-identity">
                <span className="edit-user-avatar">
                  {user.username.charAt(0).toUpperCase()}
                </span>

                <div>
                  <h2>{user.username}</h2>

                  <span>Account ID: {user.id}</span>
                </div>
              </div>
            </div>

            <UserForm
              initialValues={{
                username: user.username,
                accountType: user.account_type,
                isActive: user.is_active,
              }}
              submitLabel="Save changes"
              isSubmitting={isSubmitting}
              errorMessage={errorMessage}
              showStatus
              canChangeAccountType={canChangeAccountType}
              canChangeStatus={canChangeStatus}
              accountTypeLockedMessage={
                !isAdmin
                  ? "Only administrators can change account type."
                  : isLastActiveAdmin
                    ? "This is the only active administrator. It cannot be demoted."
                    : undefined
              }
              statusLockedMessage={
                !isAdmin
                  ? "Only administrators can activate or deactivate accounts."
                  : isLastActiveAdmin
                    ? "This is the only active administrator. It cannot be deactivated."
                    : undefined
              }
              onSubmit={handleSubmit}
              onCancel={() => {
                navigate(isEditingOwnAccount ? "/" : "/admin/users");
              }}
            />

            {isAdmin && !isEditingOwnAccount && (
              <ResetUserPassword userId={user.id} username={user.username} />
            )}

            {isEditingOwnAccount && <ChangeOwnPassword />}
          </section>
        </div>
      </div>
    </div>
  );
}
