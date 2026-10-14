@echo off
echo Starting Pulse CRM...

if not exist "node_modules\" (
  echo Installing root dependencies...
  call npm install
)

if not exist "backend\node_modules\" (
  echo Installing backend dependencies...
  cd backend && call npm install && cd ..
)

if not exist "frontend\node_modules\" (
  echo Installing frontend dependencies...
  cd frontend && call npm install && cd ..
)

if not exist "backend\dev.db" (
  echo Initializing database...
  cd backend && call npx prisma db push && call npm run seed && cd ..
)

echo Launching backend and frontend...
call npm run dev
