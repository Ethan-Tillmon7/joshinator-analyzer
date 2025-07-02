#!/bin/bash
# setup_demo.sh - Setup Whatsnot Card Analyzer Demo

echo "🚀 Setting up Whatsnot Card Analyzer Demo..."

# Fix file organization
echo "📁 Fixing file organization..."
if [ -f "backend/app/requirements.txt" ]; then
    mv backend/app/requirements.txt backend/requirements.txt
    echo "✅ Moved requirements.txt to correct location"
fi

if [ -f "backend/app/.env.example" ]; then
    mv backend/app/.env.example backend/.env.example  
    echo "✅ Moved .env.example to correct location"
fi

if [ -d ".venv" ]; then
    rm -rf .venv
    echo "✅ Removed duplicate virtual environment"
fi

# Setup backend environment
echo "🐍 Setting up backend environment..."
cd backend

if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "📝 Created .env file from example"
    echo ""
    echo "⚠️  IMPORTANT: Edit backend/.env with your API keys:"
    echo "   - EBAY_APP_ID=your_ebay_app_id"
    echo "   - EBAY_DEV_ID=your_ebay_dev_id"  
    echo "   - EBAY_CERT_ID=your_ebay_cert_id"
    echo "   - ANTHROPIC_API_KEY=your_anthropic_api_key"
    echo ""
fi

# Activate virtual environment
if [ -d "venv" ]; then
    source venv/bin/activate
    echo "✅ Activated virtual environment"
else
    python3 -m venv venv
    source venv/bin/activate
    echo "✅ Created and activated virtual environment"
fi

# Install Python dependencies
echo "📦 Installing Python dependencies..."
pip install -r requirements.txt

# Add ROI calculator import to websocket.py
echo "🔧 Updating websocket imports..."
if ! grep -q "roi_calculator" app/api/websocket.py; then
    sed -i '' '6i\
from app.services.roi_calculator import roi_calculator
' app/api/websocket.py
fi

# Test setup
echo "🧪 Testing setup..."
if python test_claude.py; then
    echo "✅ Claude integration test passed"
else
    echo "⚠️  Claude test failed - check your API key"
fi

# Setup frontend
cd ../frontend
echo "⚛️ Setting up frontend..."

if [ ! -d "node_modules" ]; then
    echo "📦 Installing npm dependencies..."
    npm install
fi

echo "✅ Setup complete!"
echo ""
echo "🎯 Next Steps:"
echo "1. Edit backend/.env with your API keys"
echo "2. Start backend: ./run_backend.sh"
echo "3. Start frontend: ./run_frontend.sh"  
echo "4. Open browser to http://localhost:3000"
echo "5. Mirror your phone to Mac (AirPlay/QuickTime)"
echo "6. Open Whatsnot auction on phone"
echo "7. Select capture region in the app"
echo "8. Start analyzing auctions for ROI!"

# Create quick run scripts
cd ..
cat > run_backend.sh << 'EOF'
#!/bin/bash
cd backend
source venv/bin/activate
python -m uvicorn app.main:socket_app --reload --host 0.0.0.0 --port 8000
EOF

cat > run_frontend.sh << 'EOF'
#!/bin/bash
cd frontend  
npm start
EOF

chmod +x run_backend.sh
chmod +x run_frontend.sh

echo ""
echo "📜 Created convenience scripts:"
echo "  ./run_backend.sh  - Start backend server"
echo "  ./run_frontend.sh - Start frontend app"
echo ""
echo "🔑 eBay API Setup:"
echo "  1. Go to https://developer.ebay.com/"
echo "  2. Create sandbox app"
echo "  3. Get App ID, Dev ID, and Cert ID"
echo "  4. Add them to backend/.env"
echo ""
echo "🤖 Claude API Setup:"
echo "  1. Go to https://console.anthropic.com/"
echo "  2. Create API key"
echo "  3. Add ANTHROPIC_API_KEY to backend/.env"
echo ""
echo "🎯 Demo Flow:"
echo "  - Mirror phone showing Whatsnot auction"
echo "  - Select the auction area in the app"
echo "  - Get real-time ROI analysis as you watch!"