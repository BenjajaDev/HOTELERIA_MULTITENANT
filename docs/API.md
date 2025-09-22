# API Documentation

## Authentication

All API requests (except authentication endpoints) require a valid JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

Additionally, you must provide the tenant ID in one of the following ways:
- Header: `x-tenant-id: <tenant-id>`
- Query parameter: `?tenant=<tenant-id>`
- Subdomain: `<tenant-id>.yourapp.com`

## Base URL

Development: `http://localhost:3001/api`
Production: `https://yourapp.com/api`

## Endpoints

### Authentication

#### POST /auth/login
Authenticate a user and receive a JWT token.

**Request Body:**
```json
{
  "email": "admin@demo.com",
  "password": "password123",
  "tenantId": "demo"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "admin@demo.com",
    "name": "Admin User",
    "role": "admin"
  },
  "tenant": {
    "id": "demo",
    "name": "Demo Hotel Group"
  }
}
```

#### POST /auth/register
Create a new user (requires admin role).

**Request Body:**
```json
{
  "email": "newuser@demo.com",
  "password": "password123",
  "name": "New User",
  "role": "manager",
  "tenantId": "demo"
}
```

### Hotels

#### GET /hotels
Get all hotels for the current tenant.

**Response:**
```json
{
  "hotels": [
    {
      "id": 1,
      "name": "Grand Hotel",
      "address": "123 Main St",
      "city": "New York",
      "country": "USA",
      "phone": "+1-555-0123",
      "email": "info@grandhotel.com",
      "total_rooms": 150,
      "available_rooms": 45
    }
  ]
}
```

#### POST /hotels
Create a new hotel (requires `manage_hotels` permission).

**Request Body:**
```json
{
  "name": "Beach Resort",
  "address": "456 Ocean Drive",
  "city": "Miami",
  "country": "USA",
  "phone": "+1-555-0456",
  "email": "info@beachresort.com",
  "description": "Luxury beachfront resort",
  "amenities": ["pool", "spa", "restaurant", "wifi"]
}
```

#### PUT /hotels/:id
Update an existing hotel.

#### DELETE /hotels/:id
Delete a hotel.

### Error Responses

All endpoints return consistent error responses:

```json
{
  "error": "Error message",
  "details": "Additional error details (in development mode)"
}
```

**HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `429` - Too Many Requests
- `500` - Internal Server Error