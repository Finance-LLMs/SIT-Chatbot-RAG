#!/bin/bash

echo "🔧 Simple Fix - Restart Frontend Service"
echo "======================================="

# First, let's fix the systemd service file without the problematic ExecStartPre
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
ExecStart=/usr/bin/node /home/ubuntu/SIT-Chatbot-RAG/SIT-chatbot-main/backend/server.js
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

echo "✅ Updated frontend service file (removed problematic ExecStartPre)"

# Reload and restart
sudo systemctl daemon-reload
sudo systemctl restart sit-frontend

echo "⏳ Waiting for frontend to restart..."
sleep 3

# Check status
echo ""
echo "📊 Service Status:"
sudo systemctl status sit-frontend --no-pager -l

echo ""
echo "🧪 Testing connectivity..."

# Test the connection
if curl -s -X POST http://127.0.0.1:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"model": "sit-chatbot", "messages": [{"role": "user", "content": "test"}], "stream": false}' > /tmp/test_response.json 2>/dev/null; then
    echo "✅ Frontend-backend communication working!"
    echo "Response: $(cat /tmp/test_response.json)"
else
    echo "❌ Still having issues. Let's check logs:"
    echo ""
    echo "Frontend logs:"
    sudo journalctl -u sit-frontend --no-pager -n 5
fi

echo ""
echo "🌐 Your application should be accessible at: http://$(curl -s ifconfig.me):3000"
