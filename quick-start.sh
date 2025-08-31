#!/bin/bash

# Quick Manual Start - SIT Chatbot

echo "🚀 SIT Chatbot - Quick Manual Start"
echo "=================================="

CHATBOT_DIR="/home/ubuntu/SIT-Chatbot-RAG"

echo "📍 Starting services manually..."
echo ""

# Kill any existing processes
echo "🔄 Cleaning up existing processes..."
pkill -f "python.*server\.py" 2>/dev/null || true
pkill -f "node.*server\.js" 2>/dev/null || true
sleep 2

echo "✅ Cleanup complete"
echo ""

echo "🔧 Starting RAG Backend (port 8000)..."
cd "$CHATBOT_DIR/SITCHATBOTLLM"

# Check if virtual environment exists
if [ -d "$CHATBOT_DIR/venv" ]; then
    echo "✅ Using virtual environment"
    source "$CHATBOT_DIR/venv/bin/activate"
else
    echo "⚠️ No virtual environment found, using system Python"
fi

# Start RAG backend in background
nohup python server.py > /tmp/rag-backend.log 2>&1 &
RAG_PID=$!
echo "✅ RAG Backend started (PID: $RAG_PID)"

# Wait a moment for it to initialize
sleep 3

# Check if RAG backend is responding
echo "🧪 Testing RAG Backend..."
if curl -s -f http://127.0.0.1:8000/health > /dev/null 2>&1; then
    echo "✅ RAG Backend is responding"
else
    echo "⚠️ RAG Backend might still be starting up..."
fi

echo ""
echo "🔧 Starting Node.js Frontend (port 3000)..."
cd "$CHATBOT_DIR/SIT-chatbot-main/backend"

# Start frontend in background
nohup node server.js > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "✅ Frontend started (PID: $FRONTEND_PID)"

# Wait a moment for it to initialize
sleep 3

# Check if frontend is responding
echo "🧪 Testing Frontend..."
if curl -s -f http://127.0.0.1:3000 > /dev/null 2>&1; then
    echo "✅ Frontend is responding"
else
    echo "⚠️ Frontend might still be starting up..."
fi

echo ""
echo "🌐 Testing full chain through nginx..."
if curl -s -f http://sit-chatbot.snaic.net > /dev/null 2>&1; then
    echo "✅ Full chain is working!"
    echo "🎉 Chatbot is ready at: http://sit-chatbot.snaic.net/"
else
    echo "⚠️ Full chain might still be starting up..."
    echo "📋 Please wait 30 seconds for BM25 to fully load, then try again"
fi

echo ""
echo "📊 Process Status:"
echo "=================="
echo "RAG Backend PID: $RAG_PID"
echo "Frontend PID: $FRONTEND_PID"

echo ""
echo "📝 Log Files:"
echo "============="
echo "RAG Backend: tail -f /tmp/rag-backend.log"
echo "Frontend: tail -f /tmp/frontend.log"

echo ""
echo "🛑 To Stop Services:"
echo "==================="
echo "kill $RAG_PID $FRONTEND_PID"
echo "Or: pkill -f 'python.*server\.py'; pkill -f 'node.*server\.js'"

echo ""
echo "🔍 To Check Status:"
echo "==================="
echo "netstat -tlnp | grep -E ':(3000|8000)'"

echo ""
echo "⏰ Note: BM25 loading takes ~90 seconds on first request"
echo "🎯 Access: http://sit-chatbot.snaic.net/"
