import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, Save } from "lucide-react";
import { apiClient } from "@/services/apiClient";
import { Alert } from "@/components/common/Alert";

type Step = 1 | 2 | 3;

/** A persisted manual-record path for evidence that is not supplied by a roster import. */
export const StaffRecordWizardPage: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [campuses, setCampuses] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [programmes, setProgrammes] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [form, setForm] = useState({
    student_number: "",
    full_name: "",
    institutional_email: "",
    campus_id: "",
    programme_id: "",
    academic_year: "2026",
    study_year: 1,
    enrollment_status: "active",
  });

  useEffect(() => {
    const institutionId = sessionStorage.getItem("astramind.institution");
    if (!institutionId) {
      setError("An institution context is required before a record can be created.");
      return;
    }
    Promise.all([apiClient.getCampuses(institutionId), apiClient.getProgrammes(institutionId)])
      .then(([loadedCampuses, loadedProgrammes]) => {
        setCampuses(loadedCampuses);
        setProgrammes(loadedProgrammes);
      })
      .catch(() => setError("Could not load the institution’s campuses and programmes."));
  }, []);

  const next = () => {
    setError(null);
    if (step === 1) {
      if (!form.student_number.trim() || !form.full_name.trim() || !form.institutional_email.trim()) {
        setError("Registration number, full legal name, and institutional email are required.");
        return;
      }
      if (!/^\S+@\S+\.\S+$/.test(form.institutional_email.trim())) {
        setError("Enter a valid institutional email address.");
        return;
      }
    }
    if (step === 2 && (!form.campus_id || !form.programme_id || !form.academic_year.trim())) {
      setError("Campus, programme, and academic year are required.");
      return;
    }
    setStep((current) => Math.min(3, current + 1) as Step);
  };

  const createRecord = async () => {
    setSaving(true);
    setError(null);
    try {
      const record = await apiClient.createStaffRecord({
        ...form,
        student_number: form.student_number.trim(),
        full_name: form.full_name.trim(),
        institutional_email: form.institutional_email.trim().toLowerCase(),
      });
      navigate(`/staff/records/${record.id}`, { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "The record could not be created.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="uni-staff-page-container">
      <div className="uni-case-top-nav">
        <Link to="/staff/records" className="uni-btn-back"><ArrowLeft size={16} /><span>Back to registry</span></Link>
      </div>
      <div className="uni-staff-page-header">
        <div>
          <h1 className="uni-staff-page-title">Add institutional student record</h1>
          <p className="uni-staff-page-subtitle">Use this for an authorized manual record. Imported students must be maintained through the roster import wizard.</p>
        </div>
      </div>
      {error && <Alert type="error" message={error} />}

      <div className="uni-filter-bar-card" style={{ display: "flex", gap: 16, alignItems: "center" }}>
        {["Identity", "Enrollment", "Confirm"].map((label, index) => (
          <span key={label} className={`uni-status-pill ${step === index + 1 ? "active" : "secondary"}`}>{index + 1}. {label}</span>
        ))}
      </div>

      <div className="uni-record-form-card">
        {step === 1 && <div className="uni-form-grid">
          <div className="uni-form-group"><label htmlFor="number">Registration number *</label><input id="number" value={form.student_number} onChange={(e) => setForm({ ...form, student_number: e.target.value })} className="uni-form-input font-mono" /><span className="uni-input-hint">Stored exactly as entered; it cannot be changed later.</span></div>
          <div className="uni-form-group"><label htmlFor="name">Full legal name *</label><input id="name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="uni-form-input" /></div>
          <div className="uni-form-group full-width"><label htmlFor="email">Institutional email *</label><input id="email" type="email" value={form.institutional_email} onChange={(e) => setForm({ ...form, institutional_email: e.target.value })} className="uni-form-input" /></div>
        </div>}
        {step === 2 && <div className="uni-form-grid">
          <div className="uni-form-group"><label htmlFor="campus">Campus *</label><select id="campus" value={form.campus_id} onChange={(e) => setForm({ ...form, campus_id: e.target.value })} className="uni-form-select"><option value="">Select campus</option>{campuses.map((campus) => <option key={campus.id} value={campus.id}>{campus.name} ({campus.code})</option>)}</select></div>
          <div className="uni-form-group"><label htmlFor="programme">Programme *</label><select id="programme" value={form.programme_id} onChange={(e) => setForm({ ...form, programme_id: e.target.value })} className="uni-form-select"><option value="">Select programme</option>{programmes.map((programme) => <option key={programme.id} value={programme.id}>{programme.name} ({programme.code})</option>)}</select></div>
          <div className="uni-form-group"><label htmlFor="year">Academic year *</label><input id="year" value={form.academic_year} onChange={(e) => setForm({ ...form, academic_year: e.target.value })} className="uni-form-input" /></div>
          <div className="uni-form-group"><label htmlFor="study">Year of study</label><input id="study" type="number" min={1} max={10} value={form.study_year} onChange={(e) => setForm({ ...form, study_year: Number(e.target.value) || 1 })} className="uni-form-input" /></div>
          <div className="uni-form-group full-width"><label htmlFor="status">Enrollment status</label><select id="status" value={form.enrollment_status} onChange={(e) => setForm({ ...form, enrollment_status: e.target.value })} className="uni-form-select"><option value="active">Active</option><option value="pending">Pending</option><option value="suspended">Suspended</option><option value="completed">Completed</option><option value="withdrawn">Withdrawn</option></select></div>
        </div>}
        {step === 3 && <div className="uni-case-evidence-card"><CheckCircle2 size={22} className="text-success" /><h3>Confirm manual institutional record</h3><p><strong>{form.full_name}</strong> · {form.student_number} · {form.institutional_email}</p><p>{programmes.find((item) => item.id === form.programme_id)?.name} · {campuses.find((item) => item.id === form.campus_id)?.name} · {form.academic_year}</p><p className="text-muted">This creates an auditable registry record. It does not bypass onboarding, photo, or credential eligibility rules.</p></div>}
        <div className="uni-form-footer mt-4">
          {step > 1 && <button type="button" className="uni-btn-secondary" onClick={() => setStep((current) => (current - 1) as Step)}>Back</button>}
          {step < 3 ? <button type="button" className="uni-btn-primary" onClick={next}>Continue <ArrowRight size={16} /></button> : <button type="button" className="uni-btn-primary" onClick={createRecord} disabled={saving}><Save size={16} />{saving ? "Creating…" : "Create record"}</button>}
        </div>
      </div>
    </div>
  );
};
