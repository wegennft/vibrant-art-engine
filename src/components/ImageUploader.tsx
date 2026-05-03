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
      className={`relative border-2 border-dashed p-14 text-center transition-all duration-300 cursor-pointer carbon-surface ${
        isDragOver
          ? "border-accent bg-accent/5 scale-[1.01] shadow-[0_0_30px_hsl(45,95%,55%,0.15)]"
          : "border-primary/30 hover:border-primary/60 hover:shadow-[0_0_20px_hsl(270,85%,55%,0.15)]"
      } ${isProcessing ? "pointer-events-none opacity-50" : ""}`}
      style={{
        clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))',
      }}
    >
      <input
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileInput}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        disabled={isProcessing}
      />
      <div className="flex flex-col items-center gap-5">
        <div
          className="w-16 h-16 flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, hsl(270 85% 55% / 0.2), hsl(45 95% 55% / 0.2))',
            border: '2px solid hsl(270 85% 55% / 0.3)',
            clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
          }}
        >
          <Upload className="w-8 h-8 text-accent" />
        </div>
        <div>
          <p
            className="text-xl uppercase tracking-widest text-gold-metallic"
            style={{ fontFamily: "'Russo One', sans-serif" }}
          >
            Drop Your Traits Here
          </p>
          <p
            className="text-sm mt-2 uppercase tracking-[0.2em] text-muted-foreground"
            style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.7rem' }}
          >
            Or click to browse • PNG, JPG, WEBP
          </p>
        </div>
      </div>
    </div>
  );
};

export default ImageUploader;
