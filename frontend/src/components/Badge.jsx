import React from 'react';

/**
 * Badge Component
 * Displays status or classification badges with color coding
 */
export const Badge = ({ 
  children, 
  variant = 'default', 
  size = 'md',
  className = '' 
}) => {
  const baseStyles = 'inline-flex items-center font-medium rounded-full';
  
  const variants = {
    default: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
    primary: 'bg-primary-100 text-primary-800',
  };
  
  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-sm',
    lg: 'px-3 py-1 text-base',
  };
  
  return (
    <span 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </span>
  );
};

/**
 * Risk Badge Component
 * Specialized badge for risk levels with appropriate colors
 */
export const RiskBadge = ({ level }) => {
  const getVariant = () => {
    switch (level?.toLowerCase()) {
      case 'low':
        return 'success';
      case 'medium':
        return 'warning';
      case 'high':
        return 'danger';
      case 'critical':
        return 'danger';
      default:
        return 'default';
    }
  };
  
  return (
    <Badge variant={getVariant()} size="md">
      {level || 'Unknown'}
    </Badge>
  );
};

/**
 * Status Badge Component
 * Specialized badge for vendor/assessment status
 */
export const StatusBadge = ({ status }) => {
  const getVariant = () => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'completed':
        return 'success';
      case 'pending':
      case 'in_progress':
        return 'warning';
      case 'archived':
      case 'expired':
      case 'cancelled':
        return 'default';
      default:
        return 'info';
    }
  };
  
  const formatStatus = (s) => {
    if (!s) return 'Unknown';
    return s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };
  
  return (
    <Badge variant={getVariant()} size="md">
      {formatStatus(status)}
    </Badge>
  );
};

export default Badge;
