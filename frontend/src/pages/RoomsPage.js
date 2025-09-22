import React from 'react';
import { KeyIcon } from '@heroicons/react/24/outline';

function RoomsPage() {
  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="text-center py-12">
        <KeyIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-lg font-medium text-gray-900">Rooms Management</h3>
        <p className="mt-1 text-sm text-gray-500">
          Room management functionality coming soon. This will include room types, availability, and pricing.
        </p>
      </div>
    </div>
  );
}

export default RoomsPage;