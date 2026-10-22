import React from "react";
import { GraduationCap } from "lucide-react";

export interface StudentIdCardProps {
  name?: string;
  studentNo?: string;
  programme?: string;
  college?: string;
  institutionName?: string;
  status?: string;
  photoUrl?: string;
  className?: string;
}

export const StudentIdCard: React.FC<StudentIdCardProps> = ({
  name = "Chisomo Banda",
  studentNo = "2024/00123",
  programme = "BSc Computer Science",
  college = "Chancellor College",
  institutionName = "University of Malawi",
  status = "Active",
  photoUrl = "/assets/images/student_id_photo.jpg",
  className = "",
}) => {
  return (
    <div className={`uni-id-card ${className}`}>
      {/* Card Header Bar */}
      <div className="uni-id-card-header">
        <div className="uni-id-card-title">
          <GraduationCap size={18} className="uni-id-cap-icon" />
          <span>Digital Student ID</span>
        </div>
        <span className={`uni-id-status-badge ${status.toLowerCase()}`}>
          {status}
        </span>
      </div>

      {/* Card Content Body */}
      <div className="uni-id-card-body">
        {/* Top Info Row: Photo + Details */}
        <div className="uni-id-card-main-row">
          <div className="uni-id-photo-container">
            <img
              src={photoUrl}
              alt={name}
              className="uni-id-student-photo"
              onError={(e) => {
                // Fallback avatar if local image not ready
                (e.target as HTMLImageElement).src =
                  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80";
              }}
            />
          </div>

          <div className="uni-id-student-info">
            <h3 className="uni-id-student-name">{name}</h3>
            <p className="uni-id-student-no">
              <span className="uni-id-label">Student No:</span>{" "}
              <strong>{studentNo}</strong>
            </p>
            <p className="uni-id-programme">{programme}</p>
            <p className="uni-id-college">{college}</p>
          </div>
        </div>

        {/* Bottom Row: University Crest + QR Code */}
        <div className="uni-id-card-footer-row">
          <div className="uni-id-institution-crest">
            <div className="uni-id-crest-icon">
              <img
                src="/assets/logos/unima.png"
                alt="University of Malawi"
                style={{ width: "36px", height: "36px", objectFit: "contain" }}
              />
            </div>
            <span className="uni-id-institution-name">{institutionName}</span>
          </div>

          <div className="uni-id-qr-box">
            {/* Crisp High-Res Vector QR Code */}
            <svg
              viewBox="0 0 100 100"
              width="50"
              height="50"
              className="uni-id-qr-svg"
              shapeRendering="crispEdges"
            >
              <rect width="100" height="100" fill="#FFFFFF" />
              {/* Corner 1: Top-Left Finder */}
              <rect x="6" y="6" width="28" height="28" fill="#0F172A" rx="2" />
              <rect x="10" y="10" width="20" height="20" fill="#FFFFFF" />
              <rect x="14" y="14" width="12" height="12" fill="#0F172A" rx="1" />

              {/* Corner 2: Top-Right Finder */}
              <rect x="66" y="6" width="28" height="28" fill="#0F172A" rx="2" />
              <rect x="70" y="10" width="20" height="20" fill="#FFFFFF" />
              <rect x="74" y="14" width="12" height="12" fill="#0F172A" rx="1" />

              {/* Corner 3: Bottom-Left Finder */}
              <rect x="6" y="66" width="28" height="28" fill="#0F172A" rx="2" />
              <rect x="10" y="70" width="20" height="20" fill="#FFFFFF" />
              <rect x="14" y="74" width="12" height="12" fill="#0F172A" rx="1" />

              {/* Data Modules (Authentic Matrix Pattern) */}
              <rect x="38" y="10" width="6" height="6" fill="#0F172A" />
              <rect x="48" y="10" width="6" height="6" fill="#0F172A" />
              <rect x="38" y="20" width="6" height="6" fill="#0F172A" />
              <rect x="54" y="20" width="6" height="6" fill="#0F172A" />
              <rect x="44" y="26" width="6" height="6" fill="#0F172A" />

              {/* Center & Timing */}
              <rect x="10" y="42" width="6" height="6" fill="#0F172A" />
              <rect x="22" y="42" width="6" height="6" fill="#0F172A" />
              <rect x="34" y="42" width="6" height="6" fill="#0F172A" />
              <rect x="46" y="42" width="6" height="6" fill="#0F172A" />
              <rect x="58" y="42" width="6" height="6" fill="#0F172A" />
              <rect x="70" y="42" width="6" height="6" fill="#0F172A" />
              <rect x="82" y="42" width="6" height="6" fill="#0F172A" />

              <rect x="42" y="50" width="6" height="6" fill="#0F172A" />
              <rect x="52" y="52" width="6" height="6" fill="#0F172A" />
              <rect x="62" y="50" width="6" height="6" fill="#0F172A" />
              <rect x="42" y="62" width="6" height="6" fill="#0F172A" />
              <rect x="54" y="62" width="6" height="6" fill="#0F172A" />

              <rect x="40" y="74" width="6" height="6" fill="#0F172A" />
              <rect x="52" y="74" width="6" height="6" fill="#0F172A" />
              <rect x="68" y="70" width="6" height="6" fill="#0F172A" />
              <rect x="80" y="70" width="6" height="6" fill="#0F172A" />
              <rect x="74" y="80" width="6" height="6" fill="#0F172A" />
              <rect x="86" y="80" width="6" height="6" fill="#0F172A" />
              <rect x="68" y="88" width="6" height="6" fill="#0F172A" />
              <rect x="82" y="88" width="6" height="6" fill="#0F172A" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};
