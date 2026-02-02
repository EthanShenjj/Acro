# 快速测试：录制功能问题排查

## 当前情况
- ✅ Dashboard 正在运行 (localhost:3000)
- ✅ 可以访问编辑器页面
- ❌ 录制时没有捕获到画面和事件

## 立即检查的 3 个关键点

### 1️⃣ 检查后端是否在运行
打开新终端：
```bash
cd backend
python app.py
```

应该看到：
```
* Running on http://127.0.0.1:5001
```

### 2️⃣ 检查扩展是否加载
1. 打开 `chrome://extensions/`
2. 找到 "Acro Demo Recorder"
3. 确认：
   - ✅ 已启用（开关是蓝色的）
   - ✅ 没有错误消息
   - ✅ 可以看到版本 1.0.0

### 3️⃣ 测试录制流程
1. **打开任意网页**（比如 google.com）
2. **点击扩展图标**（应该看到弹窗）
3. **点击 "Start Recording"**
4. **等待 3 秒倒计时**（屏幕上应该显示 3、2、1）
5. **在页面上点击任意位置**
6. **观察是否有红色涟漪动画**

## 如果没有看到倒计时

这说明扩展的 content script 没有注入。解决方法：

```bash
# 1. 在 chrome://extensions/ 点击扩展的刷新按钮 🔄
# 2. 关闭并重新打开要录制的网页
# 3. 再次尝试录制
```

## 如果看到倒计时但点击没有反应

打开浏览器控制台（F12）查看是否有错误：

**期望看到的日志：**
```
[Acro] Content script loaded
[Acro] Starting capture
[Acro] Mouse down detected
[Acro] Processing click event
```

**如果没有这些日志：**
- 说明事件监听器没有添加
- 检查 Background Script 日志（chrome://extensions/ → Service Worker）

## 如果点击有涟漪但没有保存

这说明后端连接有问题。检查：

1. **后端是否在运行**
   ```bash
   curl http://localhost:5001/api/folders
   ```
   应该返回 JSON 数据

2. **CORS 配置**
   检查 `backend/.env` 中的 CORS_ORIGINS 是否包含扩展

3. **Network 错误**
   在控制台的 Network 标签查看是否有失败的请求

## 最可能的原因

根据你的情况（可以创建项目但没有步骤），最可能是：

### 原因 A: Content Script 未注入
**症状：** 点击 Start Recording 后没有倒计时
**解决：** 重新加载扩展 + 刷新页面

### 原因 B: 事件监听器未启动
**症状：** 有倒计时但点击没反应
**解决：** 检查控制台日志，查看是否有 JavaScript 错误

### 原因 C: 后端连接失败
**症状：** 有涟漪动画但步骤没保存
**解决：** 确认后端在 5001 端口运行

## 下一步

请按顺序检查上面的 3 个关键点，然后告诉我：
1. 后端是否在运行？
2. 点击 Start Recording 后是否看到倒计时？
3. 点击页面时是否看到红色涟漪？
4. 浏览器控制台有什么日志或错误？

这样我可以精确定位问题所在。
