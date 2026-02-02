#!/bin/bash

# Acro 录制功能测试启动脚本

echo "=== Acro 录制功能测试 ==="
echo ""

# 检查后端是否运行
echo "检查后端状态..."
if curl -s http://localhost:5001/api/folders > /dev/null 2>&1; then
    echo "✅ 后端已运行 (http://localhost:5001)"
else
    echo "❌ 后端未运行"
    echo ""
    echo "请在另一个终端运行："
    echo "  cd backend && python app.py"
    echo ""
    read -p "按回车键继续（确保后端已启动）..."
fi

echo ""
echo "启动测试服务器..."
echo "测试页面将在: http://localhost:8000/test-page.html"
echo ""
echo "📋 测试步骤："
echo "1. 在浏览器中打开: http://localhost:8000/test-page.html"
echo "2. 按 F12 打开控制台"
echo "3. 确认看到 '[Acro] Content script loaded' 日志"
echo "4. 点击扩展图标 → Start Recording"
echo "5. 等待 3 秒倒计时完全消失 ⭐"
echo "6. 点击页面按钮（应该有红色涟漪）"
echo "7. 滚动页面（应该有蓝色指示器）"
echo "8. 点击扩展图标 → Done"
echo "9. 检查编辑器是否显示步骤"
echo ""
echo "按 Ctrl+C 停止服务器"
echo ""
echo "=== 服务器启动中 ==="
echo ""

# 启动 Python HTTP 服务器
python3 -m http.server 8000
