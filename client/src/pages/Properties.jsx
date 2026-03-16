// src/pages/Properties.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Link } from "react-router-dom";
import {
  Plus,
  Search,
  Filter,
  Building2,
  MapPin,
  DollarSign,
  Users,
  MoreVertical,
  Edit2,
  Trash2,
  Eye,
} from "lucide-react";
import Modal from "../components/Modal";

const Properties = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProperty, setEditingProperty] = useState(null);
  const { api } = useAuth();

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "",
    state: "",
    property_type: "apartment",
    num_units: 1,
    monthly_rent: "",
    description: "",
  });

  const propertyTypes = [
    { value: "apartment", label: "Apartment" },
    { value: "house", label: "House" },
    { value: "commercial", label: "Commercial" },
    { value: "land", label: "Land" },
    { value: "condo", label: "Condo" },
    { value: "townhouse", label: "Townhouse" },
  ];

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      const response = await api.get("/properties");
      setProperties(response.data);
    } catch (error) {
      console.error("Failed to fetch properties:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingProperty) {
        await api.patch(`/properties/${editingProperty.id}`, formData);
      } else {
        await api.post("/properties", formData);
      }
      setShowAddModal(false);
      setEditingProperty(null);
      resetForm();
      fetchProperties();
    } catch (error) {
      alert(error.response?.data?.error || "Operation failed");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to deactivate this property?")) return;
    try {
      await api.delete(`/properties/${id}`);
      fetchProperties();
    } catch (error) {
      alert(error.response?.data?.error || "Delete failed");
    }
  };

  const handleEdit = (property) => {
    setEditingProperty(property);
    setFormData({
      name: property.name,
      address: property.address,
      city: property.city,
      state: property.state,
      property_type: property.property_type,
      num_units: property.num_units,
      monthly_rent: property.monthly_rent,
      description: property.description || "",
    });
    setShowAddModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      address: "",
      city: "",
      state: "",
      property_type: "apartment",
      num_units: 1,
      monthly_rent: "",
      description: "",
    });
  };

  const filteredProperties = properties.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.city.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !filterType || p.property_type === filterType;
    return matchesSearch && matchesType;
  });

  if (loading) return <div className="loading">Loading properties...</div>;

  return (
    <div className="properties-page">
      <header className="page-header">
        <div>
          <h1>Properties</h1>
          <p>Manage your real estate portfolio</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            setEditingProperty(null);
            resetForm();
            setShowAddModal(true);
          }}
        >
          <Plus size={18} />
          Add Property
        </button>
      </header>

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search properties..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="filter-select"
        >
          <option value="">All Types</option>
          {propertyTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      {/* Properties Grid */}
      <div className="properties-grid">
        {filteredProperties.length === 0 ? (
          <div className="empty-state">
            <Building2 size={48} />
            <h3>No properties found</h3>
            <p>Add your first property to get started</p>
          </div>
        ) : (
          filteredProperties.map((property) => (
            <div key={property.id} className="property-card">
              <div className="property-header">
                <div className="property-type-badge">
                  {property.property_type}
                </div>
                <div className="property-actions">
                  <button
                    className="btn-icon"
                    onClick={() => handleEdit(property)}
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    className="btn-icon btn-danger"
                    onClick={() => handleDelete(property.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <h3 className="property-name">{property.name}</h3>
              <p className="property-address">
                <MapPin size={14} />
                {property.address}, {property.city}, {property.state}
              </p>

              <div className="property-stats">
                <div className="stat">
                  <DollarSign size={16} />
                  <span>${property.monthly_rent}/mo</span>
                </div>
                <div className="stat">
                  <Users size={16} />
                  <span>{property.tenant_count || 0} tenants</span>
                </div>
              </div>

              <Link
                to={`/properties/${property.id}`}
                className="btn btn-secondary btn-full"
              >
                <Eye size={16} />
                View Details
              </Link>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={editingProperty ? "Edit Property" : "Add New Property"}
      >
        <form onSubmit={handleSubmit} className="form">
          <div className="form-row">
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
              <label>Property Type *</label>
              <select
                value={formData.property_type}
                onChange={(e) =>
                  setFormData({ ...formData, property_type: e.target.value })
                }
                required
              >
                {propertyTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
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
                    num_units: parseInt(e.target.value),
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
              onClick={() => setShowAddModal(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {editingProperty ? "Update Property" : "Add Property"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Properties;
