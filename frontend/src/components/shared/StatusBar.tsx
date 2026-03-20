import styles from "./StatusBar.module.css";

type Step = "uploading" | "processing" | "completed" | "stored" | "cleaned";
const STEPS: Step[] = ["uploading", "processing", "completed", "stored", "cleaned"];

export function StatusBar({ status }: { status: string }) {
  const idx = STEPS.indexOf(status as Step);
  return (
    <div className={styles.bar} role="progressbar" aria-label={`Status: ${status}`}>
      {STEPS.map((step, i) => (
        <div key={step} className={[styles.step, i < idx ? styles.done : "", STEPS[idx] === step ? styles.active : ""].join(" ")}>
          <div className={styles.dot} />
          <span className={styles.label}>{step}</span>
        </div>
      ))}
    </div>
  );
}
