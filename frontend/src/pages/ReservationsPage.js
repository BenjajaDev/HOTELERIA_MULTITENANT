import React from 'react';
import { CalendarDaysIcon } from '@heroicons/react/24/outline';

function ReservationsPage() {
  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="text-center py-12">
        <CalendarDaysIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-lg font-medium text-gray-900">Reservations Management</h3>
        <p className="mt-1 text-sm text-gray-500">
          Reservation management functionality coming soon. This will include booking, check-in/out, and guest management.
        </p>
      </div>
    </div>
  );
}

export default ReservationsPage;