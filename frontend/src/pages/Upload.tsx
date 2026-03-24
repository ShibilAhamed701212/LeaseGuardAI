import { useState, useCallback, useRef } from "react";
import { useNavigate }    from "react-router-dom";
import { FileUploader }   from "../components/upload/FileUploader";
import { ModelSelector, type OcrEngine, type AiModel, type AiConfig } from "../components/upload/ModelSelector";
import { StatusBar }      from "../components/shared/StatusBar";
import { Loader }         from "../components/shared/Loader";
import { useUpload }      from "../hooks/useUpload";
import { useProcess }     from "../hooks/useProcess";
import styles from "./Upload.module.css";

export function Upload() {
  const navigate   = useNavigate();
  const submitting = useRef(false);

  const [file,  setFile]  = useState<File | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [ocr,   setOcr]   = useState<OcrEngine>("paddle");
  const [ai,    setAi]    = useState<AiModel>("ollama");
  const [config, setConfig] = useState<AiConfig>({});
  const [step,  setStep]  = useState("idle");

  const onComplete = useCallback(() => {
    submitting.current = false;
    if (jobId) navigate(`/result/${jobId}`);
  }, [jobId, navigate]);

  const { upload,  loading: uploading,  error: upErr  } = useUpload();
  const { trigger, loading: processing, error: procErr } = useProcess(onComplete);

  const isRunning = uploading || processing;
  const error     = upErr || procErr;

  const handleConfigChange = (updates: Partial<AiConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  async function handleStart() {
    if (!file || submitting.current) return;
    submitting.current = true;
    setStep("uploading");
    const id = await upload(file);
    if (!id) { submitting.current = false; return; }
    setJobId(id);
    setStep("processing");
    await trigger(id, ocr, ai, config);
  }

  return (
    <main className="page">
      <div className={styles.header}>
        <h1 className={styles.title}>Analyse Document</h1>
        <p className={styles.sub}>Upload a contract and choose your processing engines.</p>
      </div>
      {step !== "idle" && <StatusBar status={step} />}
      {!isRunning ? (
        <div className={styles.form}>
          <FileUploader onFile={setFile} />
          <ModelSelector ocr={ocr} ai={ai} config={config} onConfigChange={handleConfigChange} onOcr={setOcr} onAi={setAi} disabled={isRunning} />
          {error && <div className={styles.error}><span>&#9888;</span> {error}</div>}
          <button className="btn-primary" onClick={handleStart} disabled={!file || isRunning}>
            {error ? "Retry Analysis" : "Start Analysis"}
          </button>
        </div>
      ) : (
        <div className={styles.loader}>
          <Loader size="lg" cycling={processing} message={uploading ? "Uploading document..." : undefined} />
        </div>
      )}
    </main>
  );
}