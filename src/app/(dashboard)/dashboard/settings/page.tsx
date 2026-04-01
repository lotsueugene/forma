import { Suspense } from 'react';
import SettingsClient from './settings-client';

function SettingsLoading() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <span className="text-sm text-gray-500">Loading settings…</span>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<SettingsLoading />}>
      <SettingsClient />
    </Suspense>
  );
}
