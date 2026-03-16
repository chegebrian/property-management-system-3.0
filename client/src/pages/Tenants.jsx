// src/pages/Tenants.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Link } from "react-router-dom";
import {
  Plus,
  Search,
  Users,
  Mail,
  Phone,
  Edit2,
  Trash2,
  Eye,
  Loader2,
  User,
} from "lucide-react";
import Modal from "../components/Modal";

const Tenants = () => {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const { api } = useAuth();

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
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/tenants");
      setTenants(response.data);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load tenants");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (editingTenant) {
        await api.patch(`/tenants/${editingTenant.id}`, formData);
      } else {
        await api.post("/tenants", formData);
      }
      setShowAddModal(false);
      setEditingTenant(null);
      resetForm();
      fetchTenants();
    } catch (err) {
      alert(err.response?.data?.error || "Operation failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to deactivate this tenant?")) return;

    try {
      await api.delete(`/tenants/${id}`);
      fetchTenants();
    } catch (err) {
      alert(err.response?.data?.error || "Delete failed");
    }
  };

  const handleEdit = (tenant) => {
    setEditingTenant(tenant);
    setFormData({
      first_name: tenant.first_name,
      last_name: tenant.last_name,
      email: tenant.email,
      phone: tenant.phone,
      national_id: tenant.national_id || "",
      emergency_contact: tenant.emergency_contact || "",
      emergency_phone: tenant.emergency_phone || "",
    });
    setShowAddModal(true);
  };

  const resetForm = () => {
    setFormData({
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      national_id: "",
      emergency_contact: "",
      emergency_phone: "",
    });
  };

  const filteredTenants = tenants.filter((t) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      t.first_name.toLowerCase().includes(searchLower) ||
      t.last_name.toLowerCase().includes(searchLower) ||
      t.email.toLowerCase().includes(searchLower) ||
      t.phone.includes(searchTerm)
    );
  });

  if (loading) {
    return (
      <div className="loading-screen">
        <Loader2 className="spin" size={48} />
        <p>Loading tenants...</p>
      </div>
    );
  }

  return (
    <div className="tenants-page">
      <header className="page-header">
        <div>
          <h1>Tenants</h1>
          <p>Manage your tenants and their information</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            setEditingTenant(null);
            resetForm();
            setShowAddModal(true);
          }}
        >
          <Plus size={18} />
          Add Tenant
        </button>
      </header>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="filters-bar">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search tenants..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="tenants-grid">
        {filteredTenants.length === 0 ? (
          <div className="empty-state">
            <Users size={48} />
            <h3>No tenants found</h3>
            <p>Add your first tenant to get started</p>
          </div>
        ) : (
          filteredTenants.map((tenant) => (
            <div key={tenant.id} className="tenant-card">
              <div className="tenant-header">
                <div className="tenant-avatar">
                  <User size={24} />
                </div>
                <div className="tenant-actions">
                  <button
                    className="btn-icon"
                    onClick={() => handleEdit(tenant)}
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    className="btn-icon btn-danger"
                    onClick={() => handleDelete(tenant.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <h3 className="tenant-name">{tenant.full_name}</h3>

              <div className="tenant-info">
                <div className="info-item">
                  <Mail size={14} />
                  <span>{tenant.email}</span>
                </div>
                <div className="info-item">
                  <Phone size={14} />
                  <span>{tenant.phone}</span>
                </div>
              </div>

              <div className="tenant-stats">
                <span>{tenant.property_count || 0} properties</span>
                <span>{tenant.rent_payment_count || 0} payments</span>
              </div>

              <Link
                to={`/tenants/${tenant.id}`}
                className="btn btn-secondary btn-full"
              >
                <Eye size={16} />
                View Details
              </Link>
            </div>
          ))
        )}
      </div>

      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={editingTenant ? "Edit Tenant" : "Add New Tenant"}
      >
        <form onSubmit={handleSubmit} className="form">
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
              placeholder="Name"
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
                  {editingTenant ? "Updating..." : "Adding..."}
                </>
              ) : editingTenant ? (
                "Update Tenant"
              ) : (
                "Add Tenant"
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Tenants;
