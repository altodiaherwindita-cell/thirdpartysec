import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { vendorService, assessmentService, riskService } from '../services/api';
import { 
  Building2, Mail, Phone, Globe, Calendar, Shield, AlertTriangle,
  Plus, Edit2, Trash2, FileText, TrendingUp, Clock
} from 'lucide-react';

const VendorDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vendor, setVendor] = useState(null);
  const [assessments, setAssessments] = useState([]);
  const [risks, setRisks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadVendorData();
  }, [id]);

  const loadVendorData = async () => {
    try {
      const [vendorRes, assessmentsRes, risksRes] = await Promise.all([
        vendorService.getById(id),
        assessmentService.getAll({ vendor_id: id }),
        riskService.getAll({ vendor_id: id })
      ]);

      setVendor(vendorRes.data.vendor);
      setAssessments(assessmentsRes.data.assessments || []);
      setRisks(risksRes.data.risks || []);
    } catch (error) {
      console.error('Failed to load vendor data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this vendor? This action cannot be undone.')) {
      return;
    }

    try {
      await vendorService.delete(id);
      navigate('/vendors');
    } catch (error) {
      alert('Failed to delete vendor');
      console.error(error);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Vendor Not Found</h1>
          <Link to="/vendors" className="btn-primary">Back to Vendors</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0 h-12 w-12 bg-primary-100 rounded-full flex items-center justify-center">
                <Building2 className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{vendor.name}</h1>
                <p className="text-sm text-gray-500">{vendor.industry}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Link to={`/vendors/${id}/edit`} className="btn-secondary flex items-center space-x-2">
                <Edit2 className="w-4 h-4" />
                <span>Edit</span>
              </Link>
              <button onClick={handleDelete} className="btn-danger flex items-center space-x-2">
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center space-x-3">
              <Shield className="w-8 h-8 text-primary-600" />
              <div>
                <p className="text-sm text-gray-600">Risk Tier</p>
                <span className={getRiskBadgeClass(vendor.risk_tier)}>
                  {vendor.risk_tier?.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-8 h-8 text-risk-high" />
              <div>
                <p className="text-sm text-gray-600">Open Risks</p>
                <p className="text-2xl font-bold text-gray-900">
                  {risks.filter(r => r.status === 'open').length}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center space-x-3">
              <FileText className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Assessments</p>
                <p className="text-2xl font-bold text-gray-900">{assessments.length}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center space-x-3">
              <Clock className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <span className={`badge ${vendor.status === 'active' ? 'badge-low' : 'badge-medium'}`}>
                  {vendor.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'overview'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('assessments')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'assessments'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Assessments
              </button>
              <button
                onClick={() => setActiveTab('risks')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'risks'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Risks
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
              <div className="space-y-3">
                {vendor.contact_email && (
                  <div className="flex items-center space-x-3">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <a href={`mailto:${vendor.contact_email}`} className="text-primary-600 hover:underline">
                      {vendor.contact_email}
                    </a>
                  </div>
                )}
                {vendor.contact_phone && (
                  <div className="flex items-center space-x-3">
                    <Phone className="w-5 h-5 text-gray-400" />
                    <span>{vendor.contact_phone}</span>
                  </div>
                )}
                {vendor.website && (
                  <div className="flex items-center space-x-3">
                    <Globe className="w-5 h-5 text-gray-400" />
                    <a href={vendor.website} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
                      {vendor.website}
                    </a>
                  </div>
                )}
              </div>
            </div>

            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Vendor Details</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Description</p>
                  <p className="text-gray-900">{vendor.description || 'No description provided'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Contract Start Date</p>
                  <p className="text-gray-900">
                    {vendor.contract_start_date ? new Date(vendor.contract_start_date).toLocaleDateString() : 'Not set'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Contract End Date</p>
                  <p className="text-gray-900">
                    {vendor.contract_end_date ? new Date(vendor.contract_end_date).toLocaleDateString() : 'Not set'}
                  </p>
                </div>
              </div>
            </div>

            <div className="card md:col-span-2">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Classification</h3>
              <div className="flex flex-wrap gap-2">
                {vendor.data_classification?.map((cls, idx) => (
                  <span key={idx} className="badge badge-medium">{cls}</span>
                ))}
                {!vendor.data_classification?.length && (
                  <p className="text-gray-500">No data classifications set</p>
                )}
              </div>
            </div>

            <div className="card md:col-span-2">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{vendor.notes || 'No notes available'}</p>
            </div>
          </div>
        )}

        {activeTab === 'assessments' && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Assessment History</h3>
              <Link to={`/assessments/new?vendor=${id}`} className="btn-primary flex items-center space-x-2">
                <Plus className="w-4 h-4" />
                <span>New Assessment</span>
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Questionnaire</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Risk Score</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {assessments.map((assessment) => (
                    <tr key={assessment.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(assessment.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {assessment.questionnaire_name || 'Standard Assessment'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`badge ${
                          assessment.status === 'completed' ? 'badge-low' :
                          assessment.status === 'in_progress' ? 'badge-medium' : 'badge-medium'
                        }`}>
                          {assessment.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {assessment.overall_risk_score !== null ? (
                          <span className={`font-semibold ${
                            assessment.overall_risk_score >= 80 ? 'text-green-600' :
                            assessment.overall_risk_score >= 50 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {assessment.overall_risk_score}%
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button className="text-primary-600 hover:text-primary-900">View</button>
                      </td>
                    </tr>
                  ))}
                  {assessments.length === 0 && (
                    <tr>
                      <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                        No assessments yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'risks' && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Risk Register</h3>
              <Link to={`/risks/new?vendor=${id}`} className="btn-primary flex items-center space-x-2">
                <Plus className="w-4 h-4" />
                <span>Add Risk</span>
              </Link>
            </div>
            <div className="space-y-4">
              {risks.map((risk) => (
                <div key={risk.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{risk.description}</h4>
                      <p className="text-sm text-gray-600 mt-1">{risk.mitigation_plan}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`badge ${
                        risk.risk_level === 'high' ? 'badge-high' :
                        risk.risk_level === 'critical' ? 'badge-critical' :
                        risk.risk_level === 'medium' ? 'badge-medium' : 'badge-low'
                      }`}>
                        {risk.risk_level.toUpperCase()}
                      </span>
                      <span className={`badge ${risk.status === 'open' ? 'badge-medium' : 'badge-low'}`}>
                        {risk.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {risks.length === 0 && (
                <p className="text-center text-gray-500 py-8">No risks identified</p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default VendorDetail;
