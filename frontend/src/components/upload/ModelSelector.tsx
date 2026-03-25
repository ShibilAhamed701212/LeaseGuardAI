import styles from "./ModelSelector.module.css";

const OCR_ENGINES = ["google_cloud"] as const;
const AI_MODELS   = ["gemini"] as const;

export type OcrEngine = (typeof OCR_ENGINES)[number];
export type AiModel   = (typeof AI_MODELS)[number];

export interface AiConfig {
  apiKey?: string;
  baseUrl?: string;
  modelName?: string;
}

interface ModelSelectorProps {
  ocr: OcrEngine; 
  ai: AiModel;
  config: AiConfig;
  onOcr: (v: OcrEngine) => void; 
  onAi:  (v: AiModel) => void;
  onConfigChange: (c: Partial<AiConfig>) => void;
  disabled?: boolean;
}

export function ModelSelector({ disabled }: ModelSelectorProps) {

  return (
    <div className={styles.wrapper}>
      <div className={styles.group}>
        <label className={styles.label}>OCR ENGINE (DOCUMENT READING)</label>
        <div className={styles.chips}>
          {OCR_ENGINES.map((e) => (
            <button key={e} disabled={disabled} type="button"
              className={`${styles.chip} ${styles.active}`}
              >{'Google Cloud (Vision AI)'}</button>
          ))}
        </div>
      </div>
      
      <div className={styles.group}>
        <label className={styles.label}>AI INFERENCE ENGINE (DATA EXTRACTION)</label>
        <div className={styles.chips}>
          {AI_MODELS.map((m) => (
            <button key={m} disabled={disabled} type="button"
              className={`${styles.chip} ${styles.active}`}
              >{'Gemini 2.5 Flash (Cloud Free)'}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

