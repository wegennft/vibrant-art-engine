import { useCallback, useState } from "react";
import { Upload } from "lucide-react";

interface ImageUploaderProps {
  onImagesSelected: (files: File[]) => void;
  isProcessing: boolean;
}

const ImageUploader = ({ onImagesSelected, isProcessing }: ImageUploaderProps) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith("image/")
      );
      if (files.length > 0) onImagesSelected(files);
    },
    [onImagesSelected]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []).filter((f) =>
        f.type.startsWith("image/")
      );
      if (files.length > 0) onImagesSelected(files);
    },
    [onImagesSelected]
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      className={`relative border-2 border-dashed rounded-lg p-12 text-center transition-all duration-300 cursor-pointer ${
        isDragOver
          ? "border-primary bg-primary/10 scale-[1.02]"
          : "border-border hover:border-primary/50 hover:bg-muted/30"
      } ${isProcessing ? "pointer-events-none opacity-50" : ""}`}
    >
      <input
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileInput}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        disabled={isProcessing}
      />
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Upload className="w-8 h-8 text-primary" />
        </div>
        <div>
          <p className="text-lg font-semibold text-foreground">
            Drop your NFT trait images here
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            or click to browse • PNG, JPG, WEBP supported
          </p>
        </div>
      </div>
    </div>
  );
};

export default ImageUploader;
