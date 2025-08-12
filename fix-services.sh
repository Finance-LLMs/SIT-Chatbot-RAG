#!/bin/bash

echo "🔧 Fixing SIT Frontend-Backend Connection"
echo "========================================"

# Fix the systemd service files
echo "1. Creating corrected systemd service files..."

# Create backend service (this one is working fine)
sudo tee /etc/systemd/system/sit-backend.service > /dev/null << 'EOF'
[Unit]
Description=SIT RAG FastAPI (server.py)
After=network.target

[Service]
User=ubuntu
Group=ubuntu
WorkingDirectory=/home/ubuntu/SIT-Chatbot-RAG/SITCHATBOTLLM
Environment="PATH=/home/ubuntu/SIT-Chatbot-RAG/venv/bin"
Environment="HOST=127.0.0.1"
Environment="PORT=8000"
ExecStart=/home/ubuntu/SIT-Chatbot-RAG/venv/bin/python /home/ubuntu/SIT-Chatbot-RAG/SITCHATBOTLLM/server.py
Restart=always
RestartSec=3
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Create frontend service with corrected ExecStartPre
sudo tee /etc/systemd/system/sit-frontend.service > /dev/null << 'EOF'
[Unit]
Description=SIT Frontend Node server (server.js)
After=network.target sit-backend.service
Wants=sit-backend.service

[Service]
User=ubuntu
Group=ubuntu
WorkingDirectory=/home/ubuntu/SIT-Chatbot-RAG/SIT-chatbot-main/backend
Environment=NODE_ENV=production
Environment=HOST=127.0.0.1
Environment=PORT=3000
Environment=RAG_BASE_URL=http://127.0.0.1:8000
ExecStartPre=/bin/bash -c 'for i in {1..30}; do if curl -s http://127.0.0.1:8000/health >/dev/null 2>&1; then exit 0; fi; sleep 1; done; exit 1'
ExecStart=/usr/bin/node /home/ubuntu/SIT-Chatbot-RAG/SIT-chatbot-main/backend/server.js
Restart=always
RestartSec=3
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

echo "✅ Service files created"

# Reload systemd
echo "2. Reloading systemd daemon..."
sudo systemctl daemon-reload

# Restart frontend service to apply fixes
echo "3. Restarting frontend service..."
sudo systemctl restart sit-frontend

echo "4. Waiting for services to stabilize..."
sleep 5

# Check status
echo "5. Checking service status..."
echo ""
echo "Backend status:"
sudo systemctl status sit-backend --no-pager -l
echo ""
echo "Frontend status:"
sudo systemctl status sit-frontend --no-pager -l

echo ""
echo "6. Testing connectivity..."

# Test backend
if curl -s http://127.0.0.1:8000/health > /dev/null; then
    echo "✅ Backend responding on port 8000"
else
    echo "❌ Backend not responding on port 8000"
fi

# Test frontend
if curl -s http://127.0.0.1:3000 > /dev/null; then
    echo "✅ Frontend responding on port 3000"
else
    echo "❌ Frontend not responding on port 3000"
fi

# Test communication
echo ""
echo "7. Testing frontend-backend communication..."
RESPONSE=$(curl -s -X POST http://127.0.0.1:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"model": "sit-chatbot", "messages": [{"role": "user", "content": "test"}], "stream": false}' \
  2>/dev/null)

if [ ! -z "$RESPONSE" ] && [ "$RESPONSE" != "null" ]; then
    echo "✅ Frontend-backend communication working!"
    echo "Response preview: $(echo "$RESPONSE" | cut -c1-100)..."
else
    echo "❌ Frontend-backend communication failed"
    echo "Checking frontend logs for errors..."
    sudo journalctl -u sit-frontend --no-pager -n 10
fi

echo ""
echo "🎉 Fix complete! Your application should be accessible at: http://$(curl -s ifconfig.me):3000"
