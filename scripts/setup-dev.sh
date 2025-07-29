#!/bin/bash

echo "🚀 Setting up development environment..."

echo "📦 Installing Redis and ngrok..."
brew install redis ngrok

echo "🔧 Starting Redis service..."
brew services start redis

echo "🌐 Starting ngrok tunnel..."
ngrok http http://localhost:3000 