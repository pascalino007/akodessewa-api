#!/bin/bash

echo "🧪 Testing Upload Endpoints"
echo "=========================="

# Test if server is running
echo "🔍 Checking if server is running on port 4045..."
if curl -s -o /dev/null -w "%{http_code}" http://168.231.101.119:4045/api/v1 | grep -q "200\|404\|401"; then
    echo "✅ Server is accessible"
else
    echo "❌ Server is not accessible"
    echo "💡 Make sure the application is deployed and running on port 4045"
    echo "💡 Check the deployment logs with: ssh root@168.231.101.119 'pm2 logs'"
    exit 1
fi

# Test upload endpoints
echo ""
echo "🔍 Testing upload endpoints..."

# Test multiple endpoint
echo "Testing: /api/v1/upload/multiple"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://168.231.101.119:4045/api/v1/upload/multiple)
if [ "$STATUS" = "404" ]; then
    echo "❌ /api/v1/upload/multiple - Not Found (404)"
elif [ "$STATUS" = "405" ]; then
    echo "✅ /api/v1/upload/multiple - Method Not Allowed (405) - Endpoint exists"
else
    echo "✅ /api/v1/upload/multiple - Status: $STATUS"
fi

# Test batch endpoint
echo "Testing: /api/v1/upload/batch"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://168.231.101.119:4045/api/v1/upload/batch)
if [ "$STATUS" = "404" ]; then
    echo "❌ /api/v1/upload/batch - Not Found (404)"
elif [ "$STATUS" = "405" ]; then
    echo "✅ /api/v1/upload/batch - Method Not Allowed (405) - Endpoint exists"
else
    echo "✅ /api/v1/upload/batch - Status: $STATUS"
fi

# Test single endpoint
echo "Testing: /api/v1/upload/single"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://168.231.101.119:4045/api/v1/upload/single)
if [ "$STATUS" = "404" ]; then
    echo "❌ /api/v1/upload/single - Not Found (404)"
elif [ "$STATUS" = "405" ]; then
    echo "✅ /api/v1/upload/single - Method Not Allowed (405) - Endpoint exists"
else
    echo "✅ /api/v1/upload/single - Status: $STATUS"
fi

# Test actual file upload
echo ""
echo "📤 Testing actual file upload..."

# Create a test file
echo "This is a test file for upload" > test.txt

# Test upload with curl
echo "Uploading test file..."
RESPONSE=$(curl -s -X POST \
  -F "files=@test.txt" \
  -F "folder=products" \
  http://168.231.101.119:4045/api/v1/upload/multiple)

echo "Response: $RESPONSE"

# Check if upload was successful
if echo "$RESPONSE" | grep -q "url\|key"; then
    echo "✅ Upload successful!"
else
    echo "❌ Upload failed"
    echo "Response details: $RESPONSE"
fi

# Clean up
rm -f test.txt

echo ""
echo "🔍 Checking PM2 status on VPS..."
ssh root@168.231.101.119 "pm2 list" 2>/dev/null || echo "❌ PM2 not accessible or not installed"

echo ""
echo "📚 Available endpoints:"
echo "http://168.231.101.119:4045/api/v1/upload/single"
echo "http://168.231.101.119:4045/api/v1/upload/batch"
echo "http://168.231.101.119:4045/api/v1/upload/multiple"
echo ""
echo "📖 API Documentation: http://168.231.101.119:4045/docs"
