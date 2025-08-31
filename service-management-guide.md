# SIT Chatbot - 24/7 Service Management Options

## Option 1: Systemd (Recommended for Ubuntu Server)

### Pros:
- ✅ Native to Ubuntu/Linux systems
- ✅ Automatic startup on boot
- ✅ Robust process monitoring
- ✅ Integrated with system logging (journalctl)
- ✅ Better resource management
- ✅ Standard for production servers

### Setup:
```bash
sudo chmod +x /home/ubuntu/SIT-Chatbot-RAG/setup-systemd-services.sh
sudo /home/ubuntu/SIT-Chatbot-RAG/setup-systemd-services.sh
```

### Key Commands:
```bash
# Check status
sudo systemctl status sit-rag-backend sit-frontend

# View logs
sudo journalctl -u sit-rag-backend -f
sudo journalctl -u sit-frontend -f

# Restart services
sudo systemctl restart sit-rag-backend sit-frontend

# Stop/Start
sudo systemctl stop sit-rag-backend sit-frontend
sudo systemctl start sit-rag-backend sit-frontend
```

---

## Option 2: PM2 (Good for Node.js Developers)

### Pros:
- ✅ Easy to use and monitor
- ✅ Built-in monitoring dashboard (pm2 monit)
- ✅ Zero-downtime reloads
- ✅ Better for mixed Node.js/Python environments
- ✅ Rich command-line interface

### Setup:
```bash
chmod +x /home/ubuntu/SIT-Chatbot-RAG/setup-pm2-services.sh
/home/ubuntu/SIT-Chatbot-RAG/setup-pm2-services.sh
```

### Key Commands:
```bash
# Check status
pm2 status

# View logs
pm2 logs

# Restart
pm2 restart all

# Monitor
pm2 monit
```

---

## Recommendation

**For your Ubuntu server deployment, I recommend Systemd** because:

1. **Better integration** with Ubuntu system
2. **More reliable** for production environments
3. **Better resource management** for Python processes
4. **Standard practice** for server deployments
5. **Easier troubleshooting** with journalctl

---

## Quick Setup Instructions

### If you choose Systemd:
```bash
sudo chmod +x /home/ubuntu/SIT-Chatbot-RAG/setup-systemd-services.sh
sudo /home/ubuntu/SIT-Chatbot-RAG/setup-systemd-services.sh
```

### If you choose PM2:
```bash
chmod +x /home/ubuntu/SIT-Chatbot-RAG/setup-pm2-services.sh
/home/ubuntu/SIT-Chatbot-RAG/setup-pm2-services.sh
```

Both will:
- ✅ Start your services automatically
- ✅ Restart them if they crash
- ✅ Start on system boot
- ✅ Provide logging and monitoring

Choose the one you're more comfortable with!
