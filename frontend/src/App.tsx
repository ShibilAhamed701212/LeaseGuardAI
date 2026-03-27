import { Routes, Route, NavLink, useParams } from "react-router-dom";
import { Home }    from "./pages/Home";
import { Upload }  from "./pages/Upload";
import { Result }  from "./pages/Result";
import { History } from "./pages/History";
import { ChatWidget } from "./components/chat/ChatWidget";
import { useState } from "react";
import type { ResultPayload } from "./services/api";

export default function App() {
  const [lastResult, setLastResult] = useState<ResultPayload | null>(null);

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
        <Route path="/result/:job_id" element={<Result onResultLoaded={setLastResult} />}  />
        <Route path="/history"        element={<History />} />
      </Routes>
      <ChatWidget contractData={lastResult} />
    </>
  );
}
