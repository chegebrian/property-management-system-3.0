// src/pages/PaymentDetail.jsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  ArrowLeft,
  CreditCard,
  Calendar,
  DollarSign,
  User,
  Home,
  CheckCircle2,
  Clock,
  XCircle,
  Edit2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import Modal from "../components/Modal";

const PaymentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { api } = useAuth();

  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    amount_paid: "",
    payment_date: "",
    due_date: "",
    status: "",
    payment_method: "",
    notes: "",
  });

  const statusConfig = {
    paid: { icon: CheckCircle2, color: "success", label: "Paid" },
    pending: { icon: Clock, color: "warning", label: "Pending" },
    overdue: { icon: XCircle, color: "danger", label: "Overdue" },
    cancelled: { icon: XCircle, color: "secondary", label: "Cancelled" },
    partial: { icon: Clock, color: "info", label: "Partial" },
  };

  useEffect(() => {
    fetchPayment();
  }, [id]);

  const fetchPayment = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/rent-payments/${id}`);
      setPayment(response.data);
      setFormData({
        amount_paid: response.data.amount_paid,
        payment_date: response.data.payment_date || "",
        due_date: response.data.due_date,
        status: response.data.status,
        payment_method: response.data.payment_method,
        notes: response.data.notes || "",
      });
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load payment");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.patch(`/rent-payments/${id}`, {
        ...formData,
        amount_paid: parseFloat(formData.amount_paid),
      });
      setShowEditModal(false);
      fetchPayment();
    } catch (err) {
      alert(err.response?.data?.error || "Update failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkPaid = async () => {
    try {
      await api.post(`/rent-payments/${id}/mark-paid`);
      fetchPayment();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to mark as paid");
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <Loader2 className="spin" size={48} />
        <p>Loading payment details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <AlertCircle size={48} className="text-danger" />
        <p>{error}</p>
        <button
          onClick={() => navigate("/payments")}
          className="btn btn-primary"
        >
          Back to Payments
        </button>
      </div>
    );
  }

  const StatusIcon = statusConfig[payment.status]?.icon || CreditCard;
  const statusColor = statusConfig[payment.status]?.color || "secondary";

  return (
    <div className="payment-detail">
      <button
        onClick={() => navigate("/payments")}
        className="btn btn-ghost back-btn"
      >
        <ArrowLeft size={18} />
        Back to Payments
      </button>

      <div className="detail-header">
        <div className="payment-status-header">
          <div className={`status-icon-large ${statusColor}`}>
            <StatusIcon size={40} />
          </div>
          <div className="status-info">
            <h1>Payment #{payment.id}</h1>
            <span className={`badge badge-${payment.status} badge-lg`}>
              {statusConfig[payment.status]?.label || payment.status}
            </span>
          </div>
        </div>
        <div className="header-actions">
          {payment.status === "pending" && (
            <button className="btn btn-success" onClick={handleMarkPaid}>
              <CheckCircle2 size={18} />
              Mark as Paid
            </button>
          )}
          <button
            className="btn btn-secondary"
            onClick={() => setShowEditModal(true)}
          >
            <Edit2 size={18} />
            Edit
          </button>
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-card">
          <h3>Payment Details</h3>
          <div className="info-list">
            <div className="info-item">
              <DollarSign size={18} />
              <div>
                <label>Amount</label>
                <p className="amount-lg">${payment.amount_paid}</p>
              </div>
            </div>
            <div className="info-item">
              <Calendar size={18} />
              <div>
                <label>Due Date</label>
                <p>{new Date(payment.due_date).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="info-item">
              <CreditCard size={18} />
              <div>
                <label>Payment Method</label>
                <p>{payment.payment_method}</p>
              </div>
            </div>
            {payment.payment_date && (
              <div className="info-item">
                <CheckCircle2 size={18} />
                <div>
                  <label>Payment Date</label>
                  <p>{new Date(payment.payment_date).toLocaleDateString()}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="detail-card">
          <h3>Related Information</h3>
          <div className="info-list">
            <div className="info-item">
              <User size={18} />
              <div>
                <label>Tenant</label>
                <p>
                  <Link to={`/tenants/${payment.tenant_id}`}>
                    {payment.tenant_name}
                  </Link>
                </p>
              </div>
            </div>
            <div className="info-item">
              <Home size={18} />
              <div>
                <label>Property</label>
                <p>
                  <Link to={`/properties/${payment.property_id}`}>
                    {payment.property_name}
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>

        {payment.notes && (
          <div className="detail-card full-width">
            <h3>Notes</h3>
            <p className="notes-text">{payment.notes}</p>
          </div>
        )}

        <div className="detail-card full-width">
          <h3>Timeline</h3>
          <div className="timeline">
            <div className="timeline-item">
              <span className="timeline-date">
                {new Date(payment.created_at).toLocaleString()}
              </span>
              <span className="timeline-event">Payment recorded</span>
            </div>
            {payment.payment_date && (
              <div className="timeline-item">
                <span className="timeline-date">
                  {new Date(payment.payment_date).toLocaleString()}
                </span>
                <span className="timeline-event">Payment completed</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Payment"
      >
        <form onSubmit={handleUpdate} className="form">
          <div className="form-row">
            <div className="form-group">
              <label>Amount *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.amount_paid}
                onChange={(e) =>
                  setFormData({ ...formData, amount_paid: e.target.value })
                }
                required
              />
            </div>
            <div className="form-group">
              <label>Status</label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value })
                }
              >
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="cancelled">Cancelled</option>
                <option value="partial">Partial</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Due Date *</label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) =>
                  setFormData({ ...formData, due_date: e.target.value })
                }
                required
              />
            </div>
            <div className="form-group">
              <label>Payment Date</label>
              <input
                type="date"
                value={formData.payment_date}
                onChange={(e) =>
                  setFormData({ ...formData, payment_date: e.target.value })
                }
              />
            </div>
          </div>

          <div className="form-group">
            <label>Payment Method</label>
            <select
              value={formData.payment_method}
              onChange={(e) =>
                setFormData({ ...formData, payment_method: e.target.value })
              }
            >
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="credit_card">Credit Card</option>
              <option value="debit_card">Debit Card</option>
              <option value="check">Check</option>
              <option value="mobile_money">Mobile Money</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label>Notes</label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
            />
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowEditModal(false)}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="spin" size={18} />
                  Updating...
                </>
              ) : (
                "Update Payment"
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default PaymentDetail;
