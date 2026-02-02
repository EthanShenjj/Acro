# 停止录制问题诊断

## 问题描述
点击停止录制后没有反应，过一会儿才弹出视频预览页，但显示没有事件。

## 可能的原因

### 1. 事件数据没有上传成功
**症状**: 点击和滚动事件没有被保存到数据库

**检查方法**:
```javascript
// 在浏览器控制台查看
chrome.runtime.sendMessage({ type: 'GET_SESSION_STATE' }, (response) => {
  console.log('Session state:', response.session);
  console.log('Step count:', response.session.stepCount);
});
```

**可能原因**:
- 截图失败导致事件没有上传
- 上传队列没有被正确处理
- 网络请求失败

### 2. 上传队列没有被刷新
**症状**: 事件在队列中但没有发送到后端

**检查方法**:
在 `background.js` 中查看:
```javascript
console.log('Upload queue length:', uploadQueue.length);
console.log('Active upload promise:', activeUploadPromise);
```

**解决方案**: 确保 `flushUploadQueue()` 被正确调用

### 3. 停止录制超时
**症状**: `flushUploadQueue()` 等待超时（2秒）

**问题**: 当前代码中 `flushUploadQueue()` 有 2 秒超时，如果上传还没完成就会继续执行

**解决方案**: 增加超时时间或改进上传逻辑

### 4. 截图失败
**症状**: 控制台显示截图错误

**可能原因**:
- 录制标签页不是当前活动标签页
- 权限问题
- 浏览器限制

## 调试步骤

### 步骤 1: 检查事件是否被捕获
1. 打开浏览器控制台（F12）
2. 切换到 Console 标签
3. 开始录制
4. 点击页面上的元素
5. 查看是否有 `[Acro] Mouse down detected` 日志

### 步骤 2: 检查截图是否成功
在控制台查看:
- `[Acro] Screenshot validated, size: XXX` - 截图成功
- `[Acro] Screenshot capture failed` - 截图失败

### 步骤 3: 检查上传是否成功
在控制台查看:
- `[Background] Upload successful` - 上传成功
- `[Background] Upload failed` - 上传失败

### 步骤 4: 检查停止录制流程
1. 点击停止录制
2. 查看控制台日志:
   - `[Background] Starting stop recording process...`
   - `[Background] Flushing upload queue...`
   - `[Background] Calling /api/recording/stop`
   - `[Background] Stop recording completed successfully`

### 步骤 5: 检查后端数据
```bash
# 查看项目是否创建
curl http://localhost:5001/api/projects

# 查看特定项目的步骤
curl http://localhost:5001/api/projects/{project_id}/steps
```

## 常见问题和解决方案

### 问题 1: 没有事件被记录
**原因**: `START_CAPTURE` 消息没有发送或接收

**解决方案**:
1. 检查 `background.js` 中的延迟发送逻辑（3.5秒）
2. 确保内容脚本已加载
3. 刷新页面后重新开始录制

### 问题 2: 截图失败
**原因**: 标签页不是活动标签页

**解决方案**:
- 录制期间不要切换标签页
- 保持录制标签页在前台

### 问题 3: 上传队列堵塞
**原因**: 批量上传逻辑有问题

**解决方案**:
1. 检查 `uploadQueue` 是否有积压
2. 检查 `activeUploadPromise` 是否卡住
3. 增加 `flushUploadQueue()` 的超时时间

### 问题 4: 停止录制超时
**原因**: 2秒超时太短

**解决方案**: 修改 `background.js` 中的超时时间

## 快速修复建议

### 修复 1: 增加刷新队列超时时间
在 `background.js` 的 `flushUploadQueue()` 函数中:

```javascript
// 从 2000ms 改为 5000ms
const timeoutPromise = new Promise((_, reject) => {
  setTimeout(() => reject(new Error('Upload sync timeout')), 5000);
});
```

### 修复 2: 添加更多调试日志
在 `handleStopRecording()` 中添加:

```javascript
console.log('[Background] Upload queue length:', uploadQueue.length);
console.log('[Background] Active upload promise:', !!activeUploadPromise);
console.log('[Background] Session step count:', recordingSession.stepCount);
```

### 修复 3: 确保事件监听器正确添加
在 `content.js` 的 `startCapture()` 中添加验证:

```javascript
console.log('[Acro] Event listeners added:', {
  mousedown: !!document.addEventListener,
  scroll: !!document.addEventListener
});
```

## 测试脚本

创建一个测试页面来验证录制功能:

```html
<!DOCTYPE html>
<html>
<head>
  <title>录制测试页面</title>
  <style>
    body { padding: 50px; font-family: Arial; }
    .test-button {
      padding: 20px 40px;
      font-size: 18px;
      margin: 20px;
      cursor: pointer;
    }
    .scroll-area {
      height: 2000px;
      background: linear-gradient(white, lightblue);
    }
  </style>
</head>
<body>
  <h1>录制测试页面</h1>
  <button class="test-button" onclick="alert('Button 1 clicked')">测试按钮 1</button>
  <button class="test-button" onclick="alert('Button 2 clicked')">测试按钮 2</button>
  <button class="test-button" onclick="alert('Button 3 clicked')">测试按钮 3</button>
  <div class="scroll-area">
    <p>向下滚动测试滚动事件...</p>
  </div>
</body>
</html>
```

## 下一步行动

1. **立即检查**: 打开浏览器控制台，查看是否有错误日志
2. **测试录制**: 使用上面的测试页面进行录制
3. **查看数据**: 检查后端数据库中是否有步骤记录
4. **应用修复**: 根据发现的问题应用相应的修复方案
