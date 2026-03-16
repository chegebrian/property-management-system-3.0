// src/pages/RentPayments.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Link } from "react-router-dom";
import {
  Plus,
  Search,
  Filter,
  CreditCard,
  Calendar,
  DollarSign,
  User,
  Home,
  Edit2,
  Trash2,
  CheckCircle2,
  Loader2,
  XCircle,
  Clock,
} from "lucide-react";
import Modal from "../components/Modal";

const RentPayments = () => {
  const [payments, setPayments] = useState([]);
  const [properties, setProperties] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    status: "",
    property_id: "",
    tenant_id: "",
    start_date: "",
    end_date: "",
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const { api } = useAuth();

  const [formData, setFormData] = useState({
    tenant_id: "",
    property_id: "",
    amount_paid: "",
    payment_date: "",
    due_date: "",
    status: "pending",
    payment_method: "cash",
    notes: "",
  });

  const statusOptions = [
    { value: "pending", label: "Pending", color: "warning" },
    { value: "paid", label: "Paid", color: "success" },
    { value: "overdue", label: "Overdue", color: "danger" },
    { value: "cancelled", label: "Cancelled", color: "secondary" },
    { value: "partial", label: "Partial", color: "info" },
  ];

  const paymentMethods = [
    { value: "cash", label: "Cash" },
    { value: "bank_transfer", label: "Bank Transfer" },
    { value: "credit_card", label: "Credit Card" },
    { value: "debit_card", label: "Debit Card" },
    { value: "check", label: "Check" },
    { value: "mobile_money", label: "Mobile Money" },
    { value: "other", label: "Other" },
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [paymentsRes, propertiesRes, tenantsRes] = await Promise.all([
        api.get("/rent-payments"),
        api.get("/properties"),
        api.get("/tenants"),
      ]);
      setPayments(paymentsRes.data);
      setProperties(propertiesRes.data);
      setTenants(tenantsRes.data);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        ...formData,
        amount_paid: parseFloat(formData.amount_paid),
      };

      if (editingPayment) {
        await api.patch(`/rent-payments/${editingPayment.id}`, payload);
      } else {
        await api.post("/rent-payments", payload);
      }
      setShowAddModal(false);
      setEditingPayment(null);
      resetForm();
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || "Operation failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this payment record?"))
      return;

    try {
      await api.delete(`/rent-payments/${id}`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || "Delete failed");
    }
  };

  const handleMarkPaid = async (id, method = "cash") => {
    try {
      await api.post(`/rent-payments/${id}/mark-paid`, {
        payment_method: method,
      });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to mark as paid");
    }
  };

  const handleEdit = (payment) => {
    setEditingPayment(payment);
    setFormData({
      tenant_id: payment.tenant_id,
      property_id: payment.property_id,
      amount_paid: payment.amount_paid,
      payment_date: payment.payment_date || "",
      due_date: payment.due_date,
      status: payment.status,
      payment_method: payment.payment_method,
      notes: payment.notes || "",
    });
    setShowAddModal(true);
  };

  const resetForm = () => {
    setFormData({
      tenant_id: "",
      property_id: "",
      amount_paid: "",
      payment_date: "",
      due_date: "",
      status: "pending",
      payment_method: "cash",
      notes: "",
    });
  };

  const filteredPayments = payments.filter((p) => {
    if (filters.status && p.status !== filters.status) return false;
    if (filters.property_id && p.property_id !== parseInt(filters.property_id))
      return false;
    if (filters.tenant_id && p.tenant_id !== parseInt(filters.tenant_id))
      return false;
    if (
      filters.start_date &&
      new Date(p.due_date) < new Date(filters.start_date)
    )
      return false;
    if (filters.end_date && new Date(p.due_date) > new Date(filters.end_date))
      return false;
    return true;
  });

  const getStatusIcon = (status) => {
    switch (status) {
      case "paid":
        return <CheckCircle2 size={16} className="text-success" />;
      case "overdue":
        return <XCircle size={16} className="text-danger" />;
      case "pending":
        return <Clock size={16} className="text-warning" />;
      default:
        return <CreditCard size={16} />;
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <Loader2 className="spin" size={48} />
        <p>Loading payments...</p>
      </div>
    );
  }

  return (
    <div className="payments-page">
      <header className="page-header">
        <div>
          <h1>Rent Payments</h1>
          <p>Track and manage rent payments</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            setEditingPayment(null);
            resetForm();
            setShowAddModal(true);
          }}
        >
          <Plus size={18} />
          Record Payment
        </button>
      </header>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Filters */}
      <div className="filters-bar payments-filters">
        <div className="search-box">
          <Filter size={18} />
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">All Statuses</option>
            {statusOptions.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <select
          value={filters.property_id}
          onChange={(e) =>
            setFilters({ ...filters, property_id: e.target.value })
          }
        >
          <option value="">All Properties</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <select
          value={filters.tenant_id}
          onChange={(e) =>
            setFilters({ ...filters, tenant_id: e.target.value })
          }
        >
          <option value="">All Tenants</option>
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>
              {t.full_name}
            </option>
          ))}
        </select>

        <input
          type="date"
          placeholder="Start Date"
          value={filters.start_date}
          onChange={(e) =>
            setFilters({ ...filters, start_date: e.target.value })
          }
        />
        <input
          type="date"
          placeholder="End Date"
          value={filters.end_date}
          onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
        />
      </div>

      {/* Payments Table */}
      <div className="payments-table-container">
        {filteredPayments.length === 0 ? (
          <div className="empty-state">
            <CreditCard size={48} />
            <h3>No payments found</h3>
            <p>Record your first rent payment</p>
          </div>
        ) : (
          <table className="table payments-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Tenant</th>
                <th>Property</th>
                <th>Due Date</th>
                <th>Amount</th>
                <th>Payment Date</th>
                <th>Method</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((payment) => (
                <tr
                  key={payment.id}
                  className={`payment-row status-${payment.status}`}
                >
                  <td>
                    <span className={`badge badge-${payment.status}`}>
                      {getStatusIcon(payment.status)}
                      {payment.status}
                    </span>
                  </td>
                  <td>
                    <Link to={`/tenants/${payment.tenant_id}`}>
                      {payment.tenant_name}
                    </Link>
                  </td>
                  <td>
                    <Link to={`/properties/${payment.property_id}`}>
                      {payment.property_name}
                    </Link>
                  </td>
                  <td>{new Date(payment.due_date).toLocaleDateString()}</td>
                  <td className="amount">${payment.amount_paid}</td>
                  <td>
                    {payment.payment_date
                      ? new Date(payment.payment_date).toLocaleDateString()
                      : "-"}
                  </td>
                  <td>{payment.payment_method}</td>
                  <td>
                    <div className="row-actions">
                      {payment.status === "pending" && (
                        <button
                          className="btn btn-sm btn-success"
                          onClick={() => handleMarkPaid(payment.id)}
                          title="Mark as Paid"
                        >
                          <CheckCircle2 size={16} />
                        </button>
                      )}
                      <button
                        className="btn-icon"
                        onClick={() => handleEdit(payment)}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        className="btn-icon btn-danger"
                        onClick={() => handleDelete(payment.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={editingPayment ? "Edit Payment" : "Record New Payment"}
      >
        <form onSubmit={handleSubmit} className="form">
          <div className="form-row">
            <div className="form-group">
              <label>Tenant *</label>
              <select
                value={formData.tenant_id}
                onChange={(e) =>
                  setFormData({ ...formData, tenant_id: e.target.value })
                }
                required
              >
                <option value="">Select Tenant</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Property *</label>
              <select
                value={formData.property_id}
                onChange={(e) =>
                  setFormData({ ...formData, property_id: e.target.value })
                }
                required
              >
                <option value="">Select Property</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Amount Paid *</label>
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
                {statusOptions.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
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

          <div className="form-row">
            <div className="form-group">
              <label>Payment Method</label>
              <select
                value={formData.payment_method}
                onChange={(e) =>
                  setFormData({ ...formData, payment_method: e.target.value })
                }
              >
                {paymentMethods.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Notes</label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="Additional notes about this payment..."
            />
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowAddModal(false)}
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
                  {editingPayment ? "Updating..." : "Recording..."}
                </>
              ) : editingPayment ? (
                "Update Payment"
              ) : (
                "Record Payment"
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default RentPayments;
