import { useNavigate } from "react-router-dom";
import styles from "./Home.module.css";

const FEATURES = [
  { icon:"🔍", title:"OCR Extraction",   desc:"Tesseract or PaddleOCR — fast or accurate" },
  { icon:"🤖", title:"AI Analysis",      desc:"Ollama, OpenAI, or Claude — your choice" },
  { icon:"⚖️", title:"Fairness Score",   desc:"Instant scoring of contract quality" },
  { icon:"💡", title:"Negotiation Tips", desc:"Actionable AI-powered suggestions" },
  { icon:"🔐", title:"Privacy First",    desc:"All data stays on your device" },
  { icon:"🚗", title:"VIN Lookup",       desc:"Vehicle data fetched automatically" },
];

const STEPS = ["Upload document","Choose OCR + AI","Processing","View insights","Data deleted"];

export function Home() {
  const navigate = useNavigate();
  return (
    <main className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.badge}>AI-Powered Contract Analysis</div>
        <h1 className={styles.title}>Understand your<br /><span>lease contract</span><br />in seconds</h1>
        <p className={styles.sub}>Upload any auto lease document. Get instant OCR extraction, AI-powered SLA analysis, fairness scoring, and negotiation tips — all stored locally.</p>
        <div className={styles.actions}>
          <button className="btn-primary" onClick={() => navigate("/upload")}>Start Analysis →</button>
          <button className="btn-ghost"   onClick={() => navigate("/history")}>View History</button>
        </div>
      </div>

      <div className={styles.grid}>
        {FEATURES.map((f) => (
          <div key={f.title} className={styles.feature}>
            <span className={styles.fIcon}>{f.icon}</span>
            <h3 className={styles.fTitle}>{f.title}</h3>
            <p className={styles.fDesc}>{f.desc}</p>
          </div>
        ))}
      </div>

      <div className={styles.flow}>
        <h2 className={styles.flowTitle}>How it works</h2>
        <div className={styles.steps}>
          {STEPS.map((s, i) => (
            <div key={s} className={styles.step}>
              <div className={styles.stepNum}>{i + 1}</div>
              <span className={styles.stepLabel}>{s}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
