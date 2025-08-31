#!/bin/bash

# Debug Chat Communication Issues

echo "🔍 SIT Chatbot - Debugging Chat Communication"
echo "=============================================="

echo "📋 This will help identify why chat messages are failing"
echo ""

echo "🔍 Step 1: Check service status"
echo "RAG Backend Status:"
sudo systemctl status sit-rag-backend --no-pager -l | tail -5

echo ""
echo "Frontend Status:"
sudo systemctl status sit-frontend --no-pager -l | tail -5

echo ""
echo "🔍 Step 2: Check port connectivity"
echo "Ports in use:"
netstat -tlnp | grep -E ":(3000|8000)"

echo ""
echo "🔍 Step 3: Test direct RAG backend"
echo "Testing RAG backend health:"
curl -s -X GET http://127.0.0.1:8000/health 2>/dev/null && echo " ✅ RAG backend responding to health check" || echo " ❌ RAG backend not responding"

echo ""
echo "Testing RAG backend chat endpoint:"
curl -s -X POST http://127.0.0.1:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4","messages":[{"role":"user","content":"Hello"}],"stream":false}' \
  2>/dev/null | head -100 && echo " ✅ RAG backend chat working" || echo " ❌ RAG backend chat failing"

echo ""
echo "🔍 Step 4: Test frontend directly"
echo "Testing frontend health:"
curl -s -X GET http://127.0.0.1:3000 2>/dev/null | head -50 && echo " ✅ Frontend serving pages" || echo " ❌ Frontend not responding"

echo ""
echo "Testing frontend chat proxy:"
curl -s -X POST http://127.0.0.1:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4","messages":[{"role":"user","content":"Hello"}],"stream":false}' \
  2>/dev/null | head -100 && echo " ✅ Frontend chat proxy working" || echo " ❌ Frontend chat proxy failing"

echo ""
echo "🔍 Step 5: Check recent logs"
echo "Recent RAG Backend logs:"
sudo journalctl -u sit-rag-backend --no-pager -n 10

echo ""
echo "Recent Frontend logs:"
sudo journalctl -u sit-frontend --no-pager -n 10

echo ""
echo "🔍 Step 6: Environment check"
echo "RAG Backend environment variables:"
sudo systemctl show sit-rag-backend -p Environment

echo ""
echo "Frontend environment variables:"
sudo systemctl show sit-frontend -p Environment

echo ""
echo "🔧 COMMON SOLUTIONS:"
echo "==================="
echo "1. If RAG backend is failing:"
echo "   sudo systemctl restart sit-rag-backend"
echo ""
echo "2. If frontend proxy is failing:"
echo "   sudo systemctl restart sit-frontend"
echo ""
echo "3. View live logs:"
echo "   sudo journalctl -u sit-rag-backend -f"
echo "   sudo journalctl -u sit-frontend -f"
echo ""
echo "4. Check RAG backend startup:"
echo "   It takes ~90 seconds to load BM25 on first request"
echo ""
echo "5. If all else fails, restart both:"
echo "   sudo systemctl restart sit-rag-backend sit-frontend"
