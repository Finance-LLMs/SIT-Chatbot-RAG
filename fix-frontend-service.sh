#!/bin/bash

# Fix Frontend Service - Update Node.js Path

echo "🔧 Fixing Frontend Service - Updating Node.js Path"
echo "================================================="

echo "📝 Updating frontend systemd service with correct Node.js path..."

# Update the frontend service with the correct Node.js path
sudo tee /etc/systemd/system/sit-frontend.service > /dev/null << 'EOF'
[Unit]
Description=SIT Chatbot Frontend (Node.js)
Documentation=https://github.com/Finance-LLMs/SIT-Chatbot-RAG
After=network.target sit-rag-backend.service
Wants=network.target
Requires=sit-rag-backend.service

[Service]
Type=simple
User=ubuntu
Group=ubuntu
WorkingDirectory=/home/ubuntu/SIT-Chatbot-RAG/SIT-chatbot-main/backend
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=PATH=/home/ubuntu/.nvm/versions/node/v22.19.0/bin:/usr/local/bin:/usr/bin:/bin
ExecStart=/home/ubuntu/.nvm/versions/node/v22.19.0/bin/node server.js
ExecReload=/bin/kill -HUP $MAINPID
KillMode=mixed
KillSignal=SIGINT
TimeoutStopSec=15
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=sit-frontend

# Resource limits
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF

echo "✅ Frontend service configuration updated"

# Reload systemd daemon
echo "🔄 Reloading systemd daemon..."
sudo systemctl daemon-reload

# Restart the frontend service
echo "🚀 Restarting frontend service..."
sudo systemctl restart sit-frontend.service

# Wait a moment for it to start
sleep 3

# Check status
echo ""
echo "📊 Frontend Service Status:"
echo "============================"
sudo systemctl status sit-frontend.service --no-pager -l

echo ""
echo "🧪 Testing Services:"
echo "==================="

# Test RAG Backend
echo "Testing RAG Backend (port 8000):"
curl -s -o /dev/null -w "HTTP %{http_code} - %{time_total}s\n" http://127.0.0.1:8000/health 2>/dev/null || echo "❌ Not responding"

# Test Frontend
echo "Testing Frontend (port 3000):"
curl -s -o /dev/null -w "HTTP %{http_code} - %{time_total}s\n" http://127.0.0.1:3000 2>/dev/null || echo "❌ Not responding"

# Test Full Chain
echo "Testing Full Chain (nginx):"
curl -s -o /dev/null -w "HTTP %{http_code} - %{time_total}s\n" http://sit-chatbot.snaic.net 2>/dev/null || echo "❌ Not responding"

echo ""
echo "🎉 Fix Complete!"
echo "================"

# Check if both services are running
if systemctl is-active --quiet sit-rag-backend && systemctl is-active --quiet sit-frontend; then
    echo "✅ Both services are now running!"
    echo "🌐 Your chatbot should be accessible at: http://sit-chatbot.snaic.net/"
    echo ""
    echo "📝 Next steps:"
    echo "1. Test your chatbot at: http://sit-chatbot.snaic.net/"
    echo "2. Add SSL: sudo certbot --nginx -d sit-chatbot.snaic.net"
else
    echo "❌ Some services are still not running. Check logs:"
    echo "sudo journalctl -u sit-frontend -f"
fi
