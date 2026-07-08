import { useCallback, useRef, useState } from "react";
import { FileSpreadsheet, Upload } from "lucide-react";
import { cn } from "../utils/cn";
import { validateCsvFile } from "../utils/fileValidation";
import { Button } from "./Button";

interface CsvUploadProps {
  onFileSelect: (file: File) => void;
  isLoading?: boolean;
  label?: string;
  hint?: string;
}

export function CsvUpload({
  onFileSelect,
  isLoading = false,
  label = "Upload CSV",
  hint = "Drag & drop a Typeform CSV export, or click to browse",
}: CsvUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const processFile = useCallback(
    (file: File | undefined) => {
      if (!file) {
        return;
      }

      const error = validateCsvFile(file);
      if (error) {
        setValidationError(error);
        return;
      }

      setValidationError(null);
      onFileSelect(file);
    },
    [onFileSelect],
  );

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    processFile(event.dataTransfer.files[0]);
  }

  return (
    <div className="space-y-2">
      <input
        accept=".csv,text/csv"
        className="hidden"
        disabled={isLoading}
        onChange={(event) => {
          processFile(event.target.files?.[0]);
          event.target.value = "";
        }}
        ref={inputRef}
        type="file"
      />

      <div
        className={cn(
          "rounded-2xl border-2 border-dashed p-6 transition",
          isDragging
            ? "border-slate-950 bg-slate-100 dark:border-white dark:bg-slate-900"
            : "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50",
          isLoading && "pointer-events-none opacity-60",
        )}
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragging(false);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center text-center sm:flex-row sm:text-left">
          <div className="rounded-2xl bg-white p-3 text-slate-600 shadow-sm dark:bg-slate-950 dark:text-slate-300">
            <FileSpreadsheet size={24} />
          </div>
          <div className="mt-4 sm:mt-0 sm:ml-4 sm:flex-1">
            <p className="text-sm font-semibold text-slate-950 dark:text-white">{hint}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Accepts .csv files up to 10 MB. Uploading replaces the current dataset.
            </p>
          </div>
          <Button
            className="mt-4 sm:mt-0 sm:ml-4"
            isLoading={isLoading}
            onClick={() => inputRef.current?.click()}
            type="button"
          >
            <Upload aria-hidden="true" size={16} />
            {label}
          </Button>
        </div>
      </div>

      {validationError ? (
        <p className="text-sm font-medium text-red-600 dark:text-red-400" role="alert">
          {validationError}
        </p>
      ) : null}
    </div>
  );
}
