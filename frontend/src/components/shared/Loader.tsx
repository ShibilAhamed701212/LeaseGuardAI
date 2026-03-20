import { useEffect, useState } from "react";
import styles from "./Loader.module.css";

interface LoaderProps {
  message?:  string;
  size?:     "sm" | "md" | "lg";
  cycling?:  boolean;
}

const PROCESSING_MESSAGES = [
  "Extracting text...",
  "Analyzing contract...",
  "Calculating fairness...",
  "Detecting VIN...",
  "Fetching vehicle data...",
  "Generating negotiation tips...",
];

export function Loader({ message, size = "md", cycling = false }: LoaderProps) {
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    if (!cycling) return;
    const t = setInterval(() => {
      setMsgIdx((i) => (i + 1) % PROCESSING_MESSAGES.length);
    }, 3000);
    return () => clearInterval(t);
  }, [cycling]);

  const displayMsg = cycling ? PROCESSING_MESSAGES[msgIdx] : message;

  return (
    <div className={styles.wrapper} aria-busy="true" aria-label={displayMsg ?? "Loading"}>
      <div className={`${styles.ring} ${styles[size]}`}>
        <div /><div /><div /><div />
      </div>
      {displayMsg && (
        <p className={`${styles.message} ${cycling ? styles.cycling : ""}`}>
          {displayMsg}
        </p>
      )}
    </div>
  );
}