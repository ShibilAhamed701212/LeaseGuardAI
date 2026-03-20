import { useState } from "react";
import { HistoryList }  from "../components/history/HistoryList";
import { ResultCard }   from "../components/result/ResultCard";
import type { ResultPayload } from "../services/api";
import styles from "./History.module.css";

export function History() {
  const [selected, setSelected] = useState<ResultPayload | null>(null);
  return (
    <main className="page">
      <div className={styles.header}>
        {selected ? (
          <>
            <button className={styles.back} onClick={() => setSelected(null)}>← Back to history</button>
            <h1 className={styles.title}>Result Detail</h1>
          </>
        ) : (
          <>
            <h1 className={styles.title}>History</h1>
            <p className={styles.sub}>Past analyses stored on this device.</p>
          </>
        )}
      </div>
      {selected ? <ResultCard result={selected} /> : <HistoryList onSelect={setSelected} />}
    </main>
  );
}
