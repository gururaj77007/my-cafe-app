#!/bin/bash

# Go to backend folder, install deps if needed and start backend
echo "Starting backend..."
cd backend || exit

if [ ! -d "node_modules" ]; then
  echo "Installing backend dependencies..."
  npm install
fi

# Run backend in background and log output
nohup node server.js > backend.log 2>&1 &
BACKEND_PID=$!

echo "Backend started with PID $BACKEND_PID"
cd ..

# Wait for backend port 3010 to open (max 15 seconds)
echo "Waiting for backend to start on port 3010..."
for i in {1..15}; do
  if lsof -i:3010 > /dev/null; then
    echo "Backend server is running!"
    break
  fi
  sleep 1
done

if ! lsof -i:3010 > /dev/null; then
  echo "Backend failed to start."
  exit 1
fi

# Go to frontend folder, install deps if needed and start frontend
echo "Starting frontend..."
cd frontend || exit

if [ ! -d "node_modules" ]; then
  echo "Installing frontend dependencies..."
  npm install
fi

npm start
