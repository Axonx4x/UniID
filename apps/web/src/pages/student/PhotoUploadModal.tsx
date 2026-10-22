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
} from "lucide-react";
import { apiClient, ApiError } from "@/services/apiClient";

interface Area {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PhotoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (photoUrl: string) => void;
  currentPhotoUrl?: string | null;
}

// ── Canvas crop helper ───────────────────────────────────────────────────────
async function getCroppedBlob(
  imageSrc: string,
  pixelCrop: Area
): Promise<Blob | null> {
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
    pixelCrop.height
  );

  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.95);
  });
}

// ── Component ─────────────────────────────────────────────────────────────────
export const PhotoUploadModal: React.FC<PhotoUploadModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  // currentPhotoUrl is accepted as a prop for API compatibility but the modal
  // always starts fresh — no pre-filled state from a previous photo.
}) => {
  // Step: "select" | "crop" | "ready"
  const [step, setStep] = useState<"select" | "crop" | "ready">("select");

  const [rawSrc, setRawSrc] = useState<string | null>(null);         // src fed into Cropper
  const [croppedSrc, setCroppedSrc] = useState<string | null>(null); // final preview after crop
  const [croppedFile, setCroppedFile] = useState<File | null>(null); // File ready to upload

  // Cropper state
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset on open/close
  useEffect(() => {
    if (isOpen) {
      setStep("select");
      setRawSrc(null);
      setCroppedSrc(null);
      setCroppedFile(null);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
      setCroppedAreaPixels(null);
      setError(null);
      setUploading(false);
    }
  }, [isOpen]);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  if (!isOpen) return null;

  const loadFile = (selectedFile: File | null) => {
    setError(null);
    if (!selectedFile) return;

    // Validate extension / MIME
    const ext = (selectedFile.name || "").toLowerCase().split(".").pop() || "";
    const validExts = ["jpg", "jpeg", "png", "webp"];
    const isImageMime =
      selectedFile.type.startsWith("image/") || selectedFile.type === "";

    if (!validExts.includes(ext) && !isImageMime) {
      setError("Please select a valid image file (JPEG, PNG, or WebP).");
      return;
    }
    if (selectedFile.size === 0) {
      setError(
        "The selected file is empty (0 KB). This may be a shortcut. Please select the actual image file."
      );
      return;
    }
    if (selectedFile.size > 5 * 1024 * 1024) {
      setError("Image file size exceeds the 5 MB limit.");
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
    reader.onerror = () =>
      setError("Could not read image file. Please try a different file.");
    reader.readAsDataURL(selectedFile);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0] || null;
    e.target.value = ""; // allow re-selecting same file
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
      const res = await fetch("/assets/images/student_id_photo.jpg");
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const sampleFile = new File([blob], "official_student_photo.jpg", {
        type: "image/jpeg",
      });
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
      const croppedUrl = URL.createObjectURL(blob);
      const file = new File([blob], "student_id_photo_cropped.jpg", {
        type: "image/jpeg",
      });
      setCroppedSrc(croppedUrl);
      setCroppedFile(file);
      setStep("ready");
    } catch {
      setError("Could not apply crop. Please try again.");
    }
  };

  const handleUpload = async () => {
    if (!croppedFile) {
      setError(
        "Please select and crop a photo first."
      );
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const res = await apiClient.uploadStudentPhoto(croppedFile);
      onSuccess(res.photo_url);
      onClose();
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : "Failed to upload photo. Please try again.";
      setError(msg);
    } finally {
      setUploading(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="uni-modal-backdrop" role="dialog" aria-modal="true">
      <div
        className="uni-modal-container uni-photo-modal"
        style={{ maxWidth: step === "crop" ? "680px" : "520px" }}
      >
        {/* Header */}
        <div className="uni-modal-header">
          <div className="uni-modal-title-wrap">
            <div className="uni-modal-icon-badge">
              {step === "crop" ? <Crop size={20} /> : <Camera size={20} />}
            </div>
            <div>
              <h2 className="uni-modal-title">
                {step === "select"
                  ? "Upload Student Photograph"
                  : step === "crop"
                  ? "Crop & Frame Photo"
                  : "Confirm & Activate"}
              </h2>
              <p className="uni-modal-sub">
                {step === "select"
                  ? "Your photograph is required to issue and activate your official Digital Student ID."
                  : step === "crop"
                  ? "Adjust the frame to centre your face. Zoom and rotate as needed."
                  : "Preview your cropped photograph and upload to activate your ID."}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="uni-modal-close-btn"
            onClick={onClose}
            disabled={uploading}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="uni-modal-body">
          {error && (
            <div
              role="alert"
              style={{
                display: "flex",
                gap: "8px",
                alignItems: "flex-start",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                padding: "10px 14px",
                borderRadius: "8px",
                color: "#dc2626",
                fontSize: "13px",
                marginBottom: "14px",
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{error}</span>
            </div>
          )}

          {/* ── STEP: SELECT ──────────────────────────────────────────────── */}
          {step === "select" && (
            <>
              {/* Guidelines */}
              <div className="uni-photo-guidelines-box">
                <div className="uni-guidelines-header">
                  <HelpCircle size={16} />
                  <span>Photograph Requirements</span>
                </div>
                <ul className="uni-guidelines-list">
                  <li>
                    <CheckCircle2 size={13} color="#059669" />
                    <span>Plain light or white background</span>
                  </li>
                  <li>
                    <CheckCircle2 size={13} color="#059669" />
                    <span>Face centered, looking directly into the camera</span>
                  </li>
                  <li>
                    <CheckCircle2 size={13} color="#059669" />
                    <span>No sunglasses or covering of facial features</span>
                  </li>
                  <li>
                    <CheckCircle2 size={13} color="#059669" />
                    <span>JPEG, PNG, or WebP up to 5 MB</span>
                  </li>
                </ul>
              </div>

              {/* Sample Button */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  margin: "14px 0 10px",
                }}
              >
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 750,
                    color: "#475569",
                    textTransform: "uppercase",
                  }}
                >
                  Select Photograph
                </span>
                <button
                  type="button"
                  onClick={handleUseSamplePhoto}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    background: "#eff6ff",
                    color: "#1e60ff",
                    border: "1px solid #bfdbfe",
                    borderRadius: "6px",
                    padding: "5px 12px",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  <Sparkles size={13} />
                  <span>Use Sample Student Photo</span>
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
                  cursor: "pointer",
                  border: "2px dashed #cbd5e1",
                  borderRadius: "14px",
                  padding: "32px 20px",
                  background: "#ffffff",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: "160px",
                  transition: "all 0.15s ease",
                  ...(dragActive
                    ? { borderColor: "#1e60ff", background: "#eff6ff" }
                    : {}),
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleFileInput}
                />
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: "50%",
                    background: "#eff6ff",
                    color: "#1e60ff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 10,
                  }}
                >
                  <UploadCloud size={28} />
                </div>
                <div style={{ fontSize: "14px", fontWeight: 750, color: "#0f172a" }}>
                  Click to browse or drag &amp; drop photograph
                </div>
                <div style={{ fontSize: "12px", color: "#64748b", marginTop: 4 }}>
                  Supports JPEG, PNG, or WebP up to 5 MB
                </div>
              </div>
            </>
          )}

          {/* ── STEP: CROP ────────────────────────────────────────────────── */}
          {step === "crop" && rawSrc && (
            <>
              {/* Crop canvas */}
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  height: "360px",
                  background: "#0f172a",
                  borderRadius: "12px",
                  overflow: "hidden",
                }}
              >
                <Cropper
                  image={rawSrc}
                  crop={crop}
                  zoom={zoom}
                  rotation={rotation}
                  aspect={3 / 4}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                  style={{
                    containerStyle: { borderRadius: "12px" },
                    cropAreaStyle: { border: "2px solid #1e60ff" },
                  }}
                />
              </div>

              {/* Crop controls */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "12px",
                  marginTop: "14px",
                  alignItems: "center",
                }}
              >
                {/* Zoom */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    flex: 1,
                    minWidth: "180px",
                  }}
                >
                  <ZoomOut size={16} color="#64748b" />
                  <input
                    type="range"
                    min={1}
                    max={3}
                    step={0.05}
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    style={{ flex: 1, accentColor: "#1e60ff" }}
                    aria-label="Zoom"
                  />
                  <ZoomIn size={16} color="#64748b" />
                  <span
                    style={{
                      fontSize: "11px",
                      color: "#64748b",
                      minWidth: "32px",
                    }}
                  >
                    {zoom.toFixed(1)}×
                  </span>
                </div>

                {/* Rotation */}
                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    type="button"
                    onClick={() => setRotation((r) => r - 90)}
                    title="Rotate left 90°"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      background: "#f1f5f9",
                      border: "1px solid #e2e8f0",
                      borderRadius: "6px",
                      padding: "6px 10px",
                      fontSize: "12px",
                      color: "#475569",
                      cursor: "pointer",
                    }}
                  >
                    <RotateCcw size={14} />
                    <span>Rotate</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRawSrc(null);
                      setStep("select");
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      background: "#f1f5f9",
                      border: "1px solid #e2e8f0",
                      borderRadius: "6px",
                      padding: "6px 10px",
                      fontSize: "12px",
                      color: "#475569",
                      cursor: "pointer",
                    }}
                  >
                    <ChevronLeft size={14} />
                    <span>Change photo</span>
                  </button>
                </div>
              </div>

              <p
                style={{
                  fontSize: "12px",
                  color: "#64748b",
                  marginTop: "10px",
                  textAlign: "center",
                }}
              >
                Drag to reposition · Scroll or use slider to zoom · Crop area is{" "}
                <strong>3:4 portrait</strong> (ideal for student ID cards)
              </p>
            </>
          )}

          {/* ── STEP: READY ──────────────────────────────────────────────── */}
          {step === "ready" && croppedSrc && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "14px",
              }}
            >
              {/* Preview */}
              <div
                style={{
                  width: "130px",
                  height: "165px",
                  borderRadius: "12px",
                  overflow: "hidden",
                  border: "3px solid #1e60ff",
                  boxShadow: "0 8px 24px rgba(30,96,255,0.18)",
                  position: "relative",
                }}
              >
                <img
                  src={croppedSrc}
                  alt="Cropped student preview"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: "rgba(15,23,42,0.8)",
                    color: "#fff",
                    fontSize: "9px",
                    fontWeight: 800,
                    textAlign: "center",
                    padding: "4px 0",
                    letterSpacing: "0.5px",
                  }}
                >
                  ID PREVIEW
                </div>
              </div>

              {/* Status */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 16px",
                  background: "#ecfdf5",
                  border: "1px solid #a7f3d0",
                  borderRadius: "8px",
                  fontSize: "12.5px",
                  color: "#065f46",
                }}
              >
                <CheckCircle2 size={16} color="#059669" />
                <span>
                  <strong>Photo cropped and ready.</strong> Click Upload &amp;
                  Activate ID below.
                </span>
              </div>

              {/* Re-crop link */}
              <button
                type="button"
                onClick={() => setStep("crop")}
                style={{
                  background: "none",
                  border: "none",
                  color: "#1e60ff",
                  fontSize: "12px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: 0,
                }}
              >
                <Crop size={13} />
                <span>Re-adjust crop</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="uni-modal-footer">
          <button
            type="button"
            className="uni-btn-secondary"
            onClick={step === "crop" ? () => setStep("select") : onClose}
            disabled={uploading}
          >
            {step === "crop" ? "Back" : "Cancel"}
          </button>

          {step === "select" && (
            <button
              type="button"
              className="uni-btn-primary"
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera size={16} />
              <span>Browse Photo</span>
            </button>
          )}

          {step === "crop" && (
            <button
              type="button"
              className="uni-btn-primary"
              onClick={handleConfirmCrop}
            >
              <Crop size={16} />
              <span>Confirm Crop</span>
            </button>
          )}

          {step === "ready" && (
            <button
              type="button"
              className="uni-btn-primary"
              onClick={handleUpload}
              disabled={!croppedFile || uploading}
            >
              {uploading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Uploading &amp; Activating...</span>
                </>
              ) : (
                <>
                  <UploadCloud size={16} />
                  <span>Upload &amp; Activate ID</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
