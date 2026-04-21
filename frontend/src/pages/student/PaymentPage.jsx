import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { jobService } from "../../services/jobService";
import { PaymentButton } from "../../components/PaymentButton";
import { StatusBadge } from "../../components/StatusBadge";

export default function PaymentPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJob = async () => {
      try { const data = await jobService.getJob(jobId); setJob(data.job); }
      catch { toast.error("Job not found"); navigate("/track"); }
      finally { setLoading(false); }
    };
    fetchJob();
  }, [jobId]);

  if (loading) return (
    <div className="page-wrapper" style={{ maxWidth: 640, margin: "0 auto" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="skeleton" style={{ height: 40, width: 280 }} />
        <div className="skeleton" style={{ height: 320 }} />
      </div>
    </div>
  );

  if (!job) return null;

  const steps = ["Uploaded", "Payment", "Queued", "Printing", "Done"];
  const currentStep = ["uploaded","paid","queued","printing","done"].indexOf(job.status);

  return (
    <div className="page-wrapper" style={{ maxWidth: 680, margin: "0 auto" }}>
      <div style={{ marginBottom: 40 }}>
        <span style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--on-surface-variant)", display: "block", marginBottom: 6 }}>
          Complete Payment
        </span>
        <h1 style={{ letterSpacing: "-0.03em" }}>Pay to Print</h1>
        <p style={{ marginTop: 6 }}>Pay to add your job to the priority print queue</p>
      </div>

      {/* Step progress */}
      <div className="step-indicator" style={{ marginBottom: 32 }}>
        {steps.map((step, idx) => (
          <div className="step" key={step}>
            <div className={`step-circle ${idx === currentStep ? "active" : ""} ${idx < currentStep ? "completed" : ""}`}>
              {idx < currentStep
                ? <span className="material-symbols-outlined" style={{ fontSize: 14 }}>check</span>
                : idx + 1}
            </div>
            {idx < steps.length - 1 && <div className={`step-line ${idx < currentStep ? "filled" : ""}`} />}
          </div>
        ))}
      </div>

      {/* Job details card */}
      <div style={{ background: "var(--surface-container-low)", borderRadius: "var(--radius-xl)", padding: 28, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 44, height: 44, background: "var(--primary-fixed)", borderRadius: "var(--radius-lg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span className="material-symbols-outlined" style={{ color: "var(--primary)", fontSize: 22 }}>picture_as_pdf</span>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--on-surface)" }}>{job.originalName}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--on-surface-variant)", marginTop: 2 }}>{job.pages} pages · {job.copies} copies</div>
            </div>
          </div>
          <StatusBadge status={job.status} />
        </div>

        <div className="price-breakdown">
          {[
            ["Pages", `${job.pages}`],
            ["Copies", `${job.copies}`],
            ["Type", job.color ? "Color" : "B&W"],
            ["Duplex", job.duplex ? "Yes" : "No"],
            ["Paper", job.paperSize],
            ["Rate", `₹${job.pricePerPage}/page`],
          ].map(([label, value]) => (
            <div className="price-row" key={label}>
              <span>{label}</span>
              <span style={{ fontWeight: 600, color: "var(--on-surface)" }}>{value}</span>
            </div>
          ))}
          <div className="price-row total">
            <span>Total Amount</span>
            <span className="price-amount highlight">₹{job.totalAmount}</span>
          </div>
        </div>
      </div>

      {job.status === "uploaded" ? (
        <>
          <PaymentButton job={job} onSuccess={() => { toast.success("Payment done! Job added to queue."); navigate("/track"); }} />
          <div className="alert alert-info" style={{ marginTop: 16 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>lock</span>
            Payments secured via Razorpay. Collect prints with an OTP after printing.
          </div>
        </>
      ) : (
        <div className="alert alert-success">
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span>
          <div>
            Payment already completed. Track your job status below.
            <div style={{ marginTop: 10 }}>
              <button className="btn btn-success btn-sm" onClick={() => navigate("/track")}>
                Track Job
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>arrow_forward</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
