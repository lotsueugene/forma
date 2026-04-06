'use client';

import { useState, useEffect } from 'react';
import { Spinner, FloppyDisk, Check } from '@phosphor-icons/react';

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [platformFee, setPlatformFee] = useState('5');

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.settings?.platform_fee_percentage) {
          setPlatformFee(data.settings.platform_fee_percentage);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    const fee = parseFloat(platformFee);
    if (isNaN(fee) || fee < 0 || fee > 50) {
      setError('Fee must be between 0% and 50%');
      return;
    }

    setSaving(true);
    setError('');
    setSaved(false);

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'platform_fee_percentage', value: fee.toString() }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Failed to save setting');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size={24} className="animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Platform Settings</h1>
        <p className="text-gray-600">Configure platform-wide settings</p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* Payment Settings */}
      <div className="card p-5 space-y-4">
        <h2 className="font-medium text-gray-900">Payment Settings</h2>

        <div className="max-w-sm space-y-2">
          <label className="text-sm font-medium text-gray-700">Platform Fee (%)</label>
          <p className="text-xs text-gray-500">
            Percentage taken from each form payment. Charged via Stripe Connect application_fee_amount.
          </p>
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <input
                type="number"
                min="0"
                max="50"
                step="0.1"
                value={platformFee}
                onChange={(e) => setPlatformFee(e.target.value)}
                className="input pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn btn-primary flex items-center gap-2"
            >
              {saving ? (
                <Spinner size={16} className="animate-spin" />
              ) : saved ? (
                <Check size={16} />
              ) : (
                <FloppyDisk size={16} />
              )}
              {saved ? 'Saved' : 'Save'}
            </button>
          </div>
          <p className="text-xs text-gray-400">
            Example: On a $100 payment with {platformFee}% fee, you receive ${(100 * parseFloat(platformFee || '0') / 100).toFixed(2)} and the form creator receives ${(100 - 100 * parseFloat(platformFee || '0') / 100).toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
}
