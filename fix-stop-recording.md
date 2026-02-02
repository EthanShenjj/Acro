# 停止录制问题修复方案

## 问题分析

根据代码分析，"点击停止录制后没有反应，过一会儿才弹出视频预览页，但显示没有事件"的问题可能由以下原因导致：

### 主要问题

1. **上传队列刷新超时太短** (2秒)
   - 如果有多个事件在队列中，2秒可能不够
   - 超时后会继续执行，但数据可能还没上传完

2. **START_CAPTURE 消息延迟发送**
   - 代码中有 3.5 秒延迟才发送 START_CAPTURE
   - 如果用户在这期间操作，事件不会被捕获

3. **截图失败导致事件丢失**
   - 如果截图失败，整个事件都不会上传
   - 没有降级处理

4. **批量上传逻辑问题**
   - 批量大小为 5，超时为 10 秒
   - 如果事件少于 5 个，需要等待 10 秒才会上传

## 快速修复

### 修复 1: 增加刷新队列超时时间

在 `extension/background.js` 中找到 `flushUploadQueue()` 函数，修改超时时间：

```javascript
// 找到这一行（约第 467 行）
setTimeout(() => reject(new Error('Upload sync timeout')), 2000);

// 改为
setTimeout(() => reject(new Error('Upload sync timeout')), 10000);
```

### 修复 2: 减少批量上传超时时间

在 `extension/background.js` 中找到批量上传配置：

```javascript
// 找到这一行（约第 283 行）
const BATCH_TIMEOUT_MS = 10000; // 10 seconds

// 改为
const BATCH_TIMEOUT_MS = 2000; // 2 seconds
```

### 修复 3: 减少 START_CAPTURE 延迟

在 `extension/background.js` 中找到 `handleStartRecording()` 函数：

```javascript
// 找到这一行（约第 155 行）
}, 3500); // Send after countdown completes (3s) + small buffer

// 改为
}, 3100); // Send after countdown completes (3s) + small buffer
```

### 修复 4: 添加更多调试日志

在 `extension/background.js` 的 `handleStopRecording()` 函数开始处添加：

```javascript
async function handleStopRecording() {
  const currentTabId = recordingSession.currentTabId;
  const currentSessionId = recordingSession.sessionId;

  try {
    console.log('[Background] Starting stop recording process...');
    console.log('[Background] Current session:', recordingSession);
    console.log('[Background] Upload queue length:', uploadQueue.length);  // 添加这行
    console.log('[Background] Active upload promise:', !!activeUploadPromise);  // 添加这行
    
    // ... 其余代码
```

## 完整修复脚本

创建一个脚本来自动应用所有修复：

```bash
#!/bin/bash

echo "应用停止录制问题修复..."

# 备份原文件
cp extension/background.js extension/background.js.backup

# 修复 1: 增加刷新队列超时时间
sed -i '' 's/setTimeout(() => reject(new Error('\''Upload sync timeout'\'')), 2000);/setTimeout(() => reject(new Error('\''Upload sync timeout'\'')), 10000);/g' extension/background.js

# 修复 2: 减少批量上传超时时间
sed -i '' 's/const BATCH_TIMEOUT_MS = 10000;/const BATCH_TIMEOUT_MS = 2000;/g' extension/background.js

# 修复 3: 减少 START_CAPTURE 延迟
sed -i '' 's/}, 3500);/}, 3100);/g' extension/background.js

echo "修复完成！"
echo "请重新加载扩展以应用更改。"
```

## 手动测试步骤

### 1. 应用修复后测试

1. 打开 Chrome 扩展管理页面 (`chrome://extensions/`)
2. 找到 Acro Demo Recorder 扩展
3. 点击"重新加载"按钮
4. 打开一个测试页面
5. 打开浏览器控制台 (F12)
6. 开始录制
7. 等待倒计时完成
8. 执行 2-3 个操作（点击按钮、滚动页面）
9. 等待 2-3 秒
10. 点击停止录制

### 2. 查看控制台日志

应该看到以下日志序列：

```
[Background] Starting stop recording process...
[Background] Current session: {...}
[Background] Upload queue length: 0
[Background] Active upload promise: false
[Background] Flushing upload queue...
[Background] Calling /api/recording/stop with sessionId: xxx
[Background] Stop recording response status: 200
[Background] Stop recording result: {...}
[Background] Opening editor in new tab: ...
[Background] New tab created: xxx
[Background] State reset to idle
[Background] Stop recording completed successfully
```

### 3. 验证数据

在新打开的编辑器页面中，应该能看到：
- 项目标题
- 录制的步骤列表
- 每个步骤的截图

## 诊断工具使用

### 使用诊断脚本

1. 开始录制
2. 执行一些操作
3. 在浏览器控制台运行诊断脚本：

```javascript
// 复制 extension/diagnose-stop-issue.js 的内容并粘贴到控制台
```

4. 查看诊断结果
5. 根据建议采取行动

### 检查后端数据

```bash
# 查看所有项目
curl http://localhost:5001/api/projects | jq

# 查看特定项目的步骤
curl http://localhost:5001/api/projects/1/steps | jq
```

## 常见问题排查

### 问题: 控制台显示 "Upload queue length: 5"

**原因**: 有 5 个事件在队列中等待上传

**解决**: 
- 检查网络连接
- 检查后端是否正常运行
- 查看是否有上传错误日志

### 问题: 控制台显示 "Active upload promise: true"

**原因**: 有上传正在进行中

**解决**:
- 等待上传完成
- 如果一直是 true，可能是上传卡住了
- 检查网络请求是否有响应

### 问题: 控制台显示 "Screenshot capture failed"

**原因**: 截图失败

**解决**:
- 确保录制标签页是活动标签页
- 不要在录制期间切换标签页
- 检查浏览器权限

### 问题: 后端返回 400 错误

**原因**: 请求数据格式不正确

**解决**:
- 检查控制台中的请求数据
- 确保所有必需字段都存在
- 检查 Base64 图片数据是否有效

## 预防措施

### 1. 录制期间不要切换标签页
截图功能只能捕获当前活动标签页，切换标签页会导致截图失败。

### 2. 等待上传完成再停止
执行操作后等待 2-3 秒，让上传队列有时间处理。

### 3. 检查网络连接
确保后端服务正常运行，网络连接稳定。

### 4. 使用测试页面
使用简单的测试页面进行录制，避免复杂页面的干扰。

## 下一步

如果以上修复都不能解决问题，请：

1. 运行诊断脚本并保存输出
2. 检查浏览器控制台的完整日志
3. 检查后端日志
4. 提供以上信息以便进一步诊断
