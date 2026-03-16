// src/pages/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Building2, 
  Users, 
  CreditCard, 
  TrendingUp, 
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentPayments, setRecentPayments] = useState([]);
  const [overduePayments, setOverduePayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const { api } = useAuth();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, recentRes, overdueRes] = await Promise.all([
        api.get('/dashboard'),
        api.get('/dashboard/recent-payments?limit=5'),
        api.get('/dashboard/overdue-payments'),
      ]);
      
      setStats(statsRes.data);
      setRecentPayments(recentRes.data);
      setOverduePayments(overdueRes.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6b7280'];

  const paymentData = stats ? [
    { name: 'Paid', value: stats.paid, color: '#10b981' },
    { name: 'Pending', value: stats.pending, color: '#f59e0b' },
    { name: 'Overdue', value: stats.overdue, color: '#ef4444' },
  ] : [];

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div className="dashboard">
      <header className="page-header">
        <h1>Dashboard</h1>
        <p>Welcome back! Here's what's happening with your properties.</p>
      </header>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">
            <Building2 size={24} />
          </div>
          <div className="stat-content">
            <h3>{stats?.total_properties || 0}</h3>
            <p>Properties</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon purple">
            <Users size={24} />
          </div>
          <div className="stat-content">
            <h3>{stats?.total_tenants || 0}</h3>
            <p>Tenants</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon green">
            <CreditCard size={24} />
          </div>
          <div className="stat-content">
            <h3>${stats?.total_revenue?.toLocaleString() || 0}</h3>
            <p>Total Revenue</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon orange">
            <TrendingUp size={24} />
          </div>
          <div className="stat-content">
            <h3>{stats?.total_payments || 0}</h3>
            <p>Total Payments</p>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Payment Status Chart */}
        <div className="dashboard-card">
          <h2>Payment Status</h2>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={paymentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {paymentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="chart-legend">
              {paymentData.map((item) => (
                <div key={item.name} className="legend-item">
                  <span className="legend-dot" style={{ background: item.color }} />
                  <span>{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Payments */}
        <div className="dashboard-card">
          <div className="card-header">
            <h2>Recent Payments</h2>
            <Link to="/payments" className="btn btn-sm btn-ghost">View All</Link>
          </div>
          <div className="payment-list">
            {recentPayments.length === 0 ? (
              <p className="empty-state">No recent payments</p>
            ) : (
              recentPayments.map((payment) => (
                <div key={payment.id} className="payment-item">
                  <div className="payment-info">
                    <p className="payment-tenant">{payment.tenant_name}</p>
                    <p className="payment-property">{payment.property_name}</p>
                  </div>
                  <div className="payment-amount">
                    <p className="amount">${payment.amount_paid}</p>
                    <span className={`badge badge-${payment.status}`}>
                      {payment.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Overdue Payments Alert */}
        <div className="dashboard-card full-width">
          <div className="card-header">
            <h2>
              <AlertCircle size={20} className="text-danger" />
              Overdue Payments ({overduePayments.length})
            </h2>
            <Link to="/payments?status=overdue" className="btn btn-sm btn-danger">
              View All
            </Link>
          </div>
          {overduePayments.length === 0 ? (
            <div className="empty-state success">
              <CheckCircle2 size={48} />
              <p>No overdue payments! Great job!</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Tenant</th>
                    <th>Property</th>
                    <th>Due Date</th>
                    <th>Amount</th>
                    <th>Days Overdue</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {overduePayments.slice(0, 5).map((payment) => {
                    const daysOverdue = Math.floor(
                      (new Date() - new Date(payment.due_date)) / (1000 * 60 * 60 * 24)
                    );
                    return (
                      <tr key={payment.id}>
                        <td>{payment.tenant_name}</td>
                        <td>{payment.property_name}</td>
                        <td>{new Date(payment.due_date).toLocaleDateString()}</td>
                        <td>${payment.amount_paid}</td>
                        <td>
                          <span className="text-danger">{daysOverdue} days</span>
                        </td>
                        <td>
                          <Link 
                            to={`/payments/${payment.id}`}
                            className="btn btn-sm btn-primary"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;