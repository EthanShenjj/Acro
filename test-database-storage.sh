#!/bin/bash

echo "=== 数据库存储诊断 ==="
echo ""

# 1. 检查后端是否运行
echo "1. 检查后端服务..."
if curl -s http://localhost:5001/health > /dev/null 2>&1; then
    echo "✓ 后端服务正在运行"
else
    echo "✗ 后端服务未运行"
    echo "请先启动后端: cd backend && python app.py"
    exit 1
fi

# 2. 检查数据库文件
echo ""
echo "2. 检查数据库文件..."
if [ -f "backend/acro.db" ]; then
    echo "✓ 数据库文件存在: backend/acro.db"
    ls -lh backend/acro.db
else
    echo "✗ 数据库文件不存在"
    exit 1
fi

# 3. 查看当前数据库内容
echo ""
echo "3. 当前数据库内容:"
echo "--- Projects ---"
sqlite3 backend/acro.db "SELECT id, title, created_at FROM projects ORDER BY created_at DESC LIMIT 5;"

echo ""
echo "--- Steps ---"
sqlite3 backend/acro.db "SELECT id, project_id, order_index, action_type, target_text FROM steps ORDER BY id DESC LIMIT 10;"

echo ""
echo "--- 统计 ---"
PROJECT_COUNT=$(sqlite3 backend/acro.db "SELECT COUNT(*) FROM projects;")
STEP_COUNT=$(sqlite3 backend/acro.db "SELECT COUNT(*) FROM steps;")
echo "总项目数: $PROJECT_COUNT"
echo "总步骤数: $STEP_COUNT"

# 4. 测试录制API
echo ""
echo "4. 测试录制API..."

# 启动录制会话
echo "启动录制会话..."
START_RESPONSE=$(curl -s -X POST http://localhost:5001/api/recording/start \
  -H "Content-Type: application/json" \
  -d '{}')

SESSION_ID=$(echo $START_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin).get('sessionId', ''))")

if [ -z "$SESSION_ID" ]; then
    echo "✗ 无法启动录制会话"
    echo "响应: $START_RESPONSE"
    exit 1
fi

echo "✓ 录制会话已启动: $SESSION_ID"

# 上传测试步骤
echo ""
echo "上传测试步骤..."

# 创建一个简单的测试图片 (1x1 红色像素的PNG)
TEST_IMAGE="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="

CHUNK_RESPONSE=$(curl -s -X POST http://localhost:5001/api/recording/chunk \
  -H "Content-Type: application/json" \
  -d "{
    \"sessionId\": \"$SESSION_ID\",
    \"orderIndex\": 1,
    \"actionType\": \"click\",
    \"targetText\": \"测试按钮\",
    \"posX\": 100,
    \"posY\": 200,
    \"viewportWidth\": 1920,
    \"viewportHeight\": 1080,
    \"screenshotBase64\": \"$TEST_IMAGE\"
  }")

echo "响应: $CHUNK_RESPONSE"

STEP_ID=$(echo $CHUNK_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin).get('stepId', ''))")

if [ -z "$STEP_ID" ]; then
    echo "✗ 步骤上传失败"
    exit 1
fi

echo "✓ 步骤已上传: Step ID = $STEP_ID"

# 5. 验证数据库中的数据
echo ""
echo "5. 验证数据库中的新数据..."
sleep 1

NEW_STEP=$(sqlite3 backend/acro.db "SELECT id, project_id, order_index, action_type, target_text FROM steps WHERE id = $STEP_ID;")

if [ -z "$NEW_STEP" ]; then
    echo "✗ 数据库中未找到新步骤！"
    echo ""
    echo "这是问题所在！步骤没有被保存到数据库。"
else
    echo "✓ 数据库中找到新步骤:"
    echo "$NEW_STEP"
fi

# 停止录制
echo ""
echo "6. 停止录制..."
STOP_RESPONSE=$(curl -s -X POST http://localhost:5001/api/recording/stop \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\": \"$SESSION_ID\"}")

echo "响应: $STOP_RESPONSE"

PROJECT_ID=$(echo $STOP_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin).get('projectId', ''))")

if [ -z "$PROJECT_ID" ]; then
    echo "✗ 停止录制失败"
else
    echo "✓ 录制已停止: Project ID = $PROJECT_ID"
fi

# 7. 最终数据库状态
echo ""
echo "7. 最终数据库状态:"
echo "--- Projects ---"
sqlite3 backend/acro.db "SELECT id, title, created_at FROM projects ORDER BY created_at DESC LIMIT 5;"

echo ""
echo "--- Steps ---"
sqlite3 backend/acro.db "SELECT id, project_id, order_index, action_type, target_text FROM steps ORDER BY id DESC LIMIT 10;"

echo ""
echo "=== 诊断完成 ==="
