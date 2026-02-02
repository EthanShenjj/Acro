# 调试 "Cannot read properties of null (reading '2')" 错误

## 错误分析

错误信息：`Uncaught (in promise) TypeError: Cannot read properties of null (reading '2')`

这个错误表明代码尝试访问一个 null 对象的索引 2，通常发生在：
1. 正则表达式 `.match()` 返回 null，然后代码尝试访问 `match[2]`
2. 某个函数返回 null 而不是预期的数组

## 调试步骤

### 1. 获取完整错误堆栈

1. 打开 Chrome DevTools (F12)
2. 切换到 Console 标签
3. 清空控制台 (右键 -> Clear console)
4. 重现错误
5. 点击错误信息展开完整堆栈跟踪
6. 复制完整的错误信息，包括：
   - 错误类型和消息
   - 文件名和行号
   - 完整的调用堆栈

### 2. 检查错误发生时机

记录错误发生在哪个操作期间：
- [ ] 页面加载时
- [ ] 点击扩展图标时
- [ ] 开始录制时
- [ ] 点击页面时
- [ ] 滚动页面时
- [ ] 暂停录制时
- [ ] 恢复录制时
- [ ] 停止录制时

### 3. 检查扩展加载状态

在 Chrome 中：
1. 打开 `chrome://extensions/`
2. 确保 "开发者模式" 已启用
3. 找到 "Acro Demo Recorder"
4. 点击 "详细信息"
5. 检查是否有任何错误或警告
6. 点击 "背景页" 或 "Service Worker" 查看后台日志

### 4. 重新加载扩展

1. 在 `chrome://extensions/` 页面
2. 找到 "Acro Demo Recorder"
3. 点击刷新图标 🔄
4. 刷新测试页面
5. 重试操作

### 5. 检查 content.js 是否正确注入

在测试页面的控制台中运行：
```javascript
// 检查 content script 是否加载
console.log('Content script loaded:', typeof isRecording !== 'undefined');

// 检查 Chrome API
console.log('Chrome runtime:', typeof chrome !== 'undefined' && typeof chrome.runtime !== 'undefined');

// 检查消息监听器
console.log('Message listeners:', chrome.runtime.onMessage.hasListeners());
```

### 6. 添加调试日志

临时修改 content.js，在可能出错的地方添加 try-catch：

```javascript
// 在 handleMouseDown 函数开始处添加
async function handleMouseDown(event) {
  console.log('[DEBUG] handleMouseDown called');
  console.log('[DEBUG] event:', event);
  console.log('[DEBUG] isRecording:', isRecording, 'isPaused:', isPaused);
  
  try {
    // 原有代码...
  } catch (error) {
    console.error('[DEBUG] Error in handleMouseDown:', error);
    console.error('[DEBUG] Error stack:', error.stack);
    throw error;
  }
}
```

## 常见原因和解决方案

### 原因 1: Chrome 扩展 API 未就绪

**症状**: 错误发生在页面加载时

**解决方案**:
```javascript
// 在 content.js 顶部添加
if (typeof chrome === 'undefined' || !chrome.runtime) {
  console.error('[Acro] Chrome extension API not available');
  throw new Error('Chrome extension API not available');
}
```

### 原因 2: 消息响应格式错误

**症状**: 错误发生在发送消息后

**解决方案**: 检查所有 `chrome.runtime.sendMessage` 的响应处理：
```javascript
// 错误的写法（可能导致 null 错误）
const response = await chrome.runtime.sendMessage({ type: 'GET_SESSION_STATE' });
const sessionId = response.session.sessionId; // 如果 response 为 null 会出错

// 正确的写法
const response = await chrome.runtime.sendMessage({ type: 'GET_SESSION_STATE' });
if (!response || !response.session) {
  console.error('Invalid response:', response);
  throw new Error('Failed to get session state');
}
const sessionId = response.session.sessionId;
```

### 原因 3: 正则表达式匹配失败

**症状**: 错误发生在处理 URL 或文本时

**解决方案**: 检查所有正则表达式匹配：
```javascript
// 错误的写法
const match = url.match(/pattern/);
const result = match[2]; // 如果 match 为 null 会出错

// 正确的写法
const match = url.match(/pattern/);
if (!match || match.length < 3) {
  console.error('Pattern did not match:', url);
  throw new Error('Invalid URL format');
}
const result = match[2];
```

### 原因 4: 数组解构失败

**症状**: 错误发生在获取数据时

**解决方案**: 检查数组解构：
```javascript
// 错误的写法
const [tab] = await chrome.tabs.query({ active: true });
const tabId = tab.id; // 如果没有找到 tab，tab 为 undefined

// 正确的写法
const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
if (!tabs || tabs.length === 0) {
  throw new Error('No active tab found');
}
const tab = tabs[0];
```

## 下一步

1. 按照上述步骤收集错误信息
2. 确定错误发生的具体位置和时机
3. 根据错误类型应用相应的解决方案
4. 如果问题仍然存在，提供：
   - 完整的错误堆栈
   - 错误发生的操作步骤
   - Chrome 版本
   - 操作系统版本
