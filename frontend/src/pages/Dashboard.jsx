import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { vendorService } from '../services/api';
import { 
  Shield, 
  Building2, 
  AlertTriangle, 
  FileText, 
  Plus, 
  Search,
  Filter,
  MoreVertical
} from 'lucide-react';

const Dashboard = () => {
  const [vendors, setVendors] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    highRisk: 0,
    pendingAssessments: 0,
    expiringDocuments: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTier, setFilterTier] = useState('all');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [vendorsRes, risksRes, assessmentsRes] = await Promise.all([
        vendorService.getAll(),
        import('../services/api').then(m => m.riskService).then(s => s.getAll()),
        import('../services/api').then(m => m.assessmentService).then(s => s.getAll())
      ]);

      setVendors(vendorsRes.data.vendors || []);
      
      // Calculate stats
      const allRisks = (await risksRes).data?.risks || [];
      const allAssessments = (await assessmentsRes).data?.assessments || [];
      
      setStats({
        total: vendorsRes.data.vendors?.length || 0,
        highRisk: vendorsRes.data.vendors?.filter(v => v.risk_tier === 'high' || v.risk_tier === 'critical').length || 0,
        pendingAssessments: allAssessments.filter(a => a.status === 'pending' || a.status === 'in_progress').length,
        expiringDocuments: 0 // Would need separate API call
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRiskBadgeClass = (tier) => {
    const classes = {
      low: 'badge-low',
      medium: 'badge-medium',
      high: 'badge-high',
      critical: 'badge-critical'
    };
    return `badge ${classes[tier] || classes.medium}`;
  };

  const filteredVendors = vendors.filter(vendor => {
    const matchesSearch = vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vendor.contact_email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterTier === 'all' || vendor.risk_tier === filterTier;
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Shield className="w-8 h-8 text-primary-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Vendor Security Dashboard</h1>
                <p className="text-sm text-gray-500">Third-Party Risk Management</p>
              </div>
            </div>
            <Link to="/vendors/new" className="btn-primary flex items-center space-x-2">
              <Plus className="w-5 h-5" />
              <span>Add Vendor</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Vendors</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <Building2 className="w-12 h-12 text-primary-600 opacity-20" />
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">High Risk</p>
                <p className="text-3xl font-bold text-risk-high">{stats.highRisk}</p>
              </div>
              <AlertTriangle className="w-12 h-12 text-risk-high opacity-20" />
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Assessments</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.pendingAssessments}</p>
              </div>
              <FileText className="w-12 h-12 text-yellow-600 opacity-20" />
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Expiring Documents</p>
                <p className="text-3xl font-bold text-orange-600">{stats.expiringDocuments}</p>
              </div>
              <AlertTriangle className="w-12 h-12 text-orange-600 opacity-20" />
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="card mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search vendors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={filterTier}
                onChange={(e) => setFilterTier(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
              >
                <option value="all">All Risk Levels</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
        </div>

        {/* Vendors Table */}
        <div className="card overflow-hidden">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Vendor List</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vendor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Risk Tier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data Classification
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredVendors.map((vendor) => (
                  <tr key={vendor.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-primary-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{vendor.name}</div>
                          <div className="text-sm text-gray-500">{vendor.industry}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{vendor.contact_email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={getRiskBadgeClass(vendor.risk_tier)}>
                        {vendor.risk_tier.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`badge ${vendor.status === 'active' ? 'badge-low' : 'badge-medium'}`}>
                        {vendor.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {vendor.data_classification?.slice(0, 3).map((cls, idx) => (
                          <span key={idx} className="badge badge-medium">{cls}</span>
                        ))}
                        {vendor.data_classification?.length > 3 && (
                          <span className="badge badge-medium">+{vendor.data_classification.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link to={`/vendors/${vendor.id}`} className="text-primary-600 hover:text-primary-900">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredVendors.length === 0 && (
            <div className="text-center py-12">
              <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No vendors found</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
