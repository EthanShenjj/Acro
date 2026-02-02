#!/bin/bash

echo "=== 简单MySQL录制测试 ==="

# 启动会话
echo "1. 启动录制会话..."
SESSION_RESPONSE=$(curl -s -X POST http://localhost:5001/api/recording/start -H "Content-Type: application/json" -d '{}')
echo "响应: $SESSION_RESPONSE"

SESSION_ID=$(echo "$SESSION_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['sessionId'])")
echo "会话ID: $SESSION_ID"
echo ""

# 上传步骤
echo "2. 上传步骤..."
TEST_IMAGE="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="

CHUNK_RESPONSE=$(curl -s -X POST http://localhost:5001/api/recording/chunk \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\": \"$SESSION_ID\", \"orderIndex\": 1, \"actionType\": \"click\", \"targetText\": \"MySQL测试\", \"posX\": 100, \"posY\": 200, \"viewportWidth\": 1920, \"viewportHeight\": 1080, \"screenshotBase64\": \"$TEST_IMAGE\"}")

echo "响应: $CHUNK_RESPONSE"
STEP_ID=$(echo "$CHUNK_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('stepId', 'ERROR'))")
echo "步骤ID: $STEP_ID"
echo ""

# 检查MySQL
echo "3. 检查MySQL数据库..."
/usr/local/mysql/bin/mysql -u root -prootroot -e "USE acro_db; SELECT * FROM steps WHERE id = $STEP_ID;" 2>&1 | grep -v "Warning"
echo ""

# 停止录制
echo "4. 停止录制..."
STOP_RESPONSE=$(curl -s -X POST http://localhost:5001/api/recording/stop \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\": \"$SESSION_ID\"}")
echo "响应: $STOP_RESPONSE"

echo ""
echo "=== 测试完成 ==="
