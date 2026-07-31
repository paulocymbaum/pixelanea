import { useEffect, useRef, useState, type DragEvent } from "react";
import { ImagePlus } from "lucide-react";
import { copy } from "@/content/copy";
import { cn } from "@/lib/cn";
import { ACCEPTED_IMAGE_TYPES } from "./fileUtils";

type FileDropStepProps = {
  file: File | null;
  error: string | null;
  onFileSelected: (file: File) => void;
};

export function FileDropStep({
  file,
  error,
  onFileSelected,
}: FileDropStepProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const handleFile = (selected: File | undefined) => {
    if (!selected) {
      return;
    }
    onFileSelected(selected);
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
    handleFile(event.dataTransfer.files[0]);
  };

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={cn(
          "flex min-h-48 flex-col items-center justify-center gap-3 rounded-panel border-2 border-dashed border-border bg-elevated p-8 text-center transition-colors",
          isDragging && "border-accent bg-accent-muted",
        )}
      >
        {previewUrl ? (
          <>
            <img
              src={previewUrl}
              alt={copy.importWizardDropPreviewLabel}
              className="max-h-56 max-w-full rounded-md object-contain"
            />
            <span className="text-sm font-medium text-accent">{file?.name}</span>
            <span className="text-sm text-secondary">
              {copy.importWizardDropHint}
            </span>
          </>
        ) : (
          <>
            <ImagePlus className="h-10 w-10 text-accent" strokeWidth={1.5} />
            <span className="text-base font-medium text-primary">
              {copy.importWizardDropHint}
            </span>
            <span className="text-sm text-secondary">
              {copy.importWizardDropAccepted}
            </span>
          </>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        className="sr-only"
        onChange={(event) => handleFile(event.target.files?.[0])}
      />
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
