# 停止录制调试指南

## 问题
点击"Done"按钮停止录制没有反应

## 调试步骤

### 1. 检查浏览器控制台
打开 Chrome DevTools (F12)，查看是否有错误信息：

**在页面控制台 (Console) 中查看：**
- 是否有 JavaScript 错误
- 是否有 "Failed to handle done" 错误
- 是否有网络请求失败

**在扩展后台页面控制台中查看：**
1. 打开 `chrome://extensions/`
2. 找到 Acro 扩展
3. 点击 "service worker" 或 "背景页"
4. 查看控制台是否有错误

### 2. 检查录制状态
在页面控制台中运行：
```javascript
chrome.runtime.sendMessage({ type: 'GET_SESSION_STATE' }, (response) => {
  console.log('Session state:', response);
});
```

应该看到：
```javascript
{
  session: {
    sessionId: "some-uuid",
    status: "paused",  // 点击暂停后应该是 paused
    stepCount: 5,
    currentTabId: 123
  }
}
```

### 3. 检查控制栏是否正确创建
在页面控制台中运行：
```javascript
const controlBar = document.getElementById('acro-control-bar');
console.log('Control bar:', controlBar);
console.log('Shadow root:', controlBar?.shadowRoot);
console.log('Done button:', controlBar?.shadowRoot?.querySelector('.done-btn'));
```

### 4. 手动测试停止录制
在页面控制台中运行：
```javascript
chrome.runtime.sendMessage({ type: 'STOP_RECORDING' }, (response) => {
  console.log('Response:', response);
  if (chrome.runtime.lastError) {
    console.error('Error:', chrome.runtime.lastError);
  }
});
```

### 5. 检查后端是否运行
在终端中检查后端日志，确保：
- 后端服务正在运行 (http://localhost:5001)
- `/api/recording/stop` 端点可访问

测试后端：
```bash
curl -X POST http://localhost:5001/api/recording/stop \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "test-session-id"}'
```

## 常见问题

### 问题 1: 按钮没有响应
**可能原因：**
- Shadow DOM 事件监听器未正确绑定
- 按钮被其他元素遮挡

**解决方法：**
1. 检查控制台是否有 "Failed to handle done" 错误
2. 尝试右键点击按钮，看是否能触发上下文菜单
3. 检查按钮的 z-index 和 pointer-events CSS 属性

### 问题 2: 后端请求失败
**可能原因：**
- 后端服务未运行
- CORS 问题
- 会话 ID 无效

**解决方法：**
1. 确保后端运行在 http://localhost:5001
2. 检查后端日志中的错误信息
3. 验证 sessionId 是否有效

### 问题 3: 上传队列未清空
**可能原因：**
- 有待上传的步骤数据
- 网络请求超时

**解决方法：**
1. 检查扩展后台页面控制台
2. 查找 "Flushing remaining uploads" 日志
3. 等待所有上传完成后再点击 Done

### 问题 4: 状态转换失败
**可能原因：**
- 当前状态不是 'paused'
- 状态机验证失败

**解决方法：**
1. 检查当前状态是否为 'paused'
2. 如果状态不对，重新加载扩展
3. 重新开始录制流程

## 调试脚本

### 完整诊断脚本
将以下代码粘贴到页面控制台：

```javascript
console.log('=== Stop Recording Diagnostic ===\n');

// 1. Check control bar
const controlBar = document.getElementById('acro-control-bar');
console.log('1. Control Bar Check:');
console.log('   - Exists:', !!controlBar);
if (controlBar) {
  const shadowRoot = controlBar.shadowRoot;
  console.log('   - Shadow Root:', !!shadowRoot);
  if (shadowRoot) {
    const doneBtn = shadowRoot.querySelector('.done-btn');
    console.log('   - Done Button:', !!doneBtn);
    if (doneBtn) {
      console.log('   - Button Text:', doneBtn.textContent);
      console.log('   - Button Visible:', doneBtn.offsetParent !== null);
    }
  }
}

// 2. Check session state
console.log('\n2. Session State Check:');
chrome.runtime.sendMessage({ type: 'GET_SESSION_STATE' }, (response) => {
  console.log('   - State:', response?.session?.status);
  console.log('   - Session ID:', response?.session?.sessionId);
  console.log('   - Step Count:', response?.session?.stepCount);
  console.log('   - Tab ID:', response?.session?.currentTabId);
});

// 3. Test backend connection
console.log('\n3. Backend Connection Check:');
fetch('http://localhost:5001/api/recording/start', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({})
})
.then(response => {
  console.log('   - Backend Status:', response.ok ? 'OK' : 'ERROR');
  console.log('   - Status Code:', response.status);
})
.catch(error => {
  console.error('   - Backend Error:', error.message);
});

// 4. Test stop recording
console.log('\n4. Testing Stop Recording:');
setTimeout(() => {
  chrome.runtime.sendMessage({ type: 'STOP_RECORDING' }, (response) => {
    console.log('   - Response:', response);
    if (chrome.runtime.lastError) {
      console.error('   - Error:', chrome.runtime.lastError.message);
    }
  });
}, 2000);

console.log('\n=== Diagnostic Complete ===');
```

## 临时解决方案

如果按钮完全无响应，可以在控制台手动停止录制：

```javascript
// 手动停止录制
chrome.runtime.sendMessage({ type: 'STOP_RECORDING' }, (response) => {
  if (response && response.success) {
    console.log('Recording stopped successfully');
    console.log('Project ID:', response.projectId);
  } else {
    console.error('Failed to stop:', response?.error);
  }
});
```

## 下一步

运行上述诊断脚本后，请提供：
1. 页面控制台的完整输出
2. 扩展后台页面控制台的输出
3. 后端日志（如果有）
4. 任何错误信息的截图

这将帮助我们准确定位问题所在。
