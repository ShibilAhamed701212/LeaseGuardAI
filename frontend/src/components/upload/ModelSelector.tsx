import { capitalize } from "../../utils/helpers";
import styles from "./ModelSelector.module.css";

const OCR_ENGINES = ["tesseract", "paddle"] as const;
const AI_MODELS   = ["ollama", "openai", "claude"] as const;

export type OcrEngine = (typeof OCR_ENGINES)[number];
export type AiModel   = (typeof AI_MODELS)[number];

interface ModelSelectorProps {
  ocr: OcrEngine; ai: AiModel;
  onOcr: (v: OcrEngine) => void; onAi: (v: AiModel) => void;
  disabled?: boolean;
}

export function ModelSelector({ ocr, ai, onOcr, onAi, disabled }: ModelSelectorProps) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.group}>
        <label className={styles.label}>OCR Engine</label>
        <div className={styles.chips}>
          {OCR_ENGINES.map((e) => (
            <button key={e} disabled={disabled} type="button"
              className={`${styles.chip} ${ocr === e ? styles.active : ""}`}
              onClick={() => onOcr(e)}>{capitalize(e)}</button>
          ))}
        </div>
      </div>
      <div className={styles.group}>
        <label className={styles.label}>AI Model</label>
        <div className={styles.chips}>
          {AI_MODELS.map((m) => (
            <button key={m} disabled={disabled} type="button"
              className={`${styles.chip} ${ai === m ? styles.active : ""}`}
              onClick={() => onAi(m)}>{capitalize(m)}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
