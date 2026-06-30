import { useRef, useState } from "react";
import { api } from "../lib/api";

interface PhotoUploadProps {
  asanaId: number;
  onUploaded: () => void;
}

export function PhotoUpload({ asanaId, onUploaded }: PhotoUploadProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError("");
    setSuccess(false);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("asana_id", String(asanaId));
      formData.append("file", file);
      await api.post("/photos/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSuccess(true);
      setFile(null);
      setPreview(null);
      if (fileInput.current) fileInput.current.value = "";
      onUploaded();
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    setFile(null);
    setPreview(null);
    setError("");
    if (fileInput.current) fileInput.current.value = "";
  };

  return (
    <div className="bg-white rounded-xl border border-sand-100 p-4">
      <h3 className="text-sm font-medium text-slate-600 mb-2">Upload Photo</h3>
      <input
        ref={fileInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleSelect}
        className="block w-full text-sm text-slate-500 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-sage-100 file:text-sage-700 hover:file:bg-sage-200"
      />
      {preview && (
        <div className="mt-3 flex items-start gap-3">
          <img src={preview} alt="Preview" className="w-24 h-24 object-cover rounded" />
          <div className="flex flex-col gap-2">
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="bg-sage-500 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
            >
              {uploading ? "Uploading..." : "Upload"}
            </button>
            <button
              onClick={handleCancel}
              disabled={uploading}
              className="text-slate-500 text-sm hover:underline"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {error && <p className="text-red-600 text-xs mt-2">{error}</p>}
      {success && <p className="text-green-600 text-xs mt-2">Photo uploaded successfully.</p>}
    </div>
  );
}
