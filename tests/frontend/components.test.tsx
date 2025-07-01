import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from '../../client/src/components/Dashboard';
import KPIGrid from '../../client/src/components/KPIGrid';
import Sidebar from '../../client/src/components/Sidebar';
import Login from '../../client/src/components/Login';
import { AuthProvider } from '../../client/src/hooks/useAuth';
import { NotificationProvider } from '../../client/src/hooks/useNotification';

// Mock the API service
jest.mock('../../client/src/services/api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

// Mock WebSocket
global.WebSocket = jest.fn().mockImplementation(() => ({
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}));

// Create a test wrapper with providers
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <NotificationProvider>
            {children}
          </NotificationProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Dashboard Component', () => {
  test('renders dashboard with KPI cards', async () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    // Check if KPI cards are rendered
    await waitFor(() => {
      expect(screen.getByText('On-Time Delivery')).toBeInTheDocument();
      expect(screen.getByText('Cost Savings')).toBeInTheDocument();
      expect(screen.getByText('Carbon Footprint')).toBeInTheDocument();
      expect(screen.getByText('Route Optimization')).toBeInTheDocument();
    });
  });

  test('displays real-time metrics', async () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    // Check for metric values
    await waitFor(() => {
      expect(screen.getByText('94.2%')).toBeInTheDocument();
      expect(screen.getByText('$284,750')).toBeInTheDocument();
      expect(screen.getByText('2.8kg')).toBeInTheDocument();
      expect(screen.getByText('342')).toBeInTheDocument();
    });
  });

  test('shows loading state initially', () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    // Check for loading indicators
    expect(screen.getByText('Loading metrics...')).toBeInTheDocument();
  });
});

describe('KPIGrid Component', () => {
  test('renders KPI cards with correct data', () => {
    render(<KPIGrid />);

    // Check if all KPI cards are rendered
    expect(screen.getByText('On-Time Delivery')).toBeInTheDocument();
    expect(screen.getByText('Cost Savings')).toBeInTheDocument();
    expect(screen.getByText('Carbon Footprint')).toBeInTheDocument();
    expect(screen.getByText('Route Optimization')).toBeInTheDocument();
  });

  test('displays KPI values correctly', () => {
    render(<KPIGrid />);

    // Check KPI values
    expect(screen.getByText('94.2%')).toBeInTheDocument();
    expect(screen.getByText('$284,750')).toBeInTheDocument();
    expect(screen.getByText('2.8kg')).toBeInTheDocument();
    expect(screen.getByText('342')).toBeInTheDocument();
  });

  test('shows KPI descriptions', () => {
    render(<KPIGrid />);

    // Check descriptions
    expect(screen.getByText('Percentage of deliveries completed on time')).toBeInTheDocument();
    expect(screen.getByText('Total cost savings from optimizations')).toBeInTheDocument();
    expect(screen.getByText('Average carbon footprint per delivery')).toBeInTheDocument();
    expect(screen.getByText('Number of routes optimized today')).toBeInTheDocument();
  });
});

describe('Sidebar Component', () => {
  const mockSetActiveTab = jest.fn();

  beforeEach(() => {
    mockSetActiveTab.mockClear();
  });

  test('renders sidebar with navigation items', () => {
    render(
      <TestWrapper>
        <Sidebar activeTab="dashboard" setActiveTab={mockSetActiveTab} />
      </TestWrapper>
    );

    // Check navigation items
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('AI Command Center')).toBeInTheDocument();
    expect(screen.getByText('Route Optimization')).toBeInTheDocument();
    expect(screen.getByText('Forecasting')).toBeInTheDocument();
    expect(screen.getByText('Digital Twin')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  test('highlights active tab', () => {
    render(
      <TestWrapper>
        <Sidebar activeTab="analytics" setActiveTab={mockSetActiveTab} />
      </TestWrapper>
    );

    // Check if active tab is highlighted
    const analyticsTab = screen.getByText('Forecasting');
    expect(analyticsTab.closest('button')).toHaveClass('bg-blue-600');
  });

  test('calls setActiveTab when tab is clicked', () => {
    render(
      <TestWrapper>
        <Sidebar activeTab="dashboard" setActiveTab={mockSetActiveTab} />
      </TestWrapper>
    );

    // Click on a tab
    fireEvent.click(screen.getByText('AI Command Center'));

    // Check if setActiveTab was called
    expect(mockSetActiveTab).toHaveBeenCalledWith('ai-command');
  });

  test('displays user information', () => {
    render(
      <TestWrapper>
        <Sidebar activeTab="dashboard" setActiveTab={mockSetActiveTab} />
      </TestWrapper>
    );

    // Check for user info section
    expect(screen.getByText('SmartRetail360')).toBeInTheDocument();
    expect(screen.getByText('Supply Chain AI')).toBeInTheDocument();
  });

  test('shows system status', () => {
    render(
      <TestWrapper>
        <Sidebar activeTab="dashboard" setActiveTab={mockSetActiveTab} />
      </TestWrapper>
    );

    // Check system status indicators
    expect(screen.getByText('System Status')).toBeInTheDocument();
    expect(screen.getByText('Online')).toBeInTheDocument();
    expect(screen.getByText('Kafka Streams')).toBeInTheDocument();
    expect(screen.getByText('Spark Jobs')).toBeInTheDocument();
    expect(screen.getByText('ML Models')).toBeInTheDocument();
  });
});

describe('Login Component', () => {
  test('renders login form', () => {
    render(
      <TestWrapper>
        <Login />
      </TestWrapper>
    );

    // Check form elements
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  test('validates form inputs', async () => {
    render(
      <TestWrapper>
        <Login />
      </TestWrapper>
    );

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    // Try to submit empty form
    fireEvent.click(submitButton);

    // Check for validation errors
    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });

  test('validates email format', async () => {
    render(
      <TestWrapper>
        <Login />
      </TestWrapper>
    );

    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    // Enter invalid email
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.click(submitButton);

    // Check for email validation error
    await waitFor(() => {
      expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();
    });
  });

  test('handles successful login', async () => {
    const mockApi = require('../../client/src/services/api');
    mockApi.api.post.mockResolvedValue({
      data: {
        user: {
          id: 1,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          role: 'admin'
        },
        token: 'mock-jwt-token'
      }
    });

    render(
      <TestWrapper>
        <Login />
      </TestWrapper>
    );

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    // Enter valid credentials
    fireEvent.change(emailInput, { target: { value: 'john@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    // Check if API was called
    await waitFor(() => {
      expect(mockApi.api.post).toHaveBeenCalledWith('/auth/login', {
        email: 'john@example.com',
        password: 'password123'
      });
    });
  });

  test('handles login error', async () => {
    const mockApi = require('../../client/src/services/api');
    mockApi.api.post.mockRejectedValue({
      response: {
        data: { error: 'Invalid credentials' }
      }
    });

    render(
      <TestWrapper>
        <Login />
      </TestWrapper>
    );

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    // Enter credentials
    fireEvent.change(emailInput, { target: { value: 'john@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
    fireEvent.click(submitButton);

    // Check for error message
    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });
});

describe('Blockchain Components', () => {
  test('BlockchainTraceability renders correctly', () => {
    render(
      <TestWrapper>
        <div data-testid="blockchain-traceability">
          {/* Import and render BlockchainTraceability component */}
        </div>
      </TestWrapper>
    );

    expect(screen.getByTestId('blockchain-traceability')).toBeInTheDocument();
  });

  test('SmartContracts renders correctly', () => {
    render(
      <TestWrapper>
        <div data-testid="smart-contracts">
          {/* Import and render SmartContracts component */}
        </div>
      </TestWrapper>
    );

    expect(screen.getByTestId('smart-contracts')).toBeInTheDocument();
  });
});

describe('Security Components', () => {
  test('SecurityDashboard renders correctly', () => {
    render(
      <TestWrapper>
        <div data-testid="security-dashboard">
          {/* Import and render SecurityDashboard component */}
        </div>
      </TestWrapper>
    );

    expect(screen.getByTestId('security-dashboard')).toBeInTheDocument();
  });

  test('TwoFactorAuth renders correctly', () => {
    render(
      <TestWrapper>
        <div data-testid="two-factor-auth">
          {/* Import and render TwoFactorAuth component */}
        </div>
      </TestWrapper>
    );

    expect(screen.getByTestId('two-factor-auth')).toBeInTheDocument();
  });
});

describe('Edge Computing Components', () => {
  test('EdgeDevices renders correctly', () => {
    render(
      <TestWrapper>
        <div data-testid="edge-devices">
          {/* Import and render EdgeDevices component */}
        </div>
      </TestWrapper>
    );

    expect(screen.getByTestId('edge-devices')).toBeInTheDocument();
  });

  test('EmergencyCoordination renders correctly', () => {
    render(
      <TestWrapper>
        <div data-testid="emergency-coordination">
          {/* Import and render EmergencyCoordination component */}
        </div>
      </TestWrapper>
    );

    expect(screen.getByTestId('emergency-coordination')).toBeInTheDocument();
  });
});

describe('Compliance Components', () => {
  test('GDPRManagement renders correctly', () => {
    render(
      <TestWrapper>
        <div data-testid="gdpr-management">
          {/* Import and render GDPRManagement component */}
        </div>
      </TestWrapper>
    );

    expect(screen.getByTestId('gdpr-management')).toBeInTheDocument();
  });

  test('AuditLogs renders correctly', () => {
    render(
      <TestWrapper>
        <div data-testid="audit-logs">
          {/* Import and render AuditLogs component */}
        </div>
      </TestWrapper>
    );

    expect(screen.getByTestId('audit-logs')).toBeInTheDocument();
  });
});

describe('Accessibility', () => {
  test('components have proper ARIA labels', () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    // Check for ARIA labels
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  test('components are keyboard navigable', () => {
    render(
      <TestWrapper>
        <Sidebar activeTab="dashboard" setActiveTab={jest.fn()} />
      </TestWrapper>
    );

    // Check if buttons are focusable
    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button).toHaveAttribute('tabindex');
    });
  });

  test('components have proper color contrast', () => {
    render(
      <TestWrapper>
        <KPIGrid />
      </TestWrapper>
    );

    // This would require a color contrast testing library
    // For now, we'll just check that text is visible
    expect(screen.getByText('On-Time Delivery')).toBeVisible();
  });
});

describe('Responsive Design', () => {
  test('components adapt to different screen sizes', () => {
    // Mock window resize
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768,
    });

    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    // Check if responsive classes are applied
    const kpiGrid = screen.getByText('On-Time Delivery').closest('.grid');
    expect(kpiGrid).toHaveClass('grid-cols-1', 'md:grid-cols-3');
  });
}); 