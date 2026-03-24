import { capitalize } from "../../utils/helpers";
import styles from "./ModelSelector.module.css";

const OCR_ENGINES = ["tesseract", "paddle"] as const;
const AI_MODELS   = ["ollama", "gemini", "custom"] as const;

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

export function ModelSelector({ ocr, ai, config, onOcr, onAi, onConfigChange, disabled }: ModelSelectorProps) {
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
        <label className={styles.label}>AI Inference Model</label>
        <div className={styles.chips}>
          {AI_MODELS.map((m) => (
            <button key={m} disabled={disabled} type="button"
              className={`${styles.chip} ${ai === m ? styles.active : ""}`}
              onClick={() => onAi(m)}>{m === 'ollama' ? 'Ollama (Llama3.2 1B)' : m === 'gemini' ? 'Gemini 1.5 Flash' : 'Custom Model'}</button>
          ))}
        </div>
      </div>

      {(ai === "gemini" || ai === "custom") && (
        <div className={styles.customConfig}>
          {ai === "custom" && (
            <>
              <input type="text" placeholder="Base API URL (e.g. OpenAI Compatible)" 
                value={config.baseUrl ?? ""} disabled={disabled}
                onChange={(e) => onConfigChange({ baseUrl: e.target.value })} 
                className={styles.inputField} />
              <input type="text" placeholder="Model Name (e.g. gpt-4o-mini)" 
                value={config.modelName ?? ""} disabled={disabled}
                onChange={(e) => onConfigChange({ modelName: e.target.value })} 
                className={styles.inputField} />
            </>
          )}
          <input type="password" placeholder={`${capitalize(ai)} API Key`} 
            value={config.apiKey ?? ""} disabled={disabled}
            onChange={(e) => onConfigChange({ apiKey: e.target.value })} 
            className={styles.inputField} />
        </div>
      )}
    </div>
  );
}
