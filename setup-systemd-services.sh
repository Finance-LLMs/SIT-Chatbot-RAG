#!/bin/bash

# Setup Systemd Services for SIT Chatbot

echo "🔧 Setting up Systemd Services for SIT Chatbot"
echo "=============================================="

# Create RAG Backend Service
echo "📝 Creating RAG Backend systemd service..."
sudo tee /etc/systemd/system/sit-rag-backend.service > /dev/null << 'EOF'
[Unit]
Description=SIT Chatbot RAG Backend
Documentation=https://github.com/Finance-LLMs/SIT-Chatbot-RAG
After=network.target
Wants=network.target

[Service]
Type=simple
User=ubuntu
Group=ubuntu
WorkingDirectory=/home/ubuntu/SIT-Chatbot-RAG/SITCHATBOTLLM
Environment=PATH=/home/ubuntu/SIT-Chatbot-RAG/SITCHATBOTLLM/venv/bin:/usr/local/bin:/usr/bin:/bin
Environment=PYTHONPATH=/home/ubuntu/SIT-Chatbot-RAG/SITCHATBOTLLM
ExecStart=/home/ubuntu/SIT-Chatbot-RAG/SITCHATBOTLLM/venv/bin/python server.py
ExecReload=/bin/kill -HUP $MAINPID
KillMode=mixed
KillSignal=SIGINT
TimeoutStopSec=30
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=sit-rag-backend

# Resource limits
LimitNOFILE=65536
MemoryLimit=2G

[Install]
WantedBy=multi-user.target
EOF

echo "✅ RAG Backend service created"

# Create Frontend Service
echo "📝 Creating Frontend systemd service..."
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
ExecStart=/usr/bin/node server.js
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

echo "✅ Frontend service created"

# Reload systemd daemon
echo "🔄 Reloading systemd daemon..."
sudo systemctl daemon-reload

# Enable services for auto-start
echo "🔧 Enabling services for auto-start..."
sudo systemctl enable sit-rag-backend.service
sudo systemctl enable sit-frontend.service

echo "✅ Services enabled for auto-start"

# Start services
echo "🚀 Starting services..."
sudo systemctl start sit-rag-backend.service
sleep 5
sudo systemctl start sit-frontend.service
sleep 3

# Check status
echo ""
echo "📊 Service Status:"
echo "=================="

echo "RAG Backend Status:"
sudo systemctl status sit-rag-backend.service --no-pager -l

echo ""
echo "Frontend Status:"
sudo systemctl status sit-frontend.service --no-pager -l

echo ""
echo "🌐 Testing Services:"
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
echo "🎉 Systemd Setup Complete!"
echo "=========================="
echo ""
echo "📝 Useful Commands:"
echo "==================="
echo "# Check status"
echo "sudo systemctl status sit-rag-backend sit-frontend"
echo ""
echo "# View logs"
echo "sudo journalctl -u sit-rag-backend -f"
echo "sudo journalctl -u sit-frontend -f"
echo ""
echo "# Restart services"
echo "sudo systemctl restart sit-rag-backend"
echo "sudo systemctl restart sit-frontend"
echo ""
echo "# Stop services"
echo "sudo systemctl stop sit-rag-backend sit-frontend"
echo ""
echo "# Start services"
echo "sudo systemctl start sit-rag-backend sit-frontend"
echo ""
echo "# Disable auto-start"
echo "sudo systemctl disable sit-rag-backend sit-frontend"
echo ""
echo "🌐 Your chatbot is now running 24/7 at:"
echo "http://sit-chatbot.snaic.net/"
