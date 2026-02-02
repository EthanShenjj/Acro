#!/bin/bash

# Acro Demo Recorder - 录制功能测试脚本

echo "=== Acro Demo Recorder 录制功能测试 ==="
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. 检查后端服务
echo "1. 检查后端服务..."
if curl -s http://localhost:5001/api/folders > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 后端服务正在运行${NC}"
else
    echo -e "${RED}❌ 后端服务未运行${NC}"
    echo "   启动后端: cd backend && python app.py"
    exit 1
fi

# 2. 测试录制会话创建
echo ""
echo "2. 测试录制会话创建..."
SESSION_RESPONSE=$(curl -s -X POST http://localhost:5001/api/recording/start \
    -H "Content-Type: application/json" \
    -d '{}')

if echo "$SESSION_RESPONSE" | grep -q "sessionId"; then
    SESSION_ID=$(echo "$SESSION_RESPONSE" | grep -o '"sessionId":"[^"]*"' | cut -d'"' -f4)
    echo -e "${GREEN}✅ 会话创建成功${NC}"
    echo "   Session ID: $SESSION_ID"
else
    echo -e "${RED}❌ 会话创建失败${NC}"
    echo "   响应: $SESSION_RESPONSE"
    exit 1
fi

# 3. 测试步骤上传
echo ""
echo "3. 测试步骤上传..."

# 创建一个简单的测试图片 (1x1 像素的 PNG)
TEST_IMAGE="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

CHUNK_RESPONSE=$(curl -s -X POST http://localhost:5001/api/recording/chunk \
    -H "Content-Type: application/json" \
    -d "{
        \"sessionId\": \"$SESSION_ID\",
        \"orderIndex\": 1,
        \"actionType\": \"click\",
        \"targetText\": \"Test Button\",
        \"posX\": 100,
        \"posY\": 200,
        \"viewportWidth\": 1920,
        \"viewportHeight\": 1080,
        \"screenshotBase64\": \"$TEST_IMAGE\"
    }")

if echo "$CHUNK_RESPONSE" | grep -q "stepId"; then
    STEP_ID=$(echo "$CHUNK_RESPONSE" | grep -o '"stepId":[0-9]*' | cut -d':' -f2)
    echo -e "${GREEN}✅ 步骤上传成功${NC}"
    echo "   Step ID: $STEP_ID"
else
    echo -e "${RED}❌ 步骤上传失败${NC}"
    echo "   响应: $CHUNK_RESPONSE"
fi

# 4. 测试录制停止
echo ""
echo "4. 测试录制停止..."
STOP_RESPONSE=$(curl -s -X POST http://localhost:5001/api/recording/stop \
    -H "Content-Type: application/json" \
    -d "{\"sessionId\": \"$SESSION_ID\"}")

if echo "$STOP_RESPONSE" | grep -q "projectId"; then
    PROJECT_ID=$(echo "$STOP_RESPONSE" | grep -o '"projectId":[0-9]*' | cut -d':' -f2)
    PROJECT_UUID=$(echo "$STOP_RESPONSE" | grep -o '"uuid":"[^"]*"' | cut -d'"' -f4)
    echo -e "${GREEN}✅ 录制停止成功${NC}"
    echo "   Project ID: $PROJECT_ID"
    echo "   Project UUID: $PROJECT_UUID"
    echo "   编辑器 URL: http://localhost:3000/editor/$PROJECT_UUID"
else
    echo -e "${RED}❌ 录制停止失败${NC}"
    echo "   响应: $STOP_RESPONSE"
fi

# 5. 检查扩展状态
echo ""
echo "5. 扩展检查清单:"
echo "   □ 在 chrome://extensions/ 确认扩展已启用"
echo "   □ 点击扩展图标，应该看到 'Ready to record'"
echo "   □ 点击 'Start Recording' 按钮"
echo "   □ 等待 3 秒倒计时"
echo "   □ 在页面上点击任意位置"
echo "   □ 应该看到红色涟漪动画"
echo "   □ 点击扩展图标，应该看到步骤计数增加"

echo ""
echo "=== 测试完成 ==="
echo ""
echo "如果后端测试都通过但扩展仍无法录制，请："
echo "1. 打开浏览器控制台 (F12)"
echo "2. 复制并运行 extension/diagnostic-test.js 中的代码"
echo "3. 查看详细的诊断结果"
