#!/bin/bash

# Setup PM2 Process Manager for SIT Chatbot

echo "🔧 Setting up PM2 Process Manager for SIT Chatbot"
echo "================================================"

# Install PM2 if not already installed
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."
    sudo npm install -g pm2
    echo "✅ PM2 installed"
else
    echo "✅ PM2 already installed"
fi

# Create PM2 ecosystem file
echo "📝 Creating PM2 ecosystem configuration..."
cat > /home/ubuntu/SIT-Chatbot-RAG/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'sit-rag-backend',
      script: '/home/ubuntu/SIT-Chatbot-RAG/SITCHATBOTLLM/venv/bin/python',
      args: 'server.py',
      cwd: '/home/ubuntu/SIT-Chatbot-RAG/SITCHATBOTLLM',
      interpreter: 'none',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
      env: {
        PYTHONPATH: '/home/ubuntu/SIT-Chatbot-RAG/SITCHATBOTLLM',
        PATH: '/home/ubuntu/SIT-Chatbot-RAG/SITCHATBOTLLM/venv/bin:/usr/local/bin:/usr/bin:/bin'
      },
      log_file: '/home/ubuntu/logs/sit-rag-backend.log',
      out_file: '/home/ubuntu/logs/sit-rag-backend-out.log',
      error_file: '/home/ubuntu/logs/sit-rag-backend-error.log',
      merge_logs: true,
      time: true
    },
    {
      name: 'sit-frontend',
      script: 'server.js',
      cwd: '/home/ubuntu/SIT-Chatbot-RAG/SIT-chatbot-main/backend',
      interpreter: 'node',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      log_file: '/home/ubuntu/logs/sit-frontend.log',
      out_file: '/home/ubuntu/logs/sit-frontend-out.log',
      error_file: '/home/ubuntu/logs/sit-frontend-error.log',
      merge_logs: true,
      time: true
    }
  ]
};
EOF

echo "✅ PM2 ecosystem configuration created"

# Create logs directory
echo "📁 Creating logs directory..."
sudo mkdir -p /home/ubuntu/logs
sudo chown ubuntu:ubuntu /home/ubuntu/logs

# Stop any existing processes
echo "🛑 Stopping any existing PM2 processes..."
pm2 delete all 2>/dev/null || true

# Start applications with PM2
echo "🚀 Starting applications with PM2..."
cd /home/ubuntu/SIT-Chatbot-RAG
pm2 start ecosystem.config.js

# Save PM2 configuration
echo "💾 Saving PM2 configuration..."
pm2 save

# Setup PM2 startup script
echo "🔧 Setting up PM2 startup script..."
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu

echo ""
echo "📊 PM2 Status:"
echo "=============="
pm2 status

echo ""
echo "🧪 Testing Services:"
echo "==================="

# Wait a moment for services to start
sleep 5

# Test RAG Backend
echo "Testing RAG Backend (port 8000):"
curl -s -o /dev/null -w "HTTP %{http_code} - %{time_total}s\n" http://127.0.0.1:8000/health 2>/dev/null || echo "❌ Not responding (may still be starting)"

# Test Frontend
echo "Testing Frontend (port 3000):"
curl -s -o /dev/null -w "HTTP %{http_code} - %{time_total}s\n" http://127.0.0.1:3000 2>/dev/null || echo "❌ Not responding (may still be starting)"

# Test Full Chain
echo "Testing Full Chain (nginx):"
curl -s -o /dev/null -w "HTTP %{http_code} - %{time_total}s\n" http://sit-chatbot.snaic.net 2>/dev/null || echo "❌ Not responding (may still be starting)"

echo ""
echo "🎉 PM2 Setup Complete!"
echo "======================"
echo ""
echo "📝 Useful PM2 Commands:"
echo "======================="
echo "# Check status"
echo "pm2 status"
echo ""
echo "# View logs"
echo "pm2 logs sit-rag-backend"
echo "pm2 logs sit-frontend"
echo "pm2 logs  # All logs"
echo ""
echo "# Restart applications"
echo "pm2 restart sit-rag-backend"
echo "pm2 restart sit-frontend"
echo "pm2 restart all"
echo ""
echo "# Stop applications"
echo "pm2 stop sit-rag-backend"
echo "pm2 stop sit-frontend"
echo "pm2 stop all"
echo ""
echo "# Monitor in real-time"
echo "pm2 monit"
echo ""
echo "# Reload (zero-downtime restart)"
echo "pm2 reload all"
echo ""
echo "# Delete applications"
echo "pm2 delete sit-rag-backend"
echo "pm2 delete sit-frontend"
echo ""
echo "🔄 PM2 will automatically restart your applications if they crash"
echo "🌐 Your chatbot is now running 24/7 at:"
echo "http://sit-chatbot.snaic.net/"
