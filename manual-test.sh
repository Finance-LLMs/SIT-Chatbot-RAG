#!/bin/bash

echo "🧪 Manual Connection Test"
echo "========================"

echo "1. Testing backend health endpoint..."
curl -v http://127.0.0.1:8000/health

echo ""
echo "2. Testing frontend root..."
curl -I http://127.0.0.1:3000/

echo ""
echo "3. Testing frontend-backend proxy..."
curl -X POST http://127.0.0.1:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"model": "sit-chatbot", "messages": [{"role": "user", "content": "Hello, this is a test"}], "stream": false}' \
  -v

echo ""
echo "4. Checking if ports are listening..."
echo "Port 8000 (backend):"
ss -tulpn | grep :8000

echo "Port 3000 (frontend):"
ss -tulpn | grep :3000

echo ""
echo "5. Recent frontend logs:"
sudo journalctl -u sit-frontend --no-pager -n 10
