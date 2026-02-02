# 录制问题诊断指南

## 问题：没有录制到任何画面和事件

### 诊断步骤

#### 1. 检查扩展是否正确加载
打开 Chrome 扩展管理页面 (`chrome://extensions/`)：
- 确认 "Acro Demo Recorder" 扩展已启用
- 检查是否有任何错误消息
- 点击 "详细信息" 查看权限是否正确

#### 2. 检查后端服务是否运行
```bash
# 在 backend 目录下运行
cd backend
python app.py
```
确认后端在 `http://localhost:5001` 运行

#### 3. 检查浏览器控制台日志
1. 打开要录制的页面
2. 按 F12 打开开发者工具
3. 切换到 Console 标签
4. 点击扩展图标开始录制
5. 查找以下日志：
   - `[Acro] Starting capture`
   - `[Acro] Mouse down detected`
   - `[Acro] Processing click event`

#### 4. 检查 Background Script 日志
1. 打开 `chrome://extensions/`
2. 找到 "Acro Demo Recorder"
3. 点击 "Service Worker" 或 "背景页"
4. 查看控制台日志，应该看到：
   - `Started recording session: <session-id>`
   - `Saved step <step-id> for session <session-id>`

#### 5. 检查网络请求
在开发者工具的 Network 标签中：
- 查找对 `http://localhost:5001/api/recording/start` 的 POST 请求
- 查找对 `http://localhost:5001/api/recording/chunk` 的 POST 请求
- 检查请求是否成功（状态码 200）

### 常见问题和解决方案

#### 问题 1: Content Script 未注入
**症状**: 控制台没有 `[Acro]` 开头的日志

**解决方案**:
1. 重新加载扩展：在 `chrome://extensions/` 点击刷新按钮
2. 重新加载要录制的页面
3. 确认 manifest.json 中的 content_scripts 配置正确

#### 问题 2: 后端 API 连接失败
**症状**: Background script 显示 "Failed to start recording session"

**解决方案**:
1. 确认后端服务正在运行
2. 检查端口 5001 是否被占用
3. 检查 CORS 设置

#### 问题 3: 事件监听器未添加
**症状**: 看到 "Starting capture" 但没有 "Mouse down detected"

**解决方案**:
检查 content.js 中的 `startCapture()` 函数是否被调用

#### 问题 4: 截图权限问题
**症状**: 看到 "Failed to capture screenshot"

**解决方案**:
确认 manifest.json 中有 `activeTab` 权限

### 手动测试步骤

1. **测试扩展加载**:
   ```javascript
   // 在页面控制台运行
   chrome.runtime.sendMessage({ type: 'GET_SESSION_STATE' }, (response) => {
     console.log('Session state:', response);
   });
   ```

2. **测试事件捕获**:
   - 开始录制
   - 在页面上点击任意位置
   - 应该看到红色的涟漪动画
   - 控制台应该显示 `[Acro] Processing click event`

3. **测试后端连接**:
   ```bash
   # 在终端运行
   curl -X POST http://localhost:5001/api/recording/start \
     -H "Content-Type: application/json" \
     -d '{}'
   ```
   应该返回 `{"sessionId": "...", "status": "active"}`

### 调试模式

在 content.js 的开头添加更多日志：

```javascript
console.log('[Acro] Content script loaded at:', new Date().toISOString());
console.log('[Acro] Initial state - isRecording:', isRecording, 'isPaused:', isPaused);
```

在 background.js 的 handleStartRecording 函数中添加：

```javascript
console.log('[Acro Background] Starting recording...');
console.log('[Acro Background] Current state:', recordingSession);
```

### 如果问题仍然存在

请提供以下信息：
1. 浏览器控制台的完整日志
2. Background script 的完整日志
3. Network 标签中的请求详情
4. 后端服务的日志输出
