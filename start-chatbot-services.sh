#!/bin/bash

# Start SIT Chatbot - All Services

echo "🚀 SIT Chatbot - Starting All Services"
echo "====================================="

# Set working directory
CHATBOT_DIR="/home/ubuntu/SIT-Chatbot-RAG"

echo "📍 Working directory: $CHATBOT_DIR"
echo ""

# Function to check if port is in use
check_port() {
    local port=$1
    if netstat -tlnp | grep -q ":$port"; then
        echo "✅ Port $port is already in use"
        return 0
    else
        echo "❌ Port $port is free"
        return 1
    fi
}

echo "🔍 Checking current service status..."
echo "RAG Backend (port 8000):"
check_port 8000

echo "Node.js Frontend (port 3000):"
check_port 3000

echo ""

# Create systemd service files for automatic startup
echo "🔧 Creating systemd service files..."

# RAG Backend Service
cat > /tmp/sit-rag-backend.service << 'EOF'
[Unit]
Description=SIT Chatbot RAG Backend
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/SIT-Chatbot-RAG/SITCHATBOTLLM
Environment=PATH=/home/ubuntu/SIT-Chatbot-RAG/venv/bin
ExecStart=/home/ubuntu/SIT-Chatbot-RAG/venv/bin/python server.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Node.js Frontend Service
cat > /tmp/sit-frontend.service << 'EOF'
[Unit]
Description=SIT Chatbot Frontend
After=network.target sit-rag-backend.service

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/SIT-Chatbot-RAG/SIT-chatbot-main/backend
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Install services
sudo cp /tmp/sit-rag-backend.service /etc/systemd/system/
sudo cp /tmp/sit-frontend.service /etc/systemd/system/

# Reload systemd
sudo systemctl daemon-reload

echo "✅ Systemd service files created"
echo ""

echo "🔄 Starting services..."

# Start RAG Backend
echo "Starting RAG Backend..."
sudo systemctl start sit-rag-backend
sleep 5

# Check RAG Backend status
if systemctl is-active --quiet sit-rag-backend; then
    echo "✅ RAG Backend started successfully"
else
    echo "❌ RAG Backend failed to start"
    echo "Checking logs:"
    sudo journalctl -u sit-rag-backend --no-pager -n 10
fi

# Start Frontend
echo "Starting Frontend..."
sudo systemctl start sit-frontend
sleep 3

# Check Frontend status
if systemctl is-active --quiet sit-frontend; then
    echo "✅ Frontend started successfully"
else
    echo "❌ Frontend failed to start"
    echo "Checking logs:"
    sudo journalctl -u sit-frontend --no-pager -n 10
fi

echo ""
echo "🔍 Final status check..."

echo "RAG Backend (port 8000):"
if netstat -tlnp | grep -q ":8000"; then
    echo "✅ RAG Backend is running on port 8000"
    curl -s -o /dev/null -w "Direct test: HTTP %{http_code} in %{time_total}s\n" http://127.0.0.1:8000/health 2>/dev/null || echo "❌ RAG Backend not responding"
else
    echo "❌ RAG Backend not running on port 8000"
fi

echo ""
echo "Node.js Frontend (port 3000):"
if netstat -tlnp | grep -q ":3000"; then
    echo "✅ Frontend is running on port 3000"
    curl -s -o /dev/null -w "Direct test: HTTP %{http_code} in %{time_total}s\n" http://127.0.0.1:3000 2>/dev/null || echo "❌ Frontend not responding"
else
    echo "❌ Frontend not running on port 3000"
fi

echo ""
echo "🌐 Testing full chain..."
curl -s -o /dev/null -w "Full chain test: HTTP %{http_code} in %{time_total}s\n" http://sit-chatbot.snaic.net 2>/dev/null && echo "✅ Full chain working!" || echo "❌ Full chain not working"

echo ""
echo "🎉 Setup Complete!"
echo "================="
echo "📝 Service Commands:"
echo "  Start all: sudo systemctl start sit-rag-backend sit-frontend"
echo "  Stop all:  sudo systemctl stop sit-rag-backend sit-frontend"
echo "  Enable auto-start: sudo systemctl enable sit-rag-backend sit-frontend"
echo "  Check status: sudo systemctl status sit-rag-backend sit-frontend"
echo "  View logs: sudo journalctl -u sit-rag-backend -f"
echo ""
echo "🌐 Access your chatbot:"
echo "  HTTP:  http://sit-chatbot.snaic.net/"
echo "  After SSL: https://sit-chatbot.snaic.net/"
echo ""
echo "🔧 To add SSL: sudo certbot --nginx -d sit-chatbot.snaic.net"
