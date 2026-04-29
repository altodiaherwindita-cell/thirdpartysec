import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { vendorService } from '../services/api';
import { Building2, ArrowLeft } from 'lucide-react';

const VendorForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    industry: '',
    contact_email: '',
    contact_phone: '',
    website: '',
    description: '',
    risk_tier: 'medium',
    status: 'active',
    contract_start_date: '',
    contract_end_date: '',
    data_classification: [],
    notes: ''
  });
  const [errors, setErrors] = useState({});

  const DATA_CLASSIFICATIONS = [
    'Public',
    'Internal',
    'Confidential',
    'PII',
    'PCI',
    'PHI',
    'Financial'
  ];

  useEffect(() => {
    if (isEdit) {
      loadVendor();
    }
  }, [id]);

  const loadVendor = async () => {
    try {
      const result = await vendorService.getById(id);
      const vendor = result.data.vendor;
      setFormData({
        ...vendor,
        data_classification: vendor.data_classification || []
      });
    } catch (error) {
      alert('Failed to load vendor');
      console.error(error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const handleClassificationToggle = (classification) => {
    setFormData(prev => ({
      ...prev,
      data_classification: prev.data_classification.includes(classification)
        ? prev.data_classification.filter(c => c !== classification)
        : [...prev.data_classification, classification]
    }));
  };

  const validate = () => {
    const newErrors = {};
    
    if (!formData.name?.trim()) {
      newErrors.name = 'Vendor name is required';
    }
    
    if (!formData.contact_email?.trim()) {
      newErrors.contact_email = 'Contact email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.contact_email)) {
      newErrors.contact_email = 'Invalid email format';
    }

    if (formData.contract_start_date && formData.contract_end_date) {
      if (new Date(formData.contract_end_date) < new Date(formData.contract_start_date)) {
        newErrors.contract_end_date = 'End date must be after start date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }

    setLoading(true);
    try {
      if (isEdit) {
        await vendorService.update(id, formData);
        alert('Vendor updated successfully');
      } else {
        await vendorService.create(formData);
        alert('Vendor created successfully');
      }
      navigate(`/vendors/${isEdit ? id : ''}`);
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to save vendor');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEdit && !formData.name) {
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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center space-x-4">
            <Link to={isEdit ? `/vendors/${id}` : '/vendors'} className="text-gray-600 hover:text-gray-900">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <div className="flex items-center space-x-3">
              <Building2 className="w-8 h-8 text-primary-600" />
              <h1 className="text-2xl font-bold text-gray-900">
                {isEdit ? 'Edit Vendor' : 'Add New Vendor'}
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="card space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vendor Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 outline-none ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Company name"
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Industry
                </label>
                <input
                  type="text"
                  name="industry"
                  value={formData.industry}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="e.g., Technology, Healthcare"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="Brief description of vendor services..."
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Email *
                </label>
                <input
                  type="email"
                  name="contact_email"
                  value={formData.contact_email}
                  onChange={handleChange}
                  className={`w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 outline-none ${
                    errors.contact_email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="contact@vendor.com"
                />
                {errors.contact_email && <p className="text-red-500 text-xs mt-1">{errors.contact_email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  name="contact_phone"
                  value={formData.contact_phone}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Website
                </label>
                <input
                  type="url"
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="https://www.vendor.com"
                />
              </div>
            </div>
          </div>

          {/* Risk & Status */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Assessment</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Risk Tier
                </label>
                <select
                  name="risk_tier"
                  value={formData.risk_tier}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                >
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="inactive">Inactive</option>
                  <option value="terminated">Terminated</option>
                </select>
              </div>
            </div>
          </div>

          {/* Contract Dates */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Contract Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contract Start Date
                </label>
                <input
                  type="date"
                  name="contract_start_date"
                  value={formData.contract_start_date}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contract End Date
                </label>
                <input
                  type="date"
                  name="contract_end_date"
                  value={formData.contract_end_date}
                  onChange={handleChange}
                  className={`w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 outline-none ${
                    errors.contract_end_date ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.contract_end_date && <p className="text-red-500 text-xs mt-1">{errors.contract_end_date}</p>}
              </div>
            </div>
          </div>

          {/* Data Classification */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Classification</h3>
            <p className="text-sm text-gray-600 mb-3">
              Select all types of data this vendor will have access to
            </p>
            <div className="flex flex-wrap gap-2">
              {DATA_CLASSIFICATIONS.map((classification) => (
                <button
                  key={classification}
                  type="button"
                  onClick={() => handleClassificationToggle(classification)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    formData.data_classification.includes(classification)
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {classification}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Notes</h3>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={4}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
              placeholder="Any additional information about this vendor..."
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-4 pt-6 border-t">
            <Link
              to={isEdit ? `/vendors/${id}` : '/vendors'}
              className="btn-secondary"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary disabled:opacity-50"
            >
              {loading ? 'Saving...' : isEdit ? 'Update Vendor' : 'Create Vendor'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default VendorForm;
