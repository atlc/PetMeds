@echo off
echo 🚀 Setting up PetMeds development environment...

REM Check if PostgreSQL is running (basic check)
echo 📊 Checking PostgreSQL connection...
echo Please ensure PostgreSQL is running on localhost:5432

REM Create .env file for backend if it doesn't exist
if not exist "backend\.env" (
    echo 📝 Creating backend .env file...
    (
        echo # Server Configuration
        echo PORT=3001
        echo NODE_ENV=development
        echo.
        echo # Database Configuration
        echo DB_HOST=localhost
        echo DB_PORT=5432
        echo DB_NAME=petmeds
        echo DB_USER=postgres
        echo DB_PASSWORD=postgres
        echo.
        echo # Google OAuth Configuration
        echo GOOGLE_CLIENT_ID=your_google_client_id_here
        echo GOOGLE_CLIENT_SECRET=your_google_client_secret_here
        echo GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
        echo.
        echo # JWT Configuration
        echo JWT_SECRET=dev_jwt_secret_key_change_in_production
        echo JWT_EXPIRES_IN=7d
        echo.
        echo # Web Push Configuration ^(VAPID keys^)
        echo VAPID_PUBLIC_KEY=your_vapid_public_key_here
        echo VAPID_PRIVATE_KEY=your_vapid_private_key_here
        echo.
        echo # File Upload Configuration
        echo UPLOAD_DIR=uploads
        echo MAX_FILE_SIZE=5242880
        echo.
        echo # Frontend URL ^(for CORS^)
        echo FRONTEND_URL=http://localhost:3000
    ) > backend\.env
    echo ✅ Backend .env file created
    echo ⚠️  Please update GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and VAPID keys in backend\.env
) else (
    echo ✅ Backend .env file already exists
)

REM Install dependencies
echo 📦 Installing dependencies...
call npm run install:all

REM Setup database
echo 🗄️  Setting up database...
call npm run db:setup

REM Seed database with sample data
echo 🌱 Seeding database with sample data...
cd backend
call npm run db:seed
cd ..

echo.
echo 🎉 Setup complete! Next steps:
echo.
echo 1. Update backend\.env with your Google OAuth credentials and VAPID keys
echo 2. Run 'npm run dev' to start both frontend and backend servers
echo 3. Frontend will be available at http://localhost:3000
echo 4. Backend API will be available at http://localhost:3001
echo.
echo For Google OAuth setup:
echo - Go to https://console.developers.google.com/
echo - Create a new project or select existing one
echo - Enable Google+ API
echo - Create OAuth 2.0 credentials
echo - Add http://localhost:3000 to authorized origins
echo - Add http://localhost:3000/auth/google/callback to authorized redirect URIs
echo.
echo For VAPID keys ^(push notifications^):
echo - Use web-push generate-vapid-keys command or online generators
echo - Update VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in backend\.env
echo.
pause
