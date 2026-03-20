import { Routes, Route, NavLink } from "react-router-dom";
import { Home }    from "./pages/Home";
import { Upload }  from "./pages/Upload";
import { Result }  from "./pages/Result";
import { History } from "./pages/History";

export default function App() {
  return (
    <>
      <nav className="app-nav">
        <span className="brand">OCR·AGENT</span>
        <NavLink to="/"        end className={({ isActive }) => isActive ? "active" : ""}>Home</NavLink>
        <NavLink to="/upload"      className={({ isActive }) => isActive ? "active" : ""}>Analyse</NavLink>
        <NavLink to="/history"     className={({ isActive }) => isActive ? "active" : ""}>History</NavLink>
      </nav>
      <Routes>
        <Route path="/"               element={<Home />}    />
        <Route path="/upload"         element={<Upload />}  />
        <Route path="/result/:job_id" element={<Result />}  />
        <Route path="/history"        element={<History />} />
      </Routes>
    </>
  );
}
