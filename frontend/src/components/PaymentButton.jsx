import { useState } from "react";
import toast from "react-hot-toast";
import { paymentService } from "../services/paymentService";

export const PaymentButton = ({ job, onSuccess }) => {
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    setLoading(true);
    try {
      const { order, keyId, isMockMode } = await paymentService.createOrder(job._id);

      if (isMockMode) {
        // Mock payment — simulate Razorpay success
        toast.loading("Processing payment (demo mode)...", { duration: 1500 });
        await new Promise((r) => setTimeout(r, 1500));

        const result = await paymentService.verifyPayment({
          razorpay_order_id: order.id,
          razorpay_payment_id: `mock_pay_${Date.now()}`,
          razorpay_signature: "mock_signature",
          jobId: job._id,
        });

        toast.success("Payment successful! Job queued.");
        onSuccess?.(result);
        return;
      }

      // Real Razorpay checkout
      const options = {
        key: keyId,
        amount: order.amount,
        currency: order.currency,
        order_id: order.id,
        name: "SmartPrint",
        description: `Print job: ${job.originalName}`,
        theme: { color: "#2563eb" },
        handler: async (response) => {
          try {
            const result = await paymentService.verifyPayment({
              ...response,
              jobId: job._id,
            });
            toast.success("Payment verified! Job added to queue.");
            onSuccess?.(result);
          } catch (err) {
            toast.error("Payment verification failed.");
          }
        },
        modal: {
          ondismiss: () => {
            toast("Payment cancelled.", { icon: "ℹ️" });
            setLoading(false);
          },
        },
      };

      if (!window.Razorpay) {
        toast.error("Razorpay SDK not loaded. Add script to index.html");
        setLoading(false);
        return;
      }

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      toast.error(err.response?.data?.message || "Payment failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      className="btn btn-primary btn-lg btn-full"
      onClick={handlePay}
      disabled={loading}
      id="pay-now-btn"
    >
      {loading ? (
        <>
          <span className="spinner spinner-sm" /> Processing...
        </>
      ) : (
        <>💳 Pay ₹{job.totalAmount}</>
      )}
    </button>
  );
};
