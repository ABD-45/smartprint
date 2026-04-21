import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { jobService } from "../../services/jobService";
import { JobCard } from "../../components/JobCard";
import { OTPModal } from "../../components/OTPModal";
import { queueService } from "../../services/queueService";

export default function TrackPage() {
  const [jobs, setJobs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [otpJob, setOtpJob]   = useState(null);
  const [otp, setOtp]         = useState(null);
  const [queueInfo, setQueueInfo] = useState({});

  const fetchJobs = async () => {
    try {
      const data = await jobService.getMyJobs();
      setJobs(data.jobs);
      const activeJobs = data.jobs.filter(j => ["queued","printing"].includes(j.status));
      const infoMap = {};
      await Promise.allSettled(activeJobs.map(async j => {
        try {
          const pos = await queueService.getPosition(j._id);
          if (pos.success) infoMap[j._id] = { position: pos.position ?? null, queueNumber: pos.queueNumber ?? j.queueNumber ?? null, etaMinutes: pos.etaMinutes ?? null, totalInQueue: pos.totalInQueue ?? null, inQueue: pos.inQueue ?? false };
        } catch (_) {}
      }));
      setQueueInfo(infoMap);
    } catch { toast.error("Failed to load jobs"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchJobs(); const t = setInterval(fetchJobs, 20000); return () => clearInterval(t); }, []);

  const handleShowOTP = async (job) => {
    try { const data = await jobService.getOTP(job._id); setOtp(data.otp); setOtpJob(job); }
    catch (err) { toast.error(err.response?.data?.message || "OTP not available yet"); }
  };

  if (loading) return (
    <div className="page-wrapper">
      <div className="page-header"><h1>My Print Jobs</h1></div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 200, borderRadius: "var(--radius-xl)" }} />)}
      </div>
    </div>
  );

  const queuedJobs = jobs.filter(j => ["queued","printing"].includes(j.status));
  const firstQueued = queuedJobs[0];
  const firstInfo = firstQueued ? queueInfo[firstQueued._id] : null;

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 32, alignItems: "flex-end", marginBottom: 48 }}>
        <div>
          <span style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--on-surface-variant)", display: "block", marginBottom: 6 }}>
            {jobs.length} job{jobs.length !== 1 ? "s" : ""} total
          </span>
          <h1 style={{ letterSpacing: "-0.03em" }}>My Print Jobs</h1>
        </div>
        <button className="btn btn-secondary" onClick={fetchJobs} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>refresh</span>
          Refresh
        </button>
      </div>

      {/* Live queue banner */}
      {firstQueued && firstInfo?.inQueue && (
        <div style={{
          background: "var(--surface-container-low)", borderRadius: "var(--radius-xl)", padding: "20px 28px",
          display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32,
          borderLeft: "4px solid var(--primary)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: "var(--radius-full)", background: "var(--secondary-container)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span className="material-symbols-outlined" style={{ color: "var(--on-secondary-container)", fontSize: 22 }}>schedule</span>
            </div>
            <div>
              <div style={{ fontWeight: 700, color: "var(--on-surface)", fontSize: "0.95rem" }}>Active in Queue</div>
              <div style={{ fontSize: "0.78rem", color: "var(--on-surface-variant)", marginTop: 2 }}>
                {firstInfo.totalInQueue ? `${firstInfo.totalInQueue} total jobs in queue` : "Queue is live"}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
            {firstInfo.queueNumber && (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "var(--font-headline)", fontWeight: 900, fontSize: "1.6rem", color: "var(--primary)", letterSpacing: "-0.02em" }}>{firstInfo.queueNumber}</div>
                <div style={{ fontSize: "0.65rem", color: "var(--on-surface-variant)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Your number</div>
              </div>
            )}
            {firstInfo.etaMinutes !== null && (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "var(--font-headline)", fontWeight: 900, fontSize: "1.6rem", color: "var(--tertiary)", letterSpacing: "-0.02em" }}>
                  {firstInfo.etaMinutes <= 2 ? "Now!" : `~${firstInfo.etaMinutes}m`}
                </div>
                <div style={{ fontSize: "0.65rem", color: "var(--on-surface-variant)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Est. wait</div>
              </div>
            )}
            {firstInfo.position && (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "var(--font-headline)", fontWeight: 900, fontSize: "1.6rem", color: "var(--secondary)", letterSpacing: "-0.02em" }}>#{firstInfo.position}</div>
                <div style={{ fontSize: "0.65rem", color: "var(--on-surface-variant)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Position</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Job list */}
      {jobs.length === 0 ? (
        <div style={{ background: "var(--surface-container-low)", borderRadius: "var(--radius-xl)", padding: "64px 32px", textAlign: "center" }}>
          <span className="material-symbols-outlined" style={{ fontSize: 56, color: "var(--outline-variant)", display: "block", marginBottom: 16 }}>inbox</span>
          <h3 style={{ marginBottom: 8 }}>No jobs yet</h3>
          <p style={{ marginBottom: 24 }}>Upload your first document to get started</p>
          <a href="/upload" className="btn btn-primary">
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>upload</span>
            Upload File
          </a>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {jobs.map(job => {
            const info = queueInfo[job._id] || {};
            return (
              <div key={job._id} className="animate-fade-in">
                <JobCard job={job} showPayBtn queuePosition={info.position} queueNumber={info.queueNumber ?? job.queueNumber} etaMinutes={info.etaMinutes} />
                {job.status === "done" && !job.otpVerified && (
                  <div style={{ marginTop: 8 }}>
                    <button className="btn btn-success btn-sm" onClick={() => handleShowOTP(job)} id={`show-otp-${job._id}`}>
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>lock</span>
                      Show OTP for Pickup
                    </button>
                  </div>
                )}
                {job.status === "done" && job.otpVerified && (
                  <div className="alert alert-success" style={{ marginTop: 8 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span>
                    Collected — Prints picked up
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {otpJob && otp && <OTPModal mode="display" otp={otp} onClose={() => { setOtpJob(null); setOtp(null); }} />}
    </div>
  );
}
