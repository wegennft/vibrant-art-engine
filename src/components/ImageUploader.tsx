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
      className={`relative border-2 border-dashed rounded-xl p-14 text-center transition-all duration-300 cursor-pointer ${
        isDragOver
          ? "border-accent bg-accent/5 scale-[1.02] shadow-[0_0_30px_hsl(45,95%,55%,0.15)]"
          : "border-primary/30 hover:border-primary/60 hover:bg-primary/5 hover:shadow-[0_0_20px_hsl(270,85%,55%,0.1)]"
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
      <div className="flex flex-col items-center gap-5">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center border border-primary/20">
          <Upload className="w-10 h-10 text-accent" />
        </div>
        <div>
          <p
            className="text-xl font-bold tracking-wide"
            style={{
              fontFamily: "'Permanent Marker', cursive",
              color: 'hsl(45, 95%, 65%)',
              textShadow: '1px 1px 0 hsl(270, 85%, 30%, 0.3)',
            }}
          >
            DROP YOUR TRAITS HERE
          </p>
          <p
            className="text-base mt-2"
            style={{
              fontFamily: "'Caveat', cursive",
              color: 'hsl(270, 30%, 50%)',
            }}
          >
            or click to browse • PNG, JPG, WEBP supported
          </p>
        </div>
      </div>
    </div>
  );
};

export default ImageUploader;
