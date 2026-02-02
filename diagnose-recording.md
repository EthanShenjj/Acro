# 录制完后没有内容 - 诊断指南

## 可能的原因

根据代码分析，录制完后没有内容可能是以下几个原因：

### 1. 事件没有被捕获
**症状：** 点击和滚动时没有红色涟漪动画或蓝色滚动指示器

**原因：**
- Content script 未正确加载
- `START_CAPTURE` 消息未发送或未处理
- `isRecording` 状态不是 `true`

**检查方法：**
打开浏览器控制台（F12），查看是否有以下日志：
```
[Acro] Content script loaded at: ...
[Acro] Received START_CAPTURE message
[Acro] Capture started, event listeners added (click + scroll)
```

点击页面时应该看到：
```
[Acro] Mouse down detected, isRecording: true isPaused: false
[Acro] Processing click event
```

### 2. 截图捕获失败
**症状：** 有涟漪动画但控制台有错误

**原因：**
- 录制时切换了标签页（chrome.tabs.captureVisibleTab 只能捕获当前可见标签）
- 权限不足

**检查方法：**
控制台是否有以下错误：
```
[Acro] Screenshot request error: ...
[Acro] Recording tab must remain visible
```

**解决方案：**
- 录制时保持在录制标签页，不要切换标签
- 确保扩展有 `activeTab` 权限

### 3. 上传到后端失败
**症状：** 有涟漪动画和截图，但步骤没有保存

**原因：**
- 后端未运行
- 网络请求失败
- 后端返回错误

**检查方法：**
1. 打开 Network 标签（F12 → Network）
2. 筛选 "chunk"
3. 查看 `POST /api/recording/chunk` 请求状态

应该看到：
- 状态码：200 OK
- 响应：`{"stepId": 123, "imageUrl": "...", "status": "saved"}`

如果看到 4xx 或 5xx 错误，检查：
- 后端是否运行：`curl http://localhost:5001/api/folders`
- 后端日志中的错误信息

### 4. 上传队列未刷新
**症状：** 点击了但步骤在队列中，停止录制时未上传

**原因：**
- 批处理队列未在停止时刷新
- `flushUploadQueue()` 未被调用

**检查方法：**
打开扩展后台控制台（chrome://extensions/ → Service Worker），查看：
```
[Background] Flushing upload queue...
Processing batch of X steps
[Background] Upload successful: ...
```

### 5. 会话 ID 丢失
**症状：** 后端返回 "Invalid session ID" 错误

**原因：**
- 扩展重新加载导致会话丢失
- sessionId 未正确传递

**检查方法：**
在页面控制台运行：
```javascript
chrome.runtime.sendMessage({ type: 'GET_SESSION_STATE' }, (response) => {
  console.log('Session ID:', response.session.sessionId);
  console.log('Status:', response.session.status);
  console.log('Step Count:', response.session.stepCount);
});
```

应该看到有效的 UUID 格式的 sessionId

## 完整诊断流程

### 步骤 1: 检查后端
```bash
# 确保后端运行
cd backend
python app.py

# 在另一个终端测试
curl http://localhost:5001/api/folders
```

### 步骤 2: 打开测试页面
```bash
# 在浏览器中打开
open test-page.html
```

### 步骤 3: 打开所有控制台
1. **页面控制台**：F12 → Console
2. **扩展后台控制台**：chrome://extensions/ → Service Worker
3. **Network 标签**：F12 → Network

### 步骤 4: 开始录制
1. 点击扩展图标
2. 点击 "Start Recording"
3. 等待 3 秒倒计时

### 步骤 5: 执行操作
1. 点击页面上的按钮（应该有红色涟漪）
2. 滚动页面（应该有蓝色指示器）
3. 重复几次

### 步骤 6: 检查日志

**页面控制台应该有：**
```
[Acro] Mouse down detected, isRecording: true isPaused: false
[Acro] Processing click event
[Acro] Requesting screenshot from background...
[Acro] Screenshot received, size: 123456
```

**扩展后台控制台应该有：**
```
[Background] Capturing screenshot for tab: 123
[Background] Screenshot captured successfully, size: 123456
[Background] Uploading step data: ...
[Background] Upload successful: {stepId: 1, ...}
```

**Network 标签应该有：**
```
POST /api/recording/chunk → 200 OK
```

### 步骤 7: 停止录制
1. 点击扩展图标（暂停）
2. 点击 "Done" 按钮
3. 应该打开编辑器页面

**扩展后台控制台应该有：**
```
[Background] Starting stop recording process...
[Background] Flushing upload queue...
[Background] Calling /api/recording/stop with sessionId: ...
[Background] Stop recording result: {projectId: 1, ...}
[Background] Opening editor in new tab: http://localhost:3000/editor/...
```

## 快速诊断脚本

将以下代码粘贴到页面控制台：

```javascript
console.log('=== 录制诊断 ===\n');

// 1. 检查 content script 状态
console.log('1. Content Script 状态:');
console.log('   isRecording:', typeof isRecording !== 'undefined' ? isRecording : 'undefined');
console.log('   isPaused:', typeof isPaused !== 'undefined' ? isPaused : 'undefined');

// 2. 检查会话状态
console.log('\n2. 会话状态:');
chrome.runtime.sendMessage({ type: 'GET_SESSION_STATE' }, (response) => {
  if (response && response.session) {
    console.log('   Session ID:', response.session.sessionId);
    console.log('   Status:', response.session.status);
    console.log('   Step Count:', response.session.stepCount);
    console.log('   Tab ID:', response.session.currentTabId);
  } else {
    console.error('   无法获取会话状态');
  }
});

// 3. 检查后端连接
console.log('\n3. 后端连接:');
fetch('http://localhost:5001/api/folders')
  .then(response => {
    console.log('   后端状态:', response.ok ? '✅ 正常' : '❌ 错误');
    console.log('   状态码:', response.status);
  })
  .catch(error => {
    console.error('   后端错误:', error.message);
  });

// 4. 检查事件监听器
console.log('\n4. 事件监听器:');
console.log('   mousedown 监听器:', getEventListeners(document).mousedown?.length || 0);
console.log('   scroll 监听器:', getEventListeners(document).scroll?.length || 0);

console.log('\n=== 诊断完成 ===');
console.log('\n请执行以下操作：');
console.log('1. 点击页面上的按钮');
console.log('2. 查看是否有红色涟漪动画');
console.log('3. 查看控制台是否有 "[Acro] Processing click event" 日志');
console.log('4. 打开 Network 标签，查看是否有 /api/recording/chunk 请求');
```

## 常见问题和解决方案

### ❌ 问题：点击没有涟漪动画
**解决方案：**
1. 检查控制台是否有 "[Acro] Capture started" 日志
2. 如果没有，重新加载扩展：chrome://extensions/ → 刷新
3. 刷新页面并重新开始录制

### ❌ 问题：有涟漪但控制台报错 "Screenshot request error"
**解决方案：**
1. 确保录制时不要切换标签页
2. 保持录制标签页始终可见
3. 不要最小化浏览器窗口

### ❌ 问题：Network 显示 /api/recording/chunk 返回 400 或 500
**解决方案：**
1. 查看后端终端的错误日志
2. 检查请求数据格式是否正确
3. 确认后端数据库连接正常

### ❌ 问题：停止录制后项目是空的
**解决方案：**
1. 检查扩展后台控制台是否有 "Saved step" 日志
2. 如果没有，说明步骤未上传成功
3. 检查 Network 标签的请求状态
4. 查看后端数据库：
   ```bash
   cd backend
   python check_projects.py
   ```

### ❌ 问题：步骤计数不增加
**解决方案：**
1. 打开扩展后台控制台
2. 查看是否有上传错误
3. 检查批处理队列是否正常工作
4. 确认后端返回 200 状态码

## 成功标志

录制功能正常工作时，你应该看到：

✅ 倒计时结束后控制台有 "[Acro] Capture started"  
✅ 点击时有红色涟漪动画  
✅ 控制台有 "[Acro] Processing click event"  
✅ 控制台有 "[Acro] Screenshot received"  
✅ Network 有成功的 /api/recording/chunk 请求（200 OK）  
✅ 扩展后台有 "[Background] Upload successful"  
✅ 会话的 stepCount 持续增加  
✅ 停止录制后打开编辑器  
✅ 编辑器显示录制的步骤和截图  

## 需要帮助？

如果按照以上步骤仍无法解决，请提供：

1. **页面控制台完整日志**（包含所有 [Acro] 开头的日志）
2. **扩展后台控制台日志**（chrome://extensions/ → Service Worker）
3. **Network 标签截图**（显示 /api/recording/chunk 请求）
4. **后端终端日志**
5. **操作步骤录屏**

这样可以更快地定位问题。
