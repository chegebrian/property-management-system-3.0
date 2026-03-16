// src/pages/TenantDetail.jsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  ArrowLeft,
  Mail,
  Phone,
  User,
  Home,
  CreditCard,
  Edit2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import Modal from "../components/Modal";

const TenantDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { api } = useAuth();

  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    national_id: "",
    emergency_contact: "",
    emergency_phone: "",
  });

  useEffect(() => {
    fetchTenant();
  }, [id]);

  const fetchTenant = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/tenants/${id}`);
      setTenant(response.data);
      setFormData({
        first_name: response.data.first_name,
        last_name: response.data.last_name,
        email: response.data.email,
        phone: response.data.phone,
        national_id: response.data.national_id || "",
        emergency_contact: response.data.emergency_contact || "",
        emergency_phone: response.data.emergency_phone || "",
      });
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load tenant");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.patch(`/tenants/${id}`, formData);
      setShowEditModal(false);
      fetchTenant();
    } catch (err) {
      alert(err.response?.data?.error || "Update failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <Loader2 className="spin" size={48} />
        <p>Loading tenant details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <AlertCircle size={48} className="text-danger" />
        <p>{error}</p>
        <button
          onClick={() => navigate("/tenants")}
          className="btn btn-primary"
        >
          Back to Tenants
        </button>
      </div>
    );
  }

  return (
    <div className="tenant-detail">
      <button
        onClick={() => navigate("/tenants")}
        className="btn btn-ghost back-btn"
      >
        <ArrowLeft size={18} />
        Back to Tenants
      </button>

      <div className="detail-header">
        <div className="tenant-profile">
          <div className="profile-avatar large">
            <User size={40} />
          </div>
          <div className="profile-info">
            <h1>{tenant.full_name}</h1>
            <p className="text-muted">
              Tenant since {new Date(tenant.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        <button
          className="btn btn-secondary"
          onClick={() => setShowEditModal(true)}
        >
          <Edit2 size={18} />
          Edit Tenant
        </button>
      </div>

      <div className="detail-grid">
        <div className="detail-card">
          <h3>Contact Information</h3>
          <div className="info-list">
            <div className="info-item">
              <Mail size={18} />
              <div>
                <label>Email</label>
                <p>{tenant.email}</p>
              </div>
            </div>
            <div className="info-item">
              <Phone size={18} />
              <div>
                <label>Phone</label>
                <p>{tenant.phone}</p>
              </div>
            </div>
            {tenant.national_id && (
              <div className="info-item">
                <User size={18} />
                <div>
                  <label>National ID</label>
                  <p>{tenant.national_id}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="detail-card">
          <h3>Emergency Contact</h3>
          <div className="info-list">
            {tenant.emergency_contact ? (
              <>
                <div className="info-item">
                  <User size={18} />
                  <div>
                    <label>Name</label>
                    <p>{tenant.emergency_contact}</p>
                  </div>
                </div>
                <div className="info-item">
                  <Phone size={18} />
                  <div>
                    <label>Phone</label>
                    <p>{tenant.emergency_phone || "N/A"}</p>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-muted">No emergency contact set</p>
            )}
          </div>
        </div>

        <div className="detail-card full-width">
          <h3>Properties & Payments</h3>
          <div className="stats-row">
            <div className="stat-box">
              <Home size={24} />
              <span className="stat-value">{tenant.property_count || 0}</span>
              <span className="stat-label">Properties</span>
            </div>
            <div className="stat-box">
              <CreditCard size={24} />
              <span className="stat-value">
                {tenant.rent_payment_count || 0}
              </span>
              <span className="stat-label">Payments</span>
            </div>
          </div>

          {tenant.properties && tenant.properties.length > 0 && (
            <div className="linked-properties">
              <h4>Rented Properties</h4>
              <div className="property-list">
                {tenant.properties.map((property) => (
                  <Link
                    key={property.id}
                    to={`/properties/${property.id}`}
                    className="property-item"
                  >
                    <Home size={16} />
                    <span>{property.name}</span>
                    <span className="text-muted">{property.address}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Tenant"
      >
        <form onSubmit={handleUpdate} className="form">
          <div className="form-row">
            <div className="form-group">
              <label>First Name *</label>
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) =>
                  setFormData({ ...formData, first_name: e.target.value })
                }
                required
              />
            </div>
            <div className="form-group">
              <label>Last Name *</label>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) =>
                  setFormData({ ...formData, last_name: e.target.value })
                }
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Email *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
              />
            </div>
            <div className="form-group">
              <label>Phone *</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>National ID</label>
            <input
              type="text"
              value={formData.national_id}
              onChange={(e) =>
                setFormData({ ...formData, national_id: e.target.value })
              }
            />
          </div>

          <div className="form-group">
            <label>Emergency Contact</label>
            <input
              type="text"
              value={formData.emergency_contact}
              onChange={(e) =>
                setFormData({ ...formData, emergency_contact: e.target.value })
              }
            />
          </div>

          <div className="form-group">
            <label>Emergency Phone</label>
            <input
              type="tel"
              value={formData.emergency_phone}
              onChange={(e) =>
                setFormData({ ...formData, emergency_phone: e.target.value })
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
                "Update Tenant"
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default TenantDetail;
