# 测试 Null 错误修复

## 已应用的修复

### 1. 添加 Chrome API 可用性检查
在 content.js 开头添加了验证，确保 Chrome 扩展 API 可用。

### 2. 增强响应验证
在 `handleMouseDown` 和 `handleScroll` 函数中添加了响应验证：
```javascript
// 验证响应不为 null
if (!response || !response.session) {
  console.error('[Acro] Invalid session state response:', response);
  throw new Error('Failed to get session state');
}
```

### 3. 改进 captureScreenshot 错误处理
添加了 try-catch 包装和更详细的错误日志。

## 测试步骤

### 1. 重新加载扩展
1. 打开 `chrome://extensions/`
2. 找到 "Acro Demo Recorder"
3. 点击刷新图标 🔄

### 2. 清除控制台
1. 打开测试页面
2. 按 F12 打开 DevTools
3. 在 Console 标签中右键 -> Clear console

### 3. 测试录制流程
1. 点击扩展图标
2. 点击 "Start Recording"
3. 观察控制台输出，应该看到：
   ```
   [Acro] Content script loaded at: [timestamp]
   [Acro] Initial state - isRecording: false isPaused: false
   [Acro] Chrome runtime available: true
   ```

4. 在页面上点击几次
5. 检查是否还有 "Cannot read properties of null (reading '2')" 错误

### 4. 检查错误日志
如果仍然出现错误，控制台现在应该显示更详细的信息：
- 错误发生的具体位置
- 相关的变量值
- 完整的错误堆栈

## 预期结果

### 成功情况
- ✅ 没有 null 错误
- ✅ 点击被正确捕获
- ✅ 截图成功
- ✅ 控制台显示正常的日志消息

### 如果仍有错误
控制台应该显示以下之一：
1. `[Acro] Chrome extension API not available` - API 未就绪
2. `[Acro] Invalid session state response` - 后台脚本响应异常
3. `[Acro] Screenshot request error` - 截图失败
4. 其他更具体的错误消息

## 常见问题排查

### 问题 1: "Chrome extension API not available"
**原因**: Content script 在 Chrome API 就绪前加载

**解决方案**:
```javascript
// 在 manifest.json 中确认 run_at 设置
"content_scripts": [
  {
    "matches": ["<all_urls>"],
    "js": ["content.js"],
    "run_at": "document_idle"  // 确保这个设置正确
  }
]
```

### 问题 2: "Invalid session state response"
**原因**: 后台脚本未正确响应

**解决方案**:
1. 检查后台脚本日志：
   - 在 `chrome://extensions/` 中点击 "Service Worker"
   - 查看是否有错误
2. 确认后台脚本正在运行
3. 尝试重新加载扩展

### 问题 3: 错误仍然发生但没有详细日志
**原因**: 错误发生在修改的代码之外

**解决方案**:
1. 在 DevTools 中启用 "Pause on exceptions"
2. 重现错误
3. 查看调用堆栈确定确切位置
4. 提供完整的错误信息和堆栈跟踪

## 下一步

如果问题仍然存在：
1. 收集完整的错误信息（包括新的日志）
2. 记录错误发生的确切步骤
3. 检查 Chrome 版本和操作系统
4. 提供后台脚本的日志（从 Service Worker 控制台）
