import React from 'react';
import { Cog6ToothIcon } from '@heroicons/react/24/outline';

function SettingsPage() {
  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="text-center py-12">
        <Cog6ToothIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-lg font-medium text-gray-900">Settings</h3>
        <p className="mt-1 text-sm text-gray-500">
          Settings functionality coming soon. This will include user management, tenant configuration, and system preferences.
        </p>
      </div>
    </div>
  );
}

export default SettingsPage;