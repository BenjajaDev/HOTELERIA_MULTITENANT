import React from 'react';
import { BuildingOfficeIcon, PlusIcon } from '@heroicons/react/24/outline';

function HotelsPage() {
  // Sample hotel data
  const hotels = [
    {
      id: 1,
      name: 'Grand Hotel',
      address: '123 Main St, Downtown',
      city: 'New York',
      country: 'USA',
      totalRooms: 150,
      availableRooms: 45,
      phone: '+1-555-0123',
      email: 'info@grandhotel.com',
    },
    {
      id: 2,
      name: 'Beach Resort',
      address: '456 Ocean Drive',
      city: 'Miami',
      country: 'USA',
      totalRooms: 200,
      availableRooms: 87,
      phone: '+1-555-0456',
      email: 'reservations@beachresort.com',
    },
  ];

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="sm:flex sm:items-center mb-8">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-bold text-gray-900">Hotels</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage your hotel properties and their information.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button className="btn-primary inline-flex items-center">
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Hotel
          </button>
        </div>
      </div>

      {/* Hotels Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {hotels.map((hotel) => (
          <div key={hotel.id} className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <BuildingOfficeIcon className="h-8 w-8 text-blue-600" />
                <h3 className="ml-3 text-lg font-medium text-gray-900">
                  {hotel.name}
                </h3>
              </div>
            </div>
            
            <div className="space-y-2 text-sm text-gray-600">
              <p>{hotel.address}</p>
              <p>{hotel.city}, {hotel.country}</p>
              <p>Phone: {hotel.phone}</p>
              <p>Email: {hotel.email}</p>
            </div>
            
            <div className="mt-4 flex justify-between items-center text-sm">
              <div>
                <span className="font-medium text-gray-900">
                  {hotel.availableRooms} / {hotel.totalRooms}
                </span>
                <span className="text-gray-500 ml-1">rooms available</span>
              </div>
              <div className="flex space-x-2">
                <button className="text-blue-600 hover:text-blue-800">
                  Edit
                </button>
                <button className="text-red-600 hover:text-red-800">
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {hotels.length === 0 && (
        <div className="text-center py-12">
          <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hotels</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by adding your first hotel property.
          </p>
          <div className="mt-6">
            <button className="btn-primary inline-flex items-center">
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Hotel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default HotelsPage;