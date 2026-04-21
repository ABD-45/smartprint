import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";

const ACCEPTED = {
  "application/pdf": [".pdf"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "text/plain": [".txt"],
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
};

const formatSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const FileUploader = ({ onFileSelect, file, onRemove }) => {
  const onDrop = useCallback(
    (accepted) => {
      if (accepted[0]) onFileSelect(accepted[0]);
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: ACCEPTED,
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024, // 50MB
  });

  const rejection = fileRejections[0];

  if (file) {
    return (
      <div className="file-preview">
        <div className="file-preview-info">
          <div className="file-preview-icon">📄</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{file.name}</div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              {formatSize(file.size)} · {file.type || "Unknown type"}
            </div>
          </div>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          onClick={onRemove}
          type="button"
          id="remove-file-btn"
        >
          ✕ Remove
        </button>
      </div>
    );
  }

  return (
    <div>
      <div
        {...getRootProps()}
        className={`file-drop-zone ${isDragActive ? "drag-active" : ""}`}
        id="file-drop-zone"
      >
        <input {...getInputProps()} />
        <div className="drop-icon">📄</div>
        <div>
          <p style={{ color: "var(--text-primary)", fontWeight: 600, marginBottom: 4 }}>
            {isDragActive ? "Drop your file here!" : "Drag & drop your file here"}
          </p>
          <p style={{ fontSize: "0.85rem" }}>or click to browse · PDF, DOC, DOCX, TXT, PNG, JPG</p>
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 4 }}>
            Max size: 50 MB
          </p>
        </div>
      </div>
      {rejection && (
        <div className="alert alert-error" style={{ marginTop: 12 }}>
          ⚠️ {rejection.errors[0]?.message || "File not accepted"}
        </div>
      )}
    </div>
  );
};
