import { useAuth } from "../../auth/auth-context/useAuth";

export function HomePage() {
  const { currentUser } = useAuth();

  return (
    <div className="container-fluid px-3 px-md-4 py-4 py-md-5">
      <div className="row">
        <div className="col-12">
          <h1 className="mb-2">Welcome to MyApp</h1>

          <p className="mb-0 text-secondary">
            Signed in as {currentUser?.username}.
          </p>
        </div>
      </div>
    </div>
  );
}