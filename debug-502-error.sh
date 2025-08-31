#!/bin/bash

# Debug and Fix 502 Bad Gateway Error

echo "🔍 SIT Chatbot - Debugging 502 Bad Gateway"
echo "=========================================="

echo "📋 A 502 error means nginx can't connect to Node.js frontend on port 3000"
echo ""

echo "🔍 Step 1: Check if Node.js frontend is running"
if netstat -tlnp | grep -q ":3000"; then
    echo "✅ Something is listening on port 3000"
    echo "Port 3000 details:"
    netstat -tlnp | grep ":3000"
else
    echo "❌ Nothing is listening on port 3000"
    echo "❌ Node.js frontend server is not running!"
fi

echo ""
echo "🔍 Step 2: Check if RAG backend is running"
if netstat -tlnp | grep -q ":8000"; then
    echo "✅ Something is listening on port 8000"
    echo "Port 8000 details:"
    netstat -tlnp | grep ":8000"
else
    echo "❌ Nothing is listening on port 8000"
    echo "❌ RAG backend server is not running!"
fi

echo ""
echo "🔍 Step 3: Check nginx status"
if systemctl is-active --quiet nginx; then
    echo "✅ Nginx is running"
else
    echo "❌ Nginx is not running"
fi

echo ""
echo "🔍 Step 4: Test direct connectivity"
echo "Testing Node.js frontend directly:"
curl -s -o /dev/null -w "HTTP Status: %{http_code} - Time: %{time_total}s" http://127.0.0.1:3000 2>/dev/null && echo " (Direct connection to Node.js)" || echo " ❌ Can't connect to Node.js on port 3000"

echo ""
echo "Testing RAG backend directly:"
curl -s -o /dev/null -w "HTTP Status: %{http_code} - Time: %{time_total}s" http://127.0.0.1:8000/health 2>/dev/null && echo " (Direct connection to RAG backend)" || echo " ❌ Can't connect to RAG backend on port 8000"

echo ""
echo "🔍 Step 5: Check running processes"
echo "Node.js processes:"
ps aux | grep -E "(node|npm)" | grep -v grep || echo "❌ No Node.js processes found"

echo ""
echo "Python processes (RAG backend):"
ps aux | grep -E "python.*server\.py" | grep -v grep || echo "❌ No Python server.py processes found"

echo ""
echo "🔧 SOLUTION STEPS:"
echo "=================="

if ! netstat -tlnp | grep -q ":8000"; then
    echo "1. ❌ START RAG BACKEND:"
    echo "   cd /home/ubuntu/SIT-Chatbot-RAG/SITCHATBOTLLM"
    echo "   source ../venv/bin/activate"
    echo "   python server.py"
    echo ""
fi

if ! netstat -tlnp | grep -q ":3000"; then
    echo "2. ❌ START NODE.JS FRONTEND:"
    echo "   cd /home/ubuntu/SIT-Chatbot-RAG/SIT-chatbot-main/backend"
    echo "   node server.js"
    echo ""
fi

echo "3. ✅ NGINX IS CONFIGURED CORRECTLY"
echo "   Once both servers are running, try: http://sit-chatbot.snaic.net/"
echo ""

echo "🔄 Quick Start Commands:"
echo "======================="
echo "Terminal 1 (RAG Backend):"
echo "cd /home/ubuntu/SIT-Chatbot-RAG/SITCHATBOTLLM && source ../venv/bin/activate && python server.py"
echo ""
echo "Terminal 2 (Frontend):"
echo "cd /home/ubuntu/SIT-Chatbot-RAG/SIT-chatbot-main/backend && node server.js"
echo ""
echo "Then test: http://sit-chatbot.snaic.net/"
