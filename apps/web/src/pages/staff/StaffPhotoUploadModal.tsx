import React, { useState, useRef, useCallback, useEffect } from "react";
import Cropper from "react-easy-crop";
import {
  UploadCloud,
  X,
  Camera,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Loader2,
  Sparkles,
  Crop,
  RotateCcw,
  ChevronLeft,
  ZoomIn,
  ZoomOut,
  UserCircle2,
} from "lucide-react";

interface Area {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface StaffPhotoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (dataUrl: string) => void;
  currentPhotoUrl?: string | null;
}

// ── Canvas crop helper ────────────────────────────────────────────────────────
async function getCroppedBlob(imageSrc: string, pixelCrop: Area): Promise<Blob | null> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", reject);
    img.src = imageSrc;
  });

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height,
  );

  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.92);
  });
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ── Component ─────────────────────────────────────────────────────────────────
export const StaffPhotoUploadModal: React.FC<StaffPhotoUploadModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<"select" | "crop" | "ready">("select");
  const [rawSrc, setRawSrc] = useState<string | null>(null);
  const [croppedSrc, setCroppedSrc] = useState<string | null>(null);

  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setStep("select");
      setRawSrc(null);
      setCroppedSrc(null);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
      setCroppedAreaPixels(null);
      setError(null);
      setSaving(false);
    }
  }, [isOpen]);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  if (!isOpen) return null;

  const loadFile = (selectedFile: File | null) => {
    setError(null);
    if (!selectedFile) return;
    const ext = (selectedFile.name || "").toLowerCase().split(".").pop() || "";
    const validExts = ["jpg", "jpeg", "png", "webp"];
    const isImageMime = selectedFile.type.startsWith("image/") || selectedFile.type === "";
    if (!validExts.includes(ext) && !isImageMime) {
      setError("Please select a valid image file (JPEG, PNG, or WebP).");
      return;
    }
    if (selectedFile.size === 0) {
      setError("The selected file appears empty. Please choose an actual image file.");
      return;
    }
    if (selectedFile.size > 5 * 1024 * 1024) {
      setError("Image file exceeds the 5 MB size limit.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setRawSrc(e.target.result as string);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setRotation(0);
        setStep("crop");
      } else {
        setError("Could not read image data. Please try a different file.");
      }
    };
    reader.onerror = () => setError("Could not read image file.");
    reader.readAsDataURL(selectedFile);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0] || null;
    e.target.value = "";
    loadFile(picked);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) loadFile(e.dataTransfer.files[0]);
  };

  const handleUseSamplePhoto = async () => {
    setError(null);
    try {
      const sampleUrls = [
        "/assets/images/student_id_photo.jpg",
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=500&fit=crop&auto=format",
      ];
      let blob: Blob | null = null;
      for (const url of sampleUrls) {
        try {
          const res = await fetch(url);
          if (res.ok) { blob = await res.blob(); break; }
        } catch { /* try next */ }
      }
      if (!blob) throw new Error("no sample found");
      const sampleFile = new File([blob], "officer_profile_photo.jpg", { type: "image/jpeg" });
      loadFile(sampleFile);
    } catch {
      setError("Could not load sample photograph.");
    }
  };

  const handleConfirmCrop = async () => {
    if (!rawSrc || !croppedAreaPixels) return;
    setError(null);
    try {
      const blob = await getCroppedBlob(rawSrc, croppedAreaPixels);
      if (!blob) throw new Error("Crop failed");
      const dataUrl = await blobToDataUrl(blob);
      setCroppedSrc(dataUrl);
      setStep("ready");
    } catch {
      setError("Could not apply crop. Please try again.");
    }
  };

  const handleSave = async () => {
    if (!croppedSrc) { setError("Please select and crop a photo first."); return; }
    setSaving(true);
    setError(null);
    try {
      // Simulate brief save delay for UX
      await new Promise((r) => setTimeout(r, 600));
      onSuccess(croppedSrc);
      onClose();
    } catch {
      setError("Failed to save photo. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="uni-modal-backdrop" role="dialog" aria-modal="true">
      <div
        className="uni-modal-container uni-photo-modal"
        style={{ maxWidth: step === "crop" ? "680px" : "520px" }}
      >
        {/* ── Header ───────────────────────────────────────────────────────── */}
        <div className="uni-modal-header">
          <div className="uni-modal-title-wrap">
            <div className="uni-modal-icon-badge" style={{ background: "#EFF6FF", color: "#1E60FF" }}>
              {step === "crop" ? <Crop size={20} /> : <Camera size={20} />}
            </div>
            <div>
              <h2 className="uni-modal-title">
                {step === "select"
                  ? "Update Officer Profile Photo"
                  : step === "crop"
                  ? "Crop & Frame Photo"
                  : "Confirm & Save"}
              </h2>
              <p className="uni-modal-sub">
                {step === "select"
                  ? "Upload a professional photograph for your reviewer account profile."
                  : step === "crop"
                  ? "Adjust the frame to centre your face. Zoom and rotate as needed."
                  : "Preview your cropped photo and save it to your profile."}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="uni-modal-close-btn"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* ── Body ─────────────────────────────────────────────────────────── */}
        <div className="uni-modal-body">
          {error && (
            <div
              role="alert"
              style={{
                display: "flex", gap: 8, alignItems: "flex-start",
                background: "#fef2f2", border: "1px solid #fecaca",
                padding: "10px 14px", borderRadius: 8, color: "#dc2626",
                fontSize: 13, marginBottom: 14,
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{error}</span>
            </div>
          )}

          {/* ── STEP: SELECT ─────────────────────────────────────────────── */}
          {step === "select" && (
            <>
              {/* Guidelines */}
              <div className="uni-photo-guidelines-box">
                <div className="uni-guidelines-header">
                  <HelpCircle size={16} />
                  <span>Profile Photo Guidelines</span>
                </div>
                <ul className="uni-guidelines-list">
                  <li><CheckCircle2 size={13} color="#059669" /><span>Professional portrait — plain or neutral background</span></li>
                  <li><CheckCircle2 size={13} color="#059669" /><span>Face clearly visible and centred in the frame</span></li>
                  <li><CheckCircle2 size={13} color="#059669" /><span>No sunglasses or obstructions</span></li>
                  <li><CheckCircle2 size={13} color="#059669" /><span>JPEG, PNG, or WebP — max 5 MB</span></li>
                </ul>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "14px 0 10px" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
                  Select Photograph
                </span>
                <button
                  type="button"
                  onClick={handleUseSamplePhoto}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    background: "#EFF6FF", color: "#1E60FF",
                    border: "1px solid #BFDBFE", borderRadius: 6,
                    padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer",
                  }}
                >
                  <Sparkles size={13} />
                  <span>Use Sample Photo</span>
                </button>
              </div>

              {/* Dropzone */}
              <div
                className={`uni-photo-dropzone ${dragActive ? "drag-active" : ""}`}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  cursor: "pointer", border: "2px dashed #CBD5E1", borderRadius: 14,
                  padding: "32px 20px", background: "#FFFFFF",
                  display: "flex", flexDirection: "column", alignItems: "center",
                  justifyContent: "center", minHeight: 160, transition: "all 0.15s ease",
                  ...(dragActive ? { borderColor: "#1E60FF", background: "#EFF6FF" } : {}),
                }}
              >
                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileInput} />
                <div style={{
                  width: 52, height: 52, borderRadius: "50%", background: "#EFF6FF", color: "#1E60FF",
                  display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10,
                }}>
                  <UserCircle2 size={28} />
                </div>
                <div style={{ fontSize: 14, fontWeight: 750, color: "#0F172A" }}>
                  Click to browse or drag &amp; drop
                </div>
                <div style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>
                  JPEG, PNG, or WebP · up to 5 MB
                </div>
              </div>
            </>
          )}

          {/* ── STEP: CROP ───────────────────────────────────────────────── */}
          {step === "crop" && rawSrc && (
            <>
              <div style={{ position: "relative", width: "100%", height: 360, background: "#0F172A", borderRadius: 12, overflow: "hidden" }}>
                <Cropper
                  image={rawSrc}
                  crop={crop}
                  zoom={zoom}
                  rotation={rotation}
                  aspect={1}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                  style={{
                    containerStyle: { borderRadius: 12 },
                    cropAreaStyle: { border: "2px solid #1E60FF" },
                  }}
                />
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 14, alignItems: "center" }}>
                {/* Zoom slider */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 180 }}>
                  <ZoomOut size={16} color="#64748B" />
                  <input
                    type="range" min={1} max={3} step={0.05} value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    style={{ flex: 1, accentColor: "#1E60FF" }} aria-label="Zoom"
                  />
                  <ZoomIn size={16} color="#64748B" />
                  <span style={{ fontSize: 11, color: "#64748B", minWidth: 32 }}>{zoom.toFixed(1)}×</span>
                </div>

                <div style={{ display: "flex", gap: 6 }}>
                  <button type="button" onClick={() => setRotation((r) => r - 90)}
                    style={{ display: "flex", alignItems: "center", gap: 4, background: "#F1F5F9", border: "1px solid #E2E8F0", borderRadius: 6, padding: "6px 10px", fontSize: 12, color: "#475569", cursor: "pointer" }}>
                    <RotateCcw size={14} /><span>Rotate</span>
                  </button>
                  <button type="button" onClick={() => { setRawSrc(null); setStep("select"); }}
                    style={{ display: "flex", alignItems: "center", gap: 4, background: "#F1F5F9", border: "1px solid #E2E8F0", borderRadius: 6, padding: "6px 10px", fontSize: 12, color: "#475569", cursor: "pointer" }}>
                    <ChevronLeft size={14} /><span>Change photo</span>
                  </button>
                </div>
              </div>

              <p style={{ fontSize: 12, color: "#64748B", marginTop: 10, textAlign: "center" }}>
                Drag to reposition · Scroll or use slider to zoom · Square crop (1:1)
              </p>
            </>
          )}

          {/* ── STEP: READY ──────────────────────────────────────────────── */}
          {step === "ready" && croppedSrc && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
              {/* Preview */}
              <div style={{
                width: 120, height: 120, borderRadius: "50%", overflow: "hidden",
                border: "3px solid #1E60FF", boxShadow: "0 8px 24px rgba(30,96,255,0.18)",
              }}>
                <img src={croppedSrc} alt="Officer profile preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>

              <div style={{
                display: "flex", alignItems: "center", gap: 8, padding: "8px 16px",
                background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: 8,
                fontSize: 12.5, color: "#065F46",
              }}>
                <CheckCircle2 size={16} color="#059669" />
                <span><strong>Photo cropped and ready.</strong> Click Save Profile Photo below.</span>
              </div>

              <button type="button" onClick={() => setStep("crop")}
                style={{ background: "none", border: "none", color: "#1E60FF", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, padding: 0 }}>
                <Crop size={13} /><span>Re-adjust crop</span>
              </button>
            </div>
          )}
        </div>

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <div className="uni-modal-footer">
          <button
            type="button"
            className="uni-btn-secondary"
            onClick={step === "crop" ? () => setStep("select") : onClose}
            disabled={saving}
          >
            {step === "crop" ? "Back" : "Cancel"}
          </button>

          {step === "select" && (
            <button type="button" className="uni-btn-primary" onClick={() => fileInputRef.current?.click()}>
              <UploadCloud size={16} /><span>Browse Photo</span>
            </button>
          )}

          {step === "crop" && (
            <button type="button" className="uni-btn-primary" onClick={handleConfirmCrop}>
              <Crop size={16} /><span>Confirm Crop</span>
            </button>
          )}

          {step === "ready" && (
            <button type="button" className="uni-btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? (
                <><Loader2 size={16} className="animate-spin" /><span>Saving...</span></>
              ) : (
                <><Camera size={16} /><span>Save Profile Photo</span></>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
