#!/bin/bash

# Quick Fix for 504 Gateway Timeout Issue

echo "🔧 SIT Chatbot - Fixing 504 Gateway Timeout"
echo "==========================================="

echo "📋 Issue: nginx timing out before 90-second RAG processing completes"
echo ""

echo "🔍 Step 1: Check current nginx configuration"
if [ -f "/etc/nginx/sites-enabled/sit-chatbot.conf" ]; then
    echo "✅ sit-chatbot.conf exists"
    echo "Current timeout settings:"
    grep -E "(proxy_read_timeout|proxy_send_timeout|proxy_connect_timeout)" /etc/nginx/sites-enabled/sit-chatbot.conf || echo "❌ No timeout settings found"
else
    echo "❌ sit-chatbot.conf not found in sites-enabled"
fi

echo ""
echo "🔧 Step 2: Apply fixed nginx configuration"

# Create the correct nginx configuration
cat > /etc/nginx/sites-available/sit-chatbot.conf << 'EOF'
server {
    listen 80;
    server_name sit-chatbot.snaic.net;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    
    # Increase upload size for audio files
    client_max_body_size 50M;
    
    # Extended timeout settings for long RAG requests (up to 10 minutes)
    proxy_connect_timeout 600s;
    proxy_send_timeout 600s;
    proxy_read_timeout 600s;
    proxy_buffering off;
    
    # Additional nginx timeouts
    client_body_timeout 600s;
    client_header_timeout 600s;
    send_timeout 600s;
    
    location / {
        # Forward ALL requests to the Node.js frontend server
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Override timeouts for this location
        proxy_connect_timeout 600s;
        proxy_send_timeout 600s;
        proxy_read_timeout 600s;
    }
}
EOF

echo "✅ Updated nginx configuration with 10-minute timeouts"

echo ""
echo "🔗 Step 3: Enable the configuration"
ln -sf /etc/nginx/sites-available/sit-chatbot.conf /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

echo ""
echo "🧪 Step 4: Test nginx configuration"
if nginx -t; then
    echo "✅ Nginx configuration is valid"
else
    echo "❌ Nginx configuration has errors - stopping"
    exit 1
fi

echo ""
echo "🔄 Step 5: Restart nginx"
systemctl restart nginx

if systemctl is-active --quiet nginx; then
    echo "✅ Nginx restarted successfully"
else
    echo "❌ Nginx failed to restart"
    systemctl status nginx
    exit 1
fi

echo ""
echo "🎯 Step 6: Verify timeout settings"
echo "New timeout settings:"
grep -E "(proxy_read_timeout|proxy_send_timeout|proxy_connect_timeout)" /etc/nginx/sites-enabled/sit-chatbot.conf

echo ""
echo "🧪 Step 7: Test the fix"
echo "Testing basic connectivity..."
curl -s -o /dev/null -w "HTTP Status: %{http_code} - Time: %{time_total}s" https://sit-chatbot.snaic.net/ || echo "❌ Failed to connect"

echo ""
echo ""
echo "🎉 Fix Applied!"
echo "==============="
echo "✅ Nginx timeouts increased to 10 minutes (600 seconds)"
echo "✅ All proxy timeouts set to handle 90+ second RAG processing"
echo "✅ Configuration reloaded and nginx restarted"
echo ""
echo "💡 Now try your chatbot again:"
echo "   1. Go to https://sit-chatbot.snaic.net/"
echo "   2. Ask: 'Tell me about SIT'"
echo "   3. Wait ~90 seconds for response"
echo "   4. Should get proper response without 504 timeout"
echo ""
echo "📊 If still having issues, check:"
echo "   - Backend logs: Look for RAG processing completion"
echo "   - Frontend logs: node server.js output"
echo "   - Nginx logs: sudo tail -f /var/log/nginx/error.log"
