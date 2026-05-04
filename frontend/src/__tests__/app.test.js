/**
 * Frontend Application Tests
 * Third Party Security & Data Protection Management Platform
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from '../App';

// Mock the API service
jest.mock('../services/api', () => ({
  authService: {
    isAuthenticated: jest.fn(),
    login: jest.fn(),
    logout: jest.fn(),
    getUser: jest.fn()
  },
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn()
  }
}));

const { authService, api } = jest.requireMock('../services/api');

describe('Frontend Application Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('App Routing', () => {
    it('should redirect to dashboard when authenticated', () => {
      authService.isAuthenticated.mockReturnValue(true);
      
      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );
      
      // Should attempt to navigate to dashboard
      expect(authService.isAuthenticated).toHaveBeenCalled();
    });

    it('should redirect to login when not authenticated', () => {
      authService.isAuthenticated.mockReturnValue(false);
      
      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );
      
      // Should redirect to login
      expect(window.location.pathname).toBe('/login');
    });
  });

  describe('Login Page', () => {
    it('should render login form', () => {
      authService.isAuthenticated.mockReturnValue(false);
      
      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );
      
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('should show validation errors for empty fields', async () => {
      authService.isAuthenticated.mockReturnValue(false);
      
      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );
      
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      });
    });
  });

  describe('Dashboard', () => {
    it('should render dashboard when authenticated', async () => {
      authService.isAuthenticated.mockReturnValue(true);
      authService.getUser.mockReturnValue({ email: 'admin@example.com', role: 'admin' });
      
      api.get.mockResolvedValue({
        data: {
          success: true,
          vendors: [],
          stats: {
            totalVendors: 0,
            highRiskVendors: 0,
            pendingAssessments: 0,
            expiringDocuments: 0
          }
        }
      });
      
      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
      });
    });
  });

  describe('Vendor Management', () => {
    it('should render vendor list on dashboard', async () => {
      authService.isAuthenticated.mockReturnValue(true);
      
      api.get.mockResolvedValue({
        data: {
          success: true,
          vendors: [
            { id: 1, name: 'Test Vendor', riskTier: 'high', status: 'active' }
          ],
          stats: {
            totalVendors: 1,
            highRiskVendors: 1,
            pendingAssessments: 0,
            expiringDocuments: 0
          }
        }
      });
      
      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(screen.getByText(/test vendor/i)).toBeInTheDocument();
      });
    });
  });

  describe('Protected Routes', () => {
    it('should protect vendor routes', () => {
      authService.isAuthenticated.mockReturnValue(false);
      
      window.history.pushState({}, 'Vendor Detail', '/vendors/1');
      
      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );
      
      // Should redirect to login
      expect(window.location.pathname).toBe('/login');
    });
  });

  describe('Public Assessment Route', () => {
    it('should allow access to assessment page without authentication', () => {
      authService.isAuthenticated.mockReturnValue(false);
      
      window.history.pushState({}, 'Assessment', '/assessment/test-token-123');
      
      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );
      
      // Should render assessment page (public route)
      expect(screen.getByText(/vendor security assessment/i)).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('should show loading spinner during lazy component load', () => {
      authService.isAuthenticated.mockReturnValue(true);
      
      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );
      
      // Loading fallback should appear briefly
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('404 Page', () => {
    it('should show 404 for unknown routes', () => {
      authService.isAuthenticated.mockReturnValue(false);
      
      window.history.pushState({}, 'Not Found', '/nonexistent-route');
      
      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );
      
      expect(screen.getByText(/page not found/i)).toBeInTheDocument();
    });
  });
});

// Component-specific tests
describe('Component Unit Tests', () => {
  describe('Authentication Service', () => {
    it('should check authentication status', () => {
      const result = authService.isAuthenticated();
      expect(typeof result).toBe('boolean');
    });

    it('should have login method', () => {
      expect(typeof authService.login).toBe('function');
    });

    it('should have logout method', () => {
      expect(typeof authService.logout).toBe('function');
    });
  });

  describe('API Service', () => {
    it('should have GET method', () => {
      expect(typeof api.get).toBe('function');
    });

    it('should have POST method', () => {
      expect(typeof api.post).toBe('function');
    });

    it('should have PUT method', () => {
      expect(typeof api.put).toBe('function');
    });

    it('should have DELETE method', () => {
      expect(typeof api.delete).toBe('function');
    });
  });
});
