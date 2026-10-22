import React, { useEffect, useRef, useState } from "react";
import { Camera, AlertCircle, Upload, X } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/common/Button";

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (decodedText: string) => void;
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({ isOpen, onClose, onScan }) => {
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(true);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const scannerId = "qr-video-reader";
    const html5QrCode = new Html5Qrcode(scannerId);
    scannerRef.current = html5QrCode;
    setIsStarting(true);
    setError(null);

    const startScanner = async () => {
      try {
        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            if (!isMounted) return;
            // Successfully read barcode
            html5QrCode.stop().then(() => {
              html5QrCode.clear();
              onScan(decodedText);
              onClose();
            }).catch(() => {
              onScan(decodedText);
              onClose();
            });
          },
          () => {
            // Frame scanned with no QR code detected - ignore ordinary frame drops
          }
        );
        if (isMounted) {
          setIsStarting(false);
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        setIsStarting(false);
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes("NotAllowedError") || message.includes("Permission denied")) {
          setError("Camera permission was denied. Please allow camera permissions in your browser or enter the code manually.");
        } else if (message.includes("NotFoundError") || message.includes("DevicesNotFoundError")) {
          setError("No video camera was detected on this device. You can upload an image or enter the code manually.");
        } else {
          setError(`Camera scanner unavailable: ${message}. You can upload an image or enter the reference manually.`);
        }
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          scannerRef.current.stop().then(() => {
            scannerRef.current?.clear();
          }).catch(() => {});
        } else {
          try {
            scannerRef.current.clear();
          } catch {
            // Scanner already cleared or unmounted
          }
        }
      }
    };
  }, [isOpen, onScan, onClose]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !scannerRef.current) return;
    try {
      setError(null);
      const decodedText = await scannerRef.current.scanFile(file, true);
      onScan(decodedText);
      onClose();
    } catch {
      setError("No valid QR code was detected in the selected image file. Please try another image or enter the code manually.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="scanner-modal-title">
      <div className="modal-window scanner-modal">
        <div className="modal-header">
          <div className="modal-title-wrap">
            <Camera className="icon-camera" size={20} />
            <h2 id="scanner-modal-title">Scan Digital Student ID</h2>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close scanner"
          >
            <X size={20} />
          </button>
        </div>

        <div className="scanner-body">
          {error ? (
            <div className="scanner-error-state" role="alert">
              <AlertCircle size={36} className="text-warning" />
              <h3>Camera Access Notice</h3>
              <p>{error}</p>
              <div className="scanner-fallback-actions">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={16} />
                  Upload QR Image Instead
                </Button>
                <Button variant="secondary" type="button" onClick={onClose}>
                  Enter Code Manually
                </Button>
              </div>
            </div>
          ) : (
            <div className="scanner-view-wrapper">
              {isStarting && (
                <div className="scanner-loading-indicator">
                  <div className="scanner-spinner" />
                  <p>Initializing camera...</p>
                </div>
              )}
              <div id="qr-video-reader" className="qr-video-container" />
              <p className="scanner-hint">
                Position the student ID QR code within the frame to verify automatically.
              </p>
              <div className="scanner-file-option">
                <button
                  type="button"
                  className="link-subtle"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Or upload an image file of the QR code
                </button>
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleFileUpload}
          />
        </div>

        <div className="modal-footer">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};
