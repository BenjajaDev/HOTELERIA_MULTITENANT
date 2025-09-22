# 🏨 Hotel Management System - Multi-Tenant

A comprehensive multi-tenant hotel management system built with React, Express.js, PostgreSQL, and Docker. This system allows multiple hotel chains or management companies to manage their properties independently within a single application.

## ✨ Features

### 🏢 Multi-Tenancy
- **Tenant Isolation**: Complete data separation between different hotel groups
- **Subdomain Support**: Access via custom subdomains (e.g., `demo.yourapp.com`)
- **Tenant Management**: Easy onboarding and configuration of new hotel groups

### 🏨 Hotel Management
- **Property Management**: Add, edit, and manage multiple hotel properties
- **Room Management**: Comprehensive room types, pricing, and availability
- **Reservation System**: Full booking lifecycle from reservation to checkout
- **Guest Management**: Customer profiles and history tracking

### 🔐 Security & Access Control
- **JWT Authentication**: Secure token-based authentication
- **Role-Based Access**: Admin, Manager, Receptionist, and Staff roles
- **Permission System**: Granular permission control for different features
- **Rate Limiting**: Protection against abuse and DDoS attacks

### 📊 Dashboard & Analytics
- **Real-time Statistics**: Occupancy rates, revenue, and performance metrics
- **Reservation Overview**: Today's check-ins, check-outs, and pending reservations
- **Revenue Tracking**: Financial insights and reporting capabilities

## 🛠️ Technology Stack

### Backend
- **Node.js** with **Express.js** - REST API server
- **PostgreSQL** - Multi-tenant database with schema separation
- **JWT** - Authentication and authorization
- **Joi** - Input validation
- **Bcrypt** - Password hashing
- **Rate Limiter** - Request rate limiting

### Frontend
- **React 18** - Modern React with hooks
- **React Router** - Client-side routing
- **Tailwind CSS** - Utility-first CSS framework
- **React Query** - Server state management
- **React Hook Form** - Form handling and validation
- **Heroicons** - Beautiful icon set

### Infrastructure
- **Docker** - Containerization for all services
- **Docker Compose** - Multi-container orchestration
- **Nginx** - Reverse proxy and load balancer (production)
- **PostgreSQL** - Primary database with tenant separation

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose installed
- Git installed
- 8GB+ RAM recommended

### 1. Clone the Repository
```bash
git clone https://github.com/BenjajaDev/HOTELERIA_MULTITENANT.git
cd HOTELERIA_MULTITENANT
```

### 2. Run Setup Script
```bash
./scripts/setup.sh
```

This script will:
- Create environment files from examples
- Build Docker containers
- Start all services
- Initialize the database

### 3. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Database**: localhost:5432

### 4. Demo Login
Use these credentials to explore the system:
- **Tenant ID**: `demo`
- **Email**: `admin@demo.com`
- **Password**: `password123`

## 📁 Project Structure

```
HOTELERIA_MULTITENANT/
├── backend/                 # Express.js API server
│   ├── src/
│   │   ├── config/         # Database and app configuration
│   │   ├── controllers/    # Request handlers
│   │   ├── middleware/     # Custom middleware (auth, tenant, etc.)
│   │   ├── models/         # Data models and schemas
│   │   ├── routes/         # API route definitions
│   │   ├── services/       # Business logic services
│   │   └── utils/          # Utility functions
│   ├── tests/              # Backend tests
│   ├── migrations/         # Database migrations
│   ├── Dockerfile          # Production Docker image
│   ├── Dockerfile.dev      # Development Docker image
│   └── package.json        # Node.js dependencies
├── frontend/               # React application
│   ├── src/
│   │   ├── components/     # Reusable React components
│   │   ├── pages/          # Page components
│   │   ├── context/        # React context providers
│   │   ├── hooks/          # Custom React hooks
│   │   ├── services/       # API service functions
│   │   ├── utils/          # Utility functions
│   │   └── assets/         # Static assets
│   ├── public/             # Public assets
│   ├── Dockerfile          # Production Docker image
│   ├── Dockerfile.dev      # Development Docker image
│   └── package.json        # React dependencies
├── docker/                 # Docker configuration
│   ├── nginx/              # Nginx configuration
│   └── postgres/           # PostgreSQL initialization
├── scripts/                # Utility scripts
│   ├── setup.sh            # Development setup
│   ├── deploy.sh           # Production deployment
│   └── stop.sh             # Stop all services
├── docs/                   # Documentation
├── docker-compose.yml      # Production Docker Compose
├── docker-compose.dev.yml  # Development Docker Compose
└── README.md               # This file
```

## 🔧 Development

### Running in Development Mode
```bash
# Start development environment
./scripts/setup.sh

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop services
./scripts/stop.sh
```

### Environment Variables
Copy the example environment files and modify as needed:
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### Database Management
The system uses PostgreSQL with a multi-tenant architecture:
- **Master Database**: Stores tenant information and configurations
- **Tenant Databases**: Separate databases for each tenant's data

### API Documentation
The API follows RESTful conventions:
- `GET /api/hotels` - List all hotels for tenant
- `POST /api/hotels` - Create new hotel
- `PUT /api/hotels/:id` - Update hotel
- `DELETE /api/hotels/:id` - Delete hotel

Authentication required for all API endpoints except `/api/auth/*`.

## 🚀 Production Deployment

### Using Docker (Recommended)
```bash
# Deploy to production
./scripts/deploy.sh
```

### Manual Deployment
1. Set production environment variables
2. Build Docker images:
   ```bash
   docker-compose build
   ```
3. Start services:
   ```bash
   docker-compose --profile production up -d
   ```

### Environment Configuration
For production, ensure you:
- Change JWT secret keys
- Use strong database passwords
- Configure SSL certificates
- Set up proper DNS and load balancing
- Enable database backups

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test
npm run test:coverage
```

### Frontend Tests
```bash
cd frontend
npm test
npm run test:coverage
```

### End-to-End Tests
```bash
# Coming soon - Cypress E2E tests
```

## 📚 API Reference

### Authentication Endpoints
- `POST /api/auth/login` - User authentication
- `POST /api/auth/register` - Create new user (admin only)

### Hotel Management
- `GET /api/hotels` - List hotels
- `GET /api/hotels/:id` - Get hotel details
- `POST /api/hotels` - Create hotel (requires permission)
- `PUT /api/hotels/:id` - Update hotel (requires permission)
- `DELETE /api/hotels/:id` - Delete hotel (requires permission)

### Tenant Management
- `GET /api/tenants` - List tenants (super admin only)
- `POST /api/tenants` - Create tenant (super admin only)
- `PUT /api/tenants/:id` - Update tenant (super admin only)

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](docs/CONTRIBUTING.md) for details.

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check the `/docs` folder for detailed guides
- **Issues**: Open an issue on GitHub for bugs or feature requests
- **Discussions**: Use GitHub Discussions for questions and community support

## 🗺️ Roadmap

### Phase 1 (Current)
- [x] Basic multi-tenant architecture
- [x] Hotel and room management
- [x] User authentication and authorization
- [x] Docker containerization

### Phase 2 (Next)
- [ ] Complete reservation system
- [ ] Payment integration
- [ ] Email notifications
- [ ] Advanced reporting and analytics

### Phase 3 (Future)
- [ ] Mobile application
- [ ] Integration with booking platforms
- [ ] Advanced multi-language support
- [ ] Microservices architecture

## 🙏 Acknowledgments

- Built with love for the hospitality industry
- Special thanks to the open-source community
- Inspired by modern SaaS architecture patterns

---

**Made with ❤️ by [BenjajaDev](https://github.com/BenjajaDev)**