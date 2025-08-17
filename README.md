# PetMeds - Pet Medication Management PWA

A progressive web application for managing pet medications, schedules, and household coordination.

## 🚀 Features

- **Google SSO Authentication** - Simple login with Google account
- **Household Management** - Create households and invite members with role-based access
- **Pet Management** - Track pets with photos, species, birthdates, and weights
- **Medication Scheduling** - Complex scheduling with intervals, specific times, and days of week
- **Agenda View** - Calendar-style view of upcoming, due, and overdue medications
- **Quick Actions** - Take medications, snooze doses, and log administration
- **Push Notifications** - Medication reminders sent 15 minutes before doses
- **PWA Support** - Installable on mobile devices with offline capabilities
- **Role-Based Access** - Owner, member, and sitter roles with expiration support

## 🏗️ Project Structure

```
PetMedCursor/
├── backend/                 # Node.js/Express API server
│   ├── src/
│   │   ├── routes/         # API endpoints
│   │   ├── middleware/     # Authentication & error handling
│   │   ├── services/       # Business logic
│   │   ├── db/            # Database connection
│   │   └── types/         # TypeScript definitions
│   ├── package.json
│   └── tsconfig.json
├── frontend/               # React PWA application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Application pages
│   │   ├── contexts/      # React contexts
│   │   ├── services/      # API client
│   │   └── types/         # TypeScript definitions
│   ├── package.json
│   └── vite.config.ts
├── database/               # Database schema and setup
│   └── schema.sql
├── package.json            # Root package with scripts
└── README.md
```

## 📋 Prerequisites

- **Node.js** (v18 or higher)
- **PostgreSQL** (v12 or higher)
- **npm** or **yarn**
- **Google Cloud Console** account (for OAuth)
- **VAPID keys** (for push notifications)

## 🚀 Quick Start

### 1. Clone and Setup

```bash
git clone <repository-url>
cd PetMedCursor
```

### 2. Run Setup Script

**Windows:**
```bash
setup-dev.bat
```

**Linux/Mac:**
```bash
chmod +x setup-dev.sh
./setup-dev.sh
```

### 3. Manual Setup (Alternative)

If you prefer manual setup:

```bash
# Install dependencies
npm run install:all

# Setup database
npm run db:setup

# Seed with sample data
cd backend && npm run db:seed && cd ..
```

### 4. Configure Environment

Create `backend/.env` file with your credentials:

```env
# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# JWT
JWT_SECRET=your_jwt_secret

# VAPID Keys (for push notifications)
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
```

### 5. Start Development Servers

```bash
npm run dev
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

## 🔧 Development

### Available Scripts

```bash
# Development
npm run dev                    # Start both frontend and backend
npm run dev:frontend          # Start only frontend
npm run dev:backend           # Start only backend

# Build
npm run build                 # Build both frontend and backend
npm run build:frontend        # Build only frontend
npm run build:backend         # Build only backend

# Database
npm run db:setup              # Create database and apply schema
npm run db:migrate            # Run database migrations
npm run db:seed               # Seed with sample data

# Install dependencies
npm run install:all           # Install all dependencies
```

### Database Schema

The application uses PostgreSQL with the following key tables:

- **users** - User accounts and profiles
- **households** - Household information
- **household_members** - User roles and access control
- **pets** - Pet information and photos
- **medications** - Medication details and schedules
- **medication_dose_events** - Generated dose schedules
- **medication_log** - Administration logs
- **push_subscriptions** - Push notification subscriptions

### API Endpoints

- **Authentication**: `/api/auth/*`
- **Households**: `/api/households/*`
- **Pets**: `/api/pets/*`
- **Medications**: `/api/medications/*`
- **Agenda**: `/api/agenda/*`
- **Push Notifications**: `/api/push/*`

## 🌐 PWA Features

- **Service Worker** - Offline caching and background sync
- **Web App Manifest** - Installable on mobile devices
- **Push Notifications** - Medication reminders
- **Offline Support** - Read cached data when offline

## 🔐 Authentication & Security

- **Google OAuth 2.0** - Secure authentication
- **JWT Tokens** - Stateless session management
- **Role-Based Access Control** - Server-side enforcement
- **CORS Protection** - Cross-origin request security
- **Rate Limiting** - API abuse prevention

## 📱 Mobile Support

- **Responsive Design** - Works on all screen sizes
- **Touch-Friendly** - Optimized for mobile interaction
- **PWA Installation** - Add to home screen
- **Offline Capabilities** - Works without internet

## 🧪 Testing

The application includes sample data for testing:

- Sample user account
- Sample household
- Sample pet (Buddy the Dog)
- Sample medication (Heartgard Plus)

## 🚀 Deployment

### Backend Deployment

1. Set production environment variables
2. Build the application: `npm run build:backend`
3. Deploy `dist/` folder to your server
4. Configure PostgreSQL connection
5. Set up environment variables

### Frontend Deployment

1. Build the application: `npm run build:frontend`
2. Deploy `frontend/dist/` folder to your web server
3. Ensure HTTPS for PWA features
4. Update API base URL in production

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues and questions:
1. Check the documentation
2. Search existing issues
3. Create a new issue with details

## 🔮 Roadmap

- [ ] Containerization with Docker
- [ ] Advanced medication scheduling
- [ ] Multi-language support
- [ ] Advanced reporting and analytics
- [ ] Integration with veterinary systems
- [ ] Mobile app versions
