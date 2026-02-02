# 录制功能调试步骤

## 问题：没有事件被记录

### 快速诊断

1. **打开测试页面**
   ```bash
   # 在浏览器中打开
   open test-page.html
   ```

2. **打开浏览器控制台**
   - 按 `F12` 或 `Cmd+Option+I`
   - 切换到 Console 标签

3. **运行诊断脚本**
   - 复制 `extension/full-diagnostic.js` 的全部内容
   - 粘贴到控制台并按回车
   - 按照提示操作

### 详细步骤

#### 步骤 1: 确认扩展已加载

在控制台应该看到：
```
[Acro] Content script loaded at: 2026-01-31T...
```

如果没有看到，说明扩展未正确加载：
- 访问 `chrome://extensions/`
- 找到 "Acro Demo Recorder"
- 点击刷新按钮 🔄
- 刷新测试页面

#### 步骤 2: 开始录制

1. 点击浏览器工具栏的 Acro 扩展图标
2. 点击 "Start Recording" 按钮
3. 等待 3 秒倒计时（屏幕上会显示 3、2、1）

**关键：** 必须等倒计时完成！

#### 步骤 3: 检查录制状态

在控制台运行：
```javascript
chrome.runtime.sendMessage({ type: 'GET_SESSION_STATE' }, (response) => {
  console.log('状态:', response.session.status);
  console.log('步骤数:', response.session.stepCount);
});
```

应该看到：
```
状态: recording
步骤数: 0
```

如果状态是 `idle`，说明录制没有启动成功。

#### 步骤 4: 测试点击事件

点击页面上的任意按钮，应该看到：

**视觉反馈：**
- ✅ 红色涟漪动画（从点击位置扩散）

**控制台日志：**
```
[Acro] Mouse down detected, isRecording: true isPaused: false
[Acro] Processing click event
```

**如果没有看到：**
- 检查控制台是否有 "[Acro] Capture started, event listeners added" 日志
- 如果没有，说明 START_CAPTURE 消息未发送或未处理

#### 步骤 5: 测试滚动事件

向下滚动页面（至少 50px），应该看到：

**视觉反馈：**
- ✅ 蓝色滚动指示器（↓ Scroll Down 或 ↑ Scroll Up）

**控制台日志：**
```
[Acro] Scroll detected, isRecording: true isPaused: false
[Acro] Processing scroll event, delta: 150
```

**注意：**
- 滚动事件有 500ms 防抖延迟
- 必须滚动超过 50px 才会记录
- 停止滚动后等待 0.5 秒才会触发

#### 步骤 6: 检查步骤计数

再次检查状态：
```javascript
chrome.runtime.sendMessage({ type: 'GET_SESSION_STATE' }, (response) => {
  console.log('步骤数:', response.session.stepCount);
});
```

如果点击了 3 次，滚动了 2 次，应该看到：
```
步骤数: 5
```

### 常见问题

#### Q1: 控制台没有任何 [Acro] 日志

**原因：** Content script 未注入

**解决方案：**
1. 刷新扩展：`chrome://extensions/` → 找到扩展 → 点击刷新
2. 刷新页面：`Cmd+R` 或 `F5`
3. 确认不是在 `chrome://` 或 `about://` 页面

#### Q2: 有 "Content script loaded" 但没有 "Capture started"

**原因：** 录制未启动或 START_CAPTURE 消息未发送

**解决方案：**
1. 确认点击了 "Start Recording" 按钮
2. 确认等待了 3 秒倒计时
3. 检查 popup 是否有错误消息
4. 查看 Background Script 日志（`chrome://extensions/` → Service Worker）

#### Q3: 有 "Capture started" 但点击没有反应

**原因：** 事件监听器未正确添加或页面被冻结

**解决方案：**
1. 检查 `isRecording` 状态：
   ```javascript
   // 在控制台运行
   console.log('isRecording:', isRecording);
   ```
2. 确认页面没有被冻结（`pointerEvents` 不是 'none'）
3. 尝试点击不同的元素

#### Q4: 点击有涟漪但步骤数不增加

**原因：** 上传失败或后端未运行

**解决方案：**
1. 检查 Network 标签，查看是否有失败的请求
2. 确认后端运行：
   ```bash
   curl http://localhost:5001/api/folders
   ```
3. 查看 Background Script 日志中的错误

#### Q5: 滚动没有任何反应

**原因：** 页面不可滚动或滚动距离不够

**解决方案：**
1. 确认页面高度大于视口：
   ```javascript
   console.log('页面高度:', document.body.scrollHeight);
   console.log('视口高度:', window.innerHeight);
   ```
2. 确保滚动超过 50px
3. 等待 0.5 秒让防抖完成

### 成功标志

录制功能正常工作时，你应该看到：

✅ 控制台有 "[Acro] Content script loaded"  
✅ 控制台有 "[Acro] Capture started, event listeners added (click + scroll)"  
✅ 点击时有红色涟漪动画  
✅ 控制台有 "[Acro] Processing click event"  
✅ 滚动时有蓝色滚动指示器  
✅ 控制台有 "[Acro] Processing scroll event"  
✅ 步骤计数持续增加  
✅ Network 标签显示成功的 `/api/recording/chunk` 请求  

### 下一步

如果所有检查都通过但仍然有问题：

1. 导出完整的控制台日志
2. 导出 Background Script 日志
3. 导出 Network 请求详情
4. 提供操作步骤的录屏

这样可以更快地定位问题。
