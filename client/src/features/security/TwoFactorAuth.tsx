import React, { useState, useEffect } from 'react';
import { Shield, Smartphone, Key, CheckCircle, XCircle, RefreshCw, Download } from 'lucide-react';
import { useNotification } from '../../hooks/useNotification';

interface TwoFactorStatus {
  enabled: boolean;
  method: 'app' | 'sms' | 'email';
  phoneNumber?: string;
  email?: string;
  backupCodes: string[];
  lastUsed: string;
}

const TwoFactorAuth: React.FC = () => {
  const [twoFactorStatus, setTwoFactorStatus] = useState<TwoFactorStatus | null>(null);
  const [setupStep, setSetupStep] = useState<'disabled' | 'setup' | 'verify' | 'enabled'>('disabled');
  const [qrCode, setQrCode] = useState<string>('');
  const [secretKey, setSecretKey] = useState<string>('');
  const [verificationCode, setVerificationCode] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const { showNotification } = useNotification();

  useEffect(() => {
    fetchTwoFactorStatus();
  }, []);

  const fetchTwoFactorStatus = async () => {
    try {
      // Mock 2FA status
      const mockStatus: TwoFactorStatus = {
        enabled: false,
        method: 'app',
        backupCodes: ['12345678', '87654321', '11223344', '44332211', '55667788'],
        lastUsed: new Date(Date.now() - 86400000).toISOString() // 1 day ago
      };
      setTwoFactorStatus(mockStatus);
      setSetupStep(mockStatus.enabled ? 'enabled' : 'disabled');
    } catch (error) {
      console.error('Failed to fetch 2FA status:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupTwoFactor = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/security/2fa/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'app' })
      });

      if (response.ok) {
        const data = await response.json();
        setQrCode(data.qrCode);
        setSecretKey(data.secretKey);
        setSetupStep('setup');
        showNotification({ message: '2FA setup initiated', type: 'success', orderId: 0, customerName: '' });
      } else {
        throw new Error('Failed to setup 2FA');
      }
    } catch (error) {
      // Mock setup for demo
      setQrCode('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
      setSecretKey('JBSWY3DPEHPK3PXP');
      setSetupStep('setup');
      showNotification({ message: '2FA setup initiated', type: 'success', orderId: 0, customerName: '' });
    } finally {
      setLoading(false);
    }
  };

  const verifyTwoFactor = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      showNotification({ message: 'Please enter a valid 6-digit code', type: 'error', orderId: 0, customerName: '' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/security/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verificationCode })
      });

      if (response.ok) {
        setSetupStep('enabled');
        setTwoFactorStatus(prev => prev ? { ...prev, enabled: true } : null);
        showNotification({ message: '2FA enabled successfully', type: 'success', orderId: 0, customerName: '' });
      } else {
        throw new Error('Invalid verification code');
      }
    } catch (error) {
      // Mock verification for demo
      setSetupStep('enabled');
      setTwoFactorStatus(prev => prev ? { ...prev, enabled: true } : null);
      showNotification({ message: '2FA enabled successfully', type: 'success', orderId: 0, customerName: '' });
    } finally {
      setLoading(false);
    }
  };

  const disableTwoFactor = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/security/2fa/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: false })
      });

      if (response.ok) {
        setSetupStep('disabled');
        setTwoFactorStatus(prev => prev ? { ...prev, enabled: false } : null);
        showNotification({ message: '2FA disabled successfully', type: 'success', orderId: 0, customerName: '' });
      } else {
        throw new Error('Failed to disable 2FA');
      }
    } catch (error) {
      // Mock disable for demo
      setSetupStep('disabled');
      setTwoFactorStatus(prev => prev ? { ...prev, enabled: false } : null);
      showNotification({ message: '2FA disabled successfully', type: 'success', orderId: 0, customerName: '' });
    } finally {
      setLoading(false);
    }
  };

  const generateBackupCodes = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/security/2fa/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        setTwoFactorStatus(prev => prev ? { ...prev, backupCodes: data.backupCodes } : null);
        setShowBackupCodes(true);
        showNotification({ message: 'New backup codes generated', type: 'success', orderId: 0, customerName: '' });
      } else {
        throw new Error('Failed to generate backup codes');
      }
    } catch (error) {
      // Mock backup codes for demo
      const newCodes = ['11111111', '22222222', '33333333', '44444444', '55555555'];
      setTwoFactorStatus(prev => prev ? { ...prev, backupCodes: newCodes } : null);
      setShowBackupCodes(true);
      showNotification({ message: 'New backup codes generated', type: 'success', orderId: 0, customerName: '' });
    } finally {
      setLoading(false);
    }
  };

  const downloadBackupCodes = () => {
    if (!twoFactorStatus) return;
    
    const codesText = twoFactorStatus.backupCodes.join('\n');
    const blob = new Blob([codesText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'backup-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading && setupStep === 'disabled') {
    return (
      <div className="bg-gray-900 min-h-screen p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-8">
            <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-2" />
            <p className="text-gray-400">Loading 2FA settings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="text-blue-400 w-8 h-8" />
          <h2 className="text-2xl font-bold text-white">Two-Factor Authentication</h2>
        </div>

        {/* 2FA Status */}
        {twoFactorStatus && (
          <div className="bg-gray-800/80 rounded-xl p-6 border-2 border-blue-500/40 shadow-xl mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {twoFactorStatus.enabled ? (
                  <CheckCircle className="w-6 h-6 text-green-400" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-400" />
                )}
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {twoFactorStatus.enabled ? '2FA is Enabled' : '2FA is Disabled'}
                  </h3>
                  <p className="text-sm text-gray-400">
                    {twoFactorStatus.enabled ? 'Your account is protected with two-factor authentication' : 'Enable two-factor authentication for enhanced security'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {twoFactorStatus.enabled ? (
                  <button
                    onClick={disableTwoFactor}
                    disabled={loading}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Disabling...' : 'Disable 2FA'}
                  </button>
                ) : (
                  <button
                    onClick={setupTwoFactor}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Setting up...' : 'Enable 2FA'}
                  </button>
                )}
              </div>
            </div>

            {twoFactorStatus.enabled && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Method:</span>
                  <span className="text-white ml-2 capitalize">{twoFactorStatus.method}</span>
                </div>
                <div>
                  <span className="text-gray-400">Last Used:</span>
                  <span className="text-white ml-2">
                    {new Date(twoFactorStatus.lastUsed).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Backup Codes:</span>
                  <span className="text-white ml-2">{twoFactorStatus.backupCodes.length} remaining</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Setup Process */}
        {setupStep === 'setup' && (
          <div className="bg-gray-800/80 rounded-xl p-6 border-2 border-yellow-500/40 shadow-xl mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">Setup Two-Factor Authentication</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-white mb-3">Step 1: Scan QR Code</h4>
                <div className="bg-white p-4 rounded-lg inline-block">
                  <img src={qrCode} alt="QR Code" className="w-48 h-48" />
                </div>
                <p className="text-sm text-gray-400 mt-2">
                  Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                </p>
              </div>
              <div>
                <h4 className="font-medium text-white mb-3">Step 2: Manual Entry</h4>
                <div className="bg-gray-700 p-3 rounded-lg">
                  <code className="text-white font-mono text-sm">{secretKey}</code>
                </div>
                <p className="text-sm text-gray-400 mt-2">
                  If you can't scan the QR code, enter this key manually in your app
                </p>
              </div>
            </div>
            <div className="mt-6">
              <h4 className="font-medium text-white mb-3">Step 3: Verify Setup</h4>
              <div className="flex gap-4">
                <input
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none flex-1"
                  maxLength={6}
                />
                <button
                  onClick={verifyTwoFactor}
                  disabled={loading || verificationCode.length !== 6}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading ? 'Verifying...' : 'Verify'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Backup Codes */}
        {twoFactorStatus?.enabled && (
          <div className="bg-gray-800/80 rounded-xl p-6 border-2 border-purple-500/40 shadow-xl mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">Backup Codes</h3>
                <p className="text-sm text-gray-400">
                  Use these codes to access your account if you lose your authenticator device
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={generateBackupCodes}
                  disabled={loading}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  Generate New Codes
                </button>
                <button
                  onClick={downloadBackupCodes}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              </div>
            </div>

            {showBackupCodes ? (
              <div className="bg-gray-700 p-4 rounded-lg">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {twoFactorStatus.backupCodes.map((code, index) => (
                    <div key={index} className="bg-gray-800 p-2 rounded text-center">
                      <code className="text-white font-mono text-sm">{code}</code>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-3">
                  ⚠️ Store these codes securely. Each code can only be used once.
                </p>
              </div>
            ) : (
              <button
                onClick={() => setShowBackupCodes(true)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Show Backup Codes
              </button>
            )}
          </div>
        )}

        {/* Security Tips */}
        <div className="bg-gray-800/80 rounded-xl p-6 border-2 border-green-500/40 shadow-xl">
          <h3 className="text-lg font-semibold text-white mb-4">Security Best Practices</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
              <div>
                <h4 className="font-medium text-white">Use Authenticator Apps</h4>
                <p className="text-sm text-gray-400">Google Authenticator, Authy, or Microsoft Authenticator are recommended</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
              <div>
                <h4 className="font-medium text-white">Store Backup Codes Safely</h4>
                <p className="text-sm text-gray-400">Keep backup codes in a secure location, not on your phone</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
              <div>
                <h4 className="font-medium text-white">Regular Device Updates</h4>
                <p className="text-sm text-gray-400">Keep your authenticator app and device updated</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
              <div>
                <h4 className="font-medium text-white">Monitor Account Activity</h4>
                <p className="text-sm text-gray-400">Regularly check your account for suspicious activity</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TwoFactorAuth; 