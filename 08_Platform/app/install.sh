#!/bin/bash

# SI8 Creator Portal - Installation Script
# This script sets up the development environment

set -e  # Exit on error

echo "🚀 SI8 Creator Portal - Installation"
echo "===================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found"
    echo "Please run this script from /Users/JD/Desktop/SuperImmersive8/08_Platform/app"
    exit 1
fi

# Check Node.js version
echo "📦 Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Error: Node.js 18+ required (you have $(node -v))"
    echo "Install from: https://nodejs.org"
    exit 1
fi
echo "✅ Node.js $(node -v) detected"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install
echo "✅ Dependencies installed"
echo ""

# Check for .env.local
echo "🔑 Checking environment variables..."
if [ ! -f "../../.env.local" ]; then
    echo "⚠️  Warning: .env.local not found at /Users/JD/Desktop/SuperImmersive8/.env.local"
    echo "You'll need to create it with your Supabase and Stripe credentials"
else
    echo "✅ .env.local found"

    # Check if Stripe keys are configured
    if grep -q "pk_test_REPLACE_WITH_YOUR_KEY" ../../.env.local 2>/dev/null; then
        echo "⚠️  Warning: Stripe keys not configured in .env.local"
        echo "Add your keys from: https://dashboard.stripe.com/test/apikeys"
    else
        echo "✅ Stripe keys appear to be configured"
    fi
fi
echo ""

# Check if Stripe CLI is installed
echo "🔧 Checking optional tools..."
if command -v stripe &> /dev/null; then
    echo "✅ Stripe CLI installed ($(stripe --version))"
else
    echo "⚠️  Stripe CLI not installed (optional for webhook testing)"
    echo "Install with: brew install stripe/stripe-cli/stripe"
fi
echo ""

# Summary
echo "✅ Installation Complete!"
echo ""
echo "Next steps:"
echo "1. Add Stripe keys to .env.local (see ENV_SETUP.md)"
echo "2. Run: npm run dev"
echo "3. Open: http://localhost:3000"
echo ""
echo "📚 Documentation:"
echo "   - START_HERE.md    - Overview and navigation"
echo "   - QUICKSTART.md    - 5-minute setup guide"
echo "   - README.md        - Full documentation"
echo ""
echo "Need help? Read START_HERE.md or contact jd@superimmersive8.com"
echo ""
