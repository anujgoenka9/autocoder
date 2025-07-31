#!/bin/bash

echo "🤖 Starting FastAPI Agent Server..."

# Check if main .venv exists
if [ ! -d ".venv" ]; then
    echo "❌ Virtual environment .venv not found in main directory!"
    echo "Please create it first: python3 -m venv .venv"
    exit 1
fi

# Activate virtual environment from main directory
echo "🔧 Activating virtual environment..."
source .venv/bin/activate

# # Install dependencies if requirements.txt exists
# if [ -f "requirements.txt" ]; then
#     echo "📦 Installing Python dependencies..."
#     pip install -r requirements.txt
# fi

# Change to api directory and start the FastAPI server
echo "🚀 Starting FastAPI server on port 8000..."
cd api
PYTHONPATH=$(pwd) uvicorn index:app --reload --host 127.0.0.1 --port 8000 