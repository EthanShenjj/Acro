# 录制功能故障排除指南

## 问题：没有录制到任何画面和事件

### 🔍 诊断流程

按照以下步骤逐一排查问题：

---

## 步骤 1: 验证后端服务

### 检查后端是否运行
```bash
cd backend
python app.py
```

应该看到：
```
 * Running on http://127.0.0.1:5001
 * Running on http://0.0.0.0:5001
```

### 测试后端 API
在新终端运行：
```bash
curl http://localhost:5001/api/folders
```

应该返回 JSON 数据（文件夹列表）

**如果失败：**
- 检查端口 5001 是否被占用
- 检查 `backend/.env` 配置
- 查看后端终端的错误日志

---

## 步骤 2: 验证扩展安装

### 检查扩展状态
1. 打开 `chrome://extensions/`
2. 找到 "Acro Demo Recorder"
3. 确认：
   - ✅ 扩展已启用（开关是蓝色）
   - ✅ 版本显示为 1.0.0
   - ✅ 没有红色错误消息

### 重新加载扩展
1. 在 `chrome://extensions/` 页面
2. 找到 "Acro Demo Recorder"
3. 点击 🔄 刷新按钮
4. 查看是否有错误消息

---

## 步骤 3: 使用测试页面

### 打开测试页面
```bash
# 在项目根目录
open test-page.html
# 或者在浏览器中打开 file:///path/to/test-page.html
```

### 执行录制测试
1. **打开浏览器控制台**（F12 或 Cmd+Option+I）
2. **点击扩展图标**
3. **点击 "Start Recording"**
4. **观察控制台日志**

---

## 步骤 4: 检查控制台日志

### 期望看到的日志（按顺序）

#### 页面控制台（F12）
```
[Acro] Content script loaded at: 2026-01-31T...
[Acro] Initial state - isRecording: false isPaused: false
[Acro] Content script received message: SHOW_COUNTDOWN
[Acro] Showing countdown for 3 seconds
[Acro] Countdown completed
[Acro] Content script received message: START_CAPTURE
[Acro] Received START_CAPTURE message
[Acro] Starting capture, isRecording: false isPaused: false
[Acro] Capture started, event listener added
```

#### 点击按钮后
```
[Acro] Mouse down detected, isRecording: true isPaused: false
[Acro] Processing click event
```

### 如果没有看到这些日志

#### 情况 A: 完全没有 [Acro] 日志
**原因：** Content script 未注入

**解决方案：**
1. 重新加载扩展（chrome://extensions/ → 刷新）
2. 刷新测试页面（Cmd+R 或 F5）
3. 再次尝试录制

#### 情况 B: 有 "Content script loaded" 但没有 "received message"
**原因：** Popup 无法与 content script 通信

**解决方案：**
1. 检查 Background Script 日志（见步骤 5）
2. 确认页面 URL 不是 chrome:// 或 about:// 开头
3. 使用 test-page.html 或普通网页测试

#### 情况 C: 有 "START_CAPTURE" 但没有 "Mouse down detected"
**原因：** 事件监听器未添加或页面被冻结

**解决方案：**
1. 检查 `isRecording` 状态是否为 true
2. 确认没有其他扩展干扰
3. 尝试在不同的页面元素上点击

---

## 步骤 5: 检查 Background Script

### 打开 Background Script 控制台
1. 打开 `chrome://extensions/`
2. 找到 "Acro Demo Recorder"
3. 点击 "Service Worker" 或 "检查视图"

### 期望看到的日志
```
Background received message: START_RECORDING
Started recording session: <uuid>
Background received message: UPLOAD_STEP
Saved step <id> for session <uuid>
```

### 如果看到错误

#### "Failed to start recording session"
**原因：** 无法连接到后端

**解决方案：**
```bash
# 确认后端运行
curl http://localhost:5001/api/recording/start -X POST -H "Content-Type: application/json" -d '{}'
```

#### "Failed to capture screenshot"
**原因：** 缺少截图权限

**解决方案：**
1. 检查 manifest.json 中的 `activeTab` 权限
2. 重新加载扩展

---

## 步骤 6: 检查网络请求

### 打开 Network 标签
1. 在页面控制台（F12）
2. 切换到 "Network" 标签
3. 开始录制并点击页面

### 期望看到的请求
1. `POST http://localhost:5001/api/recording/start` → 200 OK
2. `POST http://localhost:5001/api/recording/chunk` → 200 OK（每次点击）
3. `POST http://localhost:5001/api/recording/stop` → 200 OK

### 如果请求失败

#### 404 Not Found
**原因：** 后端路由未正确配置

**解决方案：**
```bash
cd backend
# 检查 app.py 是否注册了 recording_bp
grep "recording_bp" app.py
```

#### CORS Error
**原因：** CORS 配置问题

**解决方案：**
检查 `backend/.env`:
```
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
```

添加扩展 ID（如果需要）

#### Connection Refused
**原因：** 后端未运行

**解决方案：**
```bash
cd backend
python app.py
```

---

## 常见问题和解决方案

### Q1: 点击 Start Recording 后没有任何反应
**A:** 
1. 打开控制台查看错误
2. 确认不是在 chrome:// 页面
3. 重新加载扩展和页面

### Q2: 看到倒计时但点击没有涟漪动画
**A:**
1. 检查控制台是否有 "Mouse down detected"
2. 确认 `isRecording` 为 true
3. 尝试点击不同的元素

### Q3: 有涟漪动画但步骤没有保存
**A:**
1. 检查 Network 标签的请求状态
2. 确认后端正在运行
3. 查看 Background Script 日志

### Q4: 录制完成但项目是空的
**A:**
1. 检查 Background Script 是否有 "Saved step" 日志
2. 确认 chunk 请求返回 200
3. 检查后端数据库

---

## 快速诊断命令

### 一键测试后端
```bash
chmod +x test-recording.sh
./test-recording.sh
```

### 浏览器控制台诊断
复制 `extension/diagnostic-test.js` 的内容到控制台运行

---

## 仍然无法解决？

### 收集以下信息：

1. **浏览器控制台完整日志**
   - 打开 F12 → Console
   - 复制所有 [Acro] 开头的日志

2. **Background Script 日志**
   - chrome://extensions/ → Service Worker
   - 复制所有日志

3. **Network 请求详情**
   - F12 → Network
   - 筛选 "recording"
   - 截图或复制请求/响应

4. **后端日志**
   - 后端终端的输出
   - 特别是错误信息

5. **扩展版本信息**
   - chrome://extensions/
   - Acro Demo Recorder 的版本号

---

## 调试模式

### 启用详细日志

在 `extension/content.js` 开头添加：
```javascript
const DEBUG = true;
function log(...args) {
  if (DEBUG) console.log('[Acro Debug]', ...args);
}
```

在 `extension/background.js` 开头添加：
```javascript
const DEBUG = true;
function log(...args) {
  if (DEBUG) console.log('[Acro BG Debug]', ...args);
}
```

---

## 成功标志

录制功能正常工作时，你应该看到：

✅ 点击 Start Recording 后有 3 秒倒计时  
✅ 倒计时结束后可以正常浏览页面  
✅ 每次点击都有红色涟漪动画  
✅ 控制台显示 "Processing click event"  
✅ Background Script 显示 "Saved step"  
✅ 点击 Stop Recording 后打开编辑器  
✅ 编辑器显示录制的步骤和截图  

---

## 联系支持

如果按照以上步骤仍无法解决，请提供：
- 完整的控制台日志
- Background Script 日志
- 后端日志
- 你的操作步骤录屏

这样可以更快地定位问题。
