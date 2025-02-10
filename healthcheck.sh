#!/bin/sh
response=$(curl -s --max-time 5 http://localhost:3000/health)
if [ $? -ne 0 ]; then
    echo "Health check failed: curl error or timeout"
    exit 1
fi
echo $response | grep -q '"status":"healthy"'
if [ $? -ne 0 ]; then
    echo "Health check failed: service unhealthy"
    echo "Response: $response"
    exit 1
fi
exit 0