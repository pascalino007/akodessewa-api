#!/bin/bash

# VPS Setup Script for Akodessewa API
# Run this script once on your VPS to prepare it for deployment

set -e

echo "🚀 Setting up VPS for Akodessewa API deployment..."

# Update system
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Install Node.js 18
echo "📦 Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Install PM2 for process management
echo "📦 Installing PM2..."
npm install -g pm2

# Install PostgreSQL
echo "📦 Installing PostgreSQL..."
apt install -y postgresql postgresql-contrib

# Start and enable PostgreSQL
systemctl start postgresql
systemctl enable postgresql

# Create database and user
echo "🗄️ Setting up database..."
sudo -u postgres psql -c "CREATE DATABASE akodessewa_db;"
sudo -u postgres psql -c "CREATE USER akodessewa_user WITH PASSWORD 'your_secure_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE akodessewa_db TO akodessewa_user;"

# Create deployment directory
echo "📁 Creating deployment directory..."
mkdir -p /akodessewa-api
chown -R root:root /akodessewa-api

# Create PM2 ecosystem file
echo "⚙️ Creating PM2 configuration..."
cat > /akodessewa-api/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'akodessewa-api',
    script: 'dist/main.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 4045
    },
    error_file: '/akodessewa-api/logs/err.log',
    out_file: '/akodessewa-api/logs/out.log',
    log_file: '/akodessewa-api/logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
EOF

# Create logs directory
mkdir -p /akodessewa-api/logs

# Setup firewall
echo "🔥 Setting up firewall..."
ufw allow ssh
ufw allow 4045
ufw --force enable

# Create systemd service for auto-restart
echo "⚙️ Creating systemd service..."
cat > /etc/systemd/system/akodessewa-api.service << 'EOF'
[Unit]
Description=Akodessewa API
After=network.target

[Service]
Type=forking
User=root
WorkingDirectory=/akodessewa-api
ExecStart=/usr/bin/pm2 start /akodessewa-api/ecosystem.config.js
ExecReload=/usr/bin/pm2 reload akodessewa-api
ExecStop=/usr/bin/pm2 stop akodessewa-api
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Enable and start the service
systemctl daemon-reload
systemctl enable akodessewa-api

echo "✅ VPS setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Update your .env file on the VPS with production values"
echo "2. Set up your database connection string in .env"
echo "3. The GitHub Actions workflow will deploy to /akodessewa-api"
echo "4. Your API will be available at http://168.231.101.119:4045"
echo ""
echo "🔐 Security reminders:"
echo "- Change the default PostgreSQL password"
echo "- Set up SSL certificates for HTTPS"
echo "- Configure proper firewall rules"
echo "- Use environment variables for sensitive data"
