import { Navigate, Route, Routes } from "react-router-dom";

import { useAuth } from "./auth/auth-context/useAuth";
import { LoginPage } from "./pages/login/LoginPage";

function App() {
  const { currentUser, isLoading } = useAuth();

  if (isLoading) {
    return <p>Loading...</p>;
  }

  if (!currentUser) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<h1>MyApp</h1>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;