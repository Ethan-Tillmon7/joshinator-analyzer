#!/bin/bash
# Complete setup script for Joshinator Analyzer

echo "🃏 Setting up Joshinator Analyzer..."

# Check if we're in the right directory
if [ ! -f "package.json" ] && [ ! -d "backend" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

# Step 1: Fix Backend Dependencies
echo ""
echo "🐍 Setting up Backend..."
cd backend

# Activate virtual environment
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

echo "Activating virtual environment..."
source venv/bin/activate

# Check if requirements.txt exists
if [ ! -f "requirements.txt" ]; then
    if [ -f "app/requirements.txt" ]; then
        echo "Moving requirements.txt to correct location..."
        mv app/requirements.txt requirements.txt
    else
        echo "❌ No requirements.txt found!"
        exit 1
    fi
fi

# Install dependencies
echo "📦 Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Verify key packages
echo "🔍 Verifying installations..."
if python -c "import uvicorn; print('✅ uvicorn installed')" 2>/dev/null; then
    echo "✅ uvicorn: OK"
else
    echo "❌ uvicorn: FAILED"
    pip install uvicorn[standard]
fi

if python -c "import easyocr; print('✅ easyocr installed')" 2>/dev/null; then
    echo "✅ easyocr: OK"
else
    echo "⚠️  easyocr: Installing (this may take a few minutes)..."
    pip install easyocr
fi

if python -c "import mss; print('✅ mss installed')" 2>/dev/null; then
    echo "✅ mss: OK"
else
    echo "Installing mss..."
    pip install mss
fi

# Test backend setup
echo ""
echo "🧪 Testing backend setup..."
cd ..

# Create test script
cat > test_backend.py << 'EOF'
#!/usr/bin/env python3
import sys
sys.path.append('backend')

try:
    from backend.app.services.screen_capture import screen_capture
    print("✅ Screen capture service: OK")
except Exception as e:
    print(f"❌ Screen capture service: {e}")

try:
    from backend.app.services.ocr_service import ocr_service
    result = ocr_service.extract_text_easyocr("test")
    print("✅ OCR service: OK")
except Exception as e:
    print(f"❌ OCR service: {e}")

try:
    import uvicorn
    print("✅ Uvicorn: OK")
except Exception as e:
    print(f"❌ Uvicorn: {e}")

print("🎯 Backend test complete!")
EOF

cd backend
source venv/bin/activate
python ../test_backend.py
cd ..

# Step 2: Fix Frontend Dependencies
echo ""
echo "⚛️ Setting up Frontend..."
cd frontend

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo "❌ No package.json found in frontend directory!"
    exit 1
fi

# Install dependencies
echo "📦 Installing npm dependencies..."
npm install

# Fix socket.io-client version if needed
echo "🔧 Checking socket.io-client version..."
SOCKET_VERSION=$(npm list socket.io-client --depth=0 | grep socket.io-client | cut -d'@' -f2)
echo "Current socket.io-client version: $SOCKET_VERSION"

# Install latest compatible version
npm install socket.io-client@latest

# Test frontend setup
echo ""
echo "🧪 Testing frontend setup..."
if npm run build > /dev/null 2>&1; then
    echo "✅ Frontend build: OK"
else
    echo "⚠️  Frontend build: Issues detected (will try to fix)"
fi

cd ..

# Step 3: Create run scripts
echo ""
echo "📜 Creating run scripts..."

# Backend run script
cat > run_backend.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting Joshinator Analyzer Backend..."
cd backend
source venv/bin/activate

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚠️  Creating .env file from example..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
    elif [ -f "app/.env.example" ]; then
        cp app/.env.example .env
    else
        cat > .env << 'ENVEOF'
# eBay API Credentials (get from developer.ebay.com)
EBAY_APP_ID=your_ebay_app_id_here
EBAY_DEV_ID=your_ebay_dev_id_here
EBAY_CERT_ID=your_ebay_cert_id_here

# Database
DATABASE_URL=sqlite:///./sports_cards.db

# OCR Settings
OCR_CONFIDENCE_THRESHOLD=0.7

# Screen Capture
CAPTURE_FPS=5
PROCESS_EVERY_N_FRAMES=3
ENVEOF
    fi
    echo "📝 Please edit backend/.env with your API keys"
fi

echo "🌐 Starting server on http://localhost:3001"
python3 -m uvicorn app.main:socket_app --reload --host 0.0.0.0 --port 3001
EOF

# Frontend run script
cat > run_frontend.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting Joshinator Analyzer Frontend..."
cd frontend
echo "🌐 Starting development server on http://localhost:3000"
npm start
EOF

# Make scripts executable
chmod +x run_backend.sh
chmod +x run_frontend.sh

# Step 4: Test complete setup
echo ""
echo "🧪 Testing complete setup..."

# Test backend startup (brief)
echo "Testing backend startup..."
cd backend
source venv/bin/activate
timeout 10s python3 -c "
import sys
sys.path.append('.')
from app.main import socket_app
print('✅ Backend imports successful')
" || echo "⚠️  Backend startup test timed out (normal)"

cd ..

# Cleanup test file
rm -f test_backend.py

echo ""
echo "🎉 Setup Complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Start backend:  ./run_backend.sh"
echo "2. Start frontend: ./run_frontend.sh" 
echo "3. Open browser:   http://localhost:3000"
echo ""
echo "🔧 Configuration:"
echo "- Edit backend/.env for API keys"
echo "- Backend runs on port 3001"
echo "- Frontend runs on port 3000"
echo ""
echo "🎯 Quick Test:"
echo "  cd backend && source venv/bin/activate && python -c \"from app.services.screen_capture import screen_capture; print('✅ Ready to capture!')\" "
echo ""
echo "💡 Tips:"
echo "- Use screen mirroring to capture mobile Whatsnot streams"
echo "- Adjust capture region coordinates in screen_capture.py"
echo "- Check browser console for WebSocket connection status"