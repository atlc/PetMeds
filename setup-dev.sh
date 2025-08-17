#!/bin/bash

echo "🚀 Setting up PetMeds development environment..."

# Check if PostgreSQL is running
echo "📊 Checking PostgreSQL connection..."
if ! pg_isready -h localhost -p 5432 -U postgres > /dev/null 2>&1; then
    echo "❌ PostgreSQL is not running or not accessible"
    echo "Please start PostgreSQL and ensure it's accessible at localhost:5432"
    exit 1
fi

echo "✅ PostgreSQL is running"

# Create .env file for backend if it doesn't exist
if [ ! -f "backend/.env" ]; then
    echo "📝 Creating backend .env file..."
    cat > backend/.env << EOF
# Server Configuration
PORT=3001
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=petmeds
DB_USER=postgres
DB_PASSWORD=postgres

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback

# JWT Configuration
JWT_SECRET=dev_jwt_secret_key_change_in_production
JWT_EXPIRES_IN=7d

# Web Push Configuration (VAPID keys)
VAPID_PUBLIC_KEY=your_vapid_public_key_here
VAPID_PRIVATE_KEY=your_vapid_private_key_here

# File Upload Configuration
UPLOAD_DIR=uploads
MAX_FILE_SIZE=5242880

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000
EOF
    echo "✅ Backend .env file created"
    echo "⚠️  Please update GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and VAPID keys in backend/.env"
else
    echo "✅ Backend .env file already exists"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm run install:all

# Setup database
echo "🗄️  Setting up database..."
npm run db:setup

# Seed database with sample data
echo "🌱 Seeding database with sample data..."
cd backend && npm run db:seed && cd ..

echo ""
echo "🎉 Setup complete! Next steps:"
echo ""
echo "1. Update backend/.env with your Google OAuth credentials and VAPID keys"
echo "2. Run 'npm run dev' to start both frontend and backend servers"
echo "3. Frontend will be available at http://localhost:3000"
echo "4. Backend API will be available at http://localhost:3001"
echo ""
echo "For Google OAuth setup:"
echo "- Go to https://console.developers.google.com/"
echo "- Create a new project or select existing one"
echo "- Enable Google+ API"
echo "- Create OAuth 2.0 credentials"
echo "- Add http://localhost:3000 to authorized origins"
echo "- Add http://localhost:3000/auth/google/callback to authorized redirect URIs"
echo ""
echo "For VAPID keys (push notifications):"
echo "- Use web-push generate-vapid-keys command or online generators"
echo "- Update VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in backend/.env"
