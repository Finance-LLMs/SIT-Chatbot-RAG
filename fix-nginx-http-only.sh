#!/bin/bash

# Fixed nginx configuration without SSL (for certbot setup)

echo "🔧 SIT Chatbot - Fixing nginx configuration (HTTP only)"
echo "====================================================="

echo "🔍 Step 1: Remove conflicting configurations"
rm -f /etc/nginx/sites-enabled/sit-chatbot
rm -f /etc/nginx/sites-enabled/sit-chatbot.conf
rm -f /etc/nginx/sites-enabled/default

echo "✅ Removed conflicting configurations"

echo ""
echo "🔧 Step 2: Create HTTP-only nginx configuration"

# Create HTTP-only configuration (certbot will add HTTPS later)
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

echo "✅ Created HTTP-only nginx configuration"

echo ""
echo "🔗 Step 3: Enable the configuration"
ln -sf /etc/nginx/sites-available/sit-chatbot.conf /etc/nginx/sites-enabled/

echo ""
echo "🧪 Step 4: Test nginx configuration"
if nginx -t; then
    echo "✅ Nginx configuration is valid"
else
    echo "❌ Nginx configuration has errors"
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
echo "🔍 Step 6: Check active sites"
echo "Active nginx sites:"
ls -la /etc/nginx/sites-enabled/

echo ""
echo "🧪 Step 7: Test HTTP access"
echo "Testing HTTP access..."
curl -s -o /dev/null -w "HTTP Status: %{http_code} - Time: %{time_total}s" http://sit-chatbot.snaic.net/ || echo "❌ Failed to connect"

echo ""
echo ""
echo "🎉 HTTP Configuration Applied!"
echo "=============================="
echo "✅ Nginx configured for HTTP only (port 80)"
echo "✅ Extended timeouts (10 minutes) for RAG processing"
echo "✅ Ready for SSL setup with certbot"
echo ""
echo "📝 Next Steps:"
echo "1. Test HTTP access: http://sit-chatbot.snaic.net/"
echo "2. If working, set up SSL: sudo certbot --nginx -d sit-chatbot.snaic.net"
echo "3. After SSL: access via https://sit-chatbot.snaic.net/"
echo ""
echo "💡 Current flow:"
echo "   Browser → nginx (port 80) → Node.js (port 3000) → RAG Backend (port 8000)"
