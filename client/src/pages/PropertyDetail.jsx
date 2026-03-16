// src/pages/PropertyDetail.jsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  ArrowLeft,
  Building2,
  MapPin,
  DollarSign,
  Users,
  Home,
  CreditCard,
  Edit2,
  Loader2,
  AlertCircle,
  Plus,
} from "lucide-react";
import Modal from "../components/Modal";

const PropertyDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { api } = useAuth();

  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "",
    state: "",
    property_type: "",
    num_units: 1,
    monthly_rent: "",
    description: "",
  });

  useEffect(() => {
    fetchProperty();
  }, [id]);

  const fetchProperty = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/properties/${id}`);
      setProperty(response.data);
      setFormData({
        name: response.data.name,
        address: response.data.address,
        city: response.data.city,
        state: response.data.state,
        property_type: response.data.property_type,
        num_units: response.data.num_units,
        monthly_rent: response.data.monthly_rent,
        description: response.data.description || "",
      });
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load property");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.patch(`/properties/${id}`, formData);
      setShowEditModal(false);
      fetchProperty();
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
        <p>Loading property details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <AlertCircle size={48} className="text-danger" />
        <p>{error}</p>
        <button
          onClick={() => navigate("/properties")}
          className="btn btn-primary"
        >
          Back to Properties
        </button>
      </div>
    );
  }

  return (
    <div className="property-detail">
      <button
        onClick={() => navigate("/properties")}
        className="btn btn-ghost back-btn"
      >
        <ArrowLeft size={18} />
        Back to Properties
      </button>

      <div className="detail-header">
        <div className="property-profile">
          <div className="profile-avatar large property-avatar">
            <Building2 size={40} />
          </div>
          <div className="profile-info">
            <span className="property-type-badge large">
              {property.property_type}
            </span>
            <h1>{property.name}</h1>
            <p className="text-muted">
              <MapPin size={16} />
              {property.address}, {property.city}, {property.state}
            </p>
          </div>
        </div>
        <button
          className="btn btn-secondary"
          onClick={() => setShowEditModal(true)}
        >
          <Edit2 size={18} />
          Edit Property
        </button>
      </div>

      <div className="detail-grid">
        <div className="detail-card">
          <h3>Property Details</h3>
          <div className="info-list">
            <div className="info-item">
              <DollarSign size={18} />
              <div>
                <label>Monthly Rent</label>
                <p className="amount-lg">${property.monthly_rent}</p>
              </div>
            </div>
            <div className="info-item">
              <Home size={18} />
              <div>
                <label>Units</label>
                <p>{property.num_units}</p>
              </div>
            </div>
            <div className="info-item">
              <Building2 size={18} />
              <div>
                <label>Type</label>
                <p className="capitalize">{property.property_type}</p>
              </div>
            </div>
          </div>
          {property.description && (
            <div className="description-section">
              <label>Description</label>
              <p>{property.description}</p>
            </div>
          )}
        </div>

        <div className="detail-card">
          <h3>Statistics</h3>
          <div className="stats-row">
            <div className="stat-box">
              <Users size={24} />
              <span className="stat-value">
                {property.tenant_ids?.length || 0}
              </span>
              <span className="stat-label">Tenants</span>
            </div>
            <div className="stat-box">
              <CreditCard size={24} />
              <span className="stat-value">
                {property.rent_payment_ids?.length || 0}
              </span>
              <span className="stat-label">Payments</span>
            </div>
          </div>
        </div>

        {/* Tenants Section */}
        <div className="detail-card full-width">
          <div className="card-header">
            <h3>
              <Users size={20} />
              Tenants
            </h3>
            <Link to="/tenants" className="btn btn-sm btn-primary">
              <Plus size={16} />
              Assign Tenant
            </Link>
          </div>
          {property.tenants && property.tenants.length > 0 ? (
            <div className="linked-list">
              {property.tenants.map((tenant) => (
                <Link
                  key={tenant.id}
                  to={`/tenants/${tenant.id}`}
                  className="linked-item"
                >
                  <div className="item-avatar">
                    <Users size={20} />
                  </div>
                  <div className="item-info">
                    <span className="item-name">{tenant.full_name}</span>
                    <span className="item-meta">{tenant.email}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-muted">No tenants assigned to this property</p>
          )}
        </div>

        {/* Recent Payments Section */}
        <div className="detail-card full-width">
          <div className="card-header">
            <h3>
              <CreditCard size={20} />
              Recent Payments
            </h3>
            <Link to="/payments" className="btn btn-sm btn-ghost">
              View All
            </Link>
          </div>
          {property.rent_payments && property.rent_payments.length > 0 ? (
            <div className="payment-mini-list">
              {property.rent_payments.slice(0, 5).map((payment) => (
                <Link
                  key={payment.id}
                  to={`/payments/${payment.id}`}
                  className={`payment-mini-item status-${payment.status}`}
                >
                  <div className="mini-item-main">
                    <span className="mini-amount">${payment.amount_paid}</span>
                    <span className={`badge badge-${payment.status}`}>
                      {payment.status}
                    </span>
                  </div>
                  <span className="mini-date">
                    Due: {new Date(payment.due_date).toLocaleDateString()}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-muted">No payment records for this property</p>
          )}
        </div>
      </div>

      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Property"
      >
        <form onSubmit={handleUpdate} className="form">
          <div className="form-group">
            <label>Property Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />
          </div>

          <div className="form-group">
            <label>Address *</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>City *</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) =>
                  setFormData({ ...formData, city: e.target.value })
                }
                required
              />
            </div>
            <div className="form-group">
              <label>State *</label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) =>
                  setFormData({ ...formData, state: e.target.value })
                }
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Monthly Rent *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.monthly_rent}
                onChange={(e) =>
                  setFormData({ ...formData, monthly_rent: e.target.value })
                }
                required
              />
            </div>
            <div className="form-group">
              <label>Number of Units</label>
              <input
                type="number"
                min="1"
                value={formData.num_units}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    num_units: parseInt(e.target.value) || 1,
                  })
                }
              />
            </div>
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
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
                "Update Property"
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default PropertyDetail;
