import { useRef, useState, type DragEvent, type ChangeEvent } from "react";
import { isValidFileType, formatFileSize } from "../../utils/helpers";
import styles from "./FileUploader.module.css";

interface FileUploaderProps { onFile: (file: File) => void; }

export function FileUploader({ onFile }: FileUploaderProps) {
  const inputRef            = useRef<HTMLInputElement>(null);
  const [drag, setDrag]     = useState(false);
  const [picked, setPicked] = useState<File | null>(null);
  const [error, setError]   = useState<string | null>(null);

  function handle(file?: File | null) {
    if (!file) return;
    if (!isValidFileType(file)) { setError("Only PDF, JPG, PNG, or WEBP allowed."); return; }
    setError(null); setPicked(file); onFile(file);
  }

  return (
    <div
      className={`${styles.zone} ${drag ? styles.drag : ""} ${picked ? styles.picked : ""}`}
      onDragOver={(e: DragEvent) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e: DragEvent)     => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files[0]); }}
      onClick={() => inputRef.current?.click()}
      role="button" tabIndex={0} aria-label="Upload document"
    >
      <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp"
        style={{ display:"none" }} onChange={(e: ChangeEvent<HTMLInputElement>) => handle(e.target.files?.[0])} />

      {picked ? (
        <div className={styles.fileInfo}>
          <span className={styles.fileIcon}>📄</span>
          <div>
            <p className={styles.fileName}>{picked.name}</p>
            <p className={styles.fileMeta}>{formatFileSize(picked.size)}</p>
          </div>
          <span className={styles.swap}>↻ Change</span>
        </div>
      ) : (
        <>
          <div className={styles.icon}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </div>
          <p className={styles.label}>Drop a document here, or <span>browse</span></p>
          <p className={styles.hint}>PDF · JPG · PNG · WEBP</p>
        </>
      )}
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
