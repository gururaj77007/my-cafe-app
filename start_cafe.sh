#!/bin/bash

# Start backend
echo "Starting backend..."
cd backend || { echo "Backend folder not found"; exit 1; }

if [ ! -d "node_modules" ]; then
  echo "Installing backend dependencies with yarn..."
  yarn install
fi

nohup yarn start > backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend started with PID $BACKEND_PID"
cd ..

# Wait for backend port 3010 to be available (max 15s)
echo "Waiting for backend to start on port 3010..."
for i in {1..15}; do
  if ss -ltn | grep -q ':3010'; then
    echo "Backend server is running!"
    break
  fi
  sleep 1
done

if ! ss -ltn | grep -q ':3010'; then
  echo "Backend failed to start."
  kill $BACKEND_PID
  exit 1
fi

# Start frontend
echo "Starting frontend..."
cd frontend || { echo "Frontend folder not found"; kill $BACKEND_PID; exit 1; }

if [ ! -d "node_modules" ]; then
  echo "Installing frontend dependencies with yarn..."
  yarn install
fi

# Run frontend in foreground
yarn start

# If frontend stops, kill backend
echo "Stopping backend..."
kill $BACKEND_PID
echo "Both backend and frontend stopped."
