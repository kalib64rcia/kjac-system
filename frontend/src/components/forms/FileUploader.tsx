import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { FieldError, Label } from "@/components/ui/input";

export const RECEIPT_ACCEPT = ["image/jpeg", "image/png", "image/webp", "image/heic"];
export const MAX_FILE_MB = 3;

export function validateReceiptFile(file: File): string | null {
  if (!RECEIPT_ACCEPT.includes(file.type)) {
    return "Invalid file format. Use JPG, PNG, WebP, or HEIC.";
  }
  if (file.size > MAX_FILE_MB * 1024 * 1024) {
    return "Image must be smaller than 3MB.";
  }
  return null;
}

/** Reusable receipt/image uploader with preview + validation. */
export function FileUploader({
  label,
  file,
  error,
  onSelect,
  onClear,
}: {
  label: string;
  file: File | null;
  error?: string;
  onSelect: (file: File) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const pick = (f: File | undefined) => {
    if (!f) return;
    const problem = validateReceiptFile(f);
    if (problem) {
      setLocalError(problem);
      return;
    }
    setLocalError(null);
    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(f));
    onSelect(f);
  };

  return (
    <div>
      <Label>{label}</Label>
      <input
        ref={inputRef}
        type="file"
        accept={RECEIPT_ACCEPT.join(",")}
        className="sr-only"
        aria-label={label}
        onChange={(e) => pick(e.target.files?.[0])}
      />
      {!file ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex min-h-[88px] w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-4 text-sm font-medium text-gray-600 transition-colors hover:border-primary-400 hover:bg-primary-50"
        >
          <ImagePlus size={22} aria-hidden="true" />
          Choose file or take a photo
          <span className="text-xs font-normal text-gray-500">JPG, PNG, WebP, HEIC · max 3MB</span>
        </button>
      ) : (
        <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3">
          {preview && (
            <img src={preview} alt="Receipt preview" className="h-16 w-16 rounded-md object-cover" />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-gray-900">{file.name}</p>
            <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(0)} KB</p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
              setPreview(null);
              onClear();
              if (inputRef.current) inputRef.current.value = "";
            }}
            aria-label="Remove file"
            className="flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-md text-gray-500 hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>
      )}
      <FieldError message={error ?? localError ?? undefined} />
    </div>
  );
}
