/**
 * 录制功能自动诊断脚本
 * 
 * 使用方法：
 * 1. 打开要录制的页面
 * 2. 打开浏览器控制台（F12）
 * 3. 复制此文件的全部内容
 * 4. 粘贴到控制台并按回车
 * 5. 按照提示操作
 */

(async function diagnoseRecording() {
  console.log('%c=== Acro 录制功能诊断 ===', 'color: #2196F3; font-size: 16px; font-weight: bold');
  console.log('');
  
  const results = {
    contentScript: false,
    sessionState: false,
    backend: false,
    eventListeners: false,
    recording: false
  };
  
  // 1. 检查 Content Script
  console.log('%c1. 检查 Content Script', 'color: #4CAF50; font-weight: bold');
  try {
    if (typeof isRecording !== 'undefined' && typeof isPaused !== 'undefined') {
      console.log('   ✅ Content script 已加载');
      console.log('   - isRecording:', isRecording);
      console.log('   - isPaused:', isPaused);
      results.contentScript = true;
    } else {
      console.log('   ❌ Content script 未加载');
      console.log('   解决方案：');
      console.log('   1. 访问 chrome://extensions/');
      console.log('   2. 找到 "Acro Demo Recorder"');
      console.log('   3. 点击刷新按钮 🔄');
      console.log('   4. 刷新此页面（Cmd+R 或 F5）');
    }
  } catch (error) {
    console.log('   ❌ Content script 未加载');
    console.log('   错误:', error.message);
  }
  console.log('');
  
  // 2. 检查会话状态
  console.log('%c2. 检查会话状态', 'color: #4CAF50; font-weight: bold');
  try {
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'GET_SESSION_STATE' }, resolve);
    });
    
    if (response && response.session) {
      const session = response.session;
      console.log('   ✅ 会话状态正常');
      console.log('   - Session ID:', session.sessionId || '(未开始)');
      console.log('   - Status:', session.status);
      console.log('   - Step Count:', session.stepCount);
      console.log('   - Tab ID:', session.currentTabId || '(未设置)');
      
      if (session.status === 'recording') {
        results.recording = true;
      }
      
      results.sessionState = true;
    } else {
      console.log('   ❌ 无法获取会话状态');
    }
  } catch (error) {
    console.log('   ❌ 会话状态检查失败');
    console.log('   错误:', error.message);
  }
  console.log('');
  
  // 3. 检查后端连接
  console.log('%c3. 检查后端连接', 'color: #4CAF50; font-weight: bold');
  try {
    const response = await fetch('http://localhost:5001/api/folders');
    if (response.ok) {
      console.log('   ✅ 后端连接正常');
      console.log('   - URL: http://localhost:5001');
      console.log('   - 状态码:', response.status);
      results.backend = true;
    } else {
      console.log('   ❌ 后端返回错误');
      console.log('   - 状态码:', response.status);
    }
  } catch (error) {
    console.log('   ❌ 无法连接到后端');
    console.log('   错误:', error.message);
    console.log('   解决方案：');
    console.log('   1. 打开终端');
    console.log('   2. cd backend');
    console.log('   3. python app.py');
  }
  console.log('');
  
  // 4. 检查事件监听器
  console.log('%c4. 检查事件监听器', 'color: #4CAF50; font-weight: bold');
  try {
    const listeners = getEventListeners(document);
    const mousedownCount = listeners.mousedown?.length || 0;
    const scrollCount = listeners.scroll?.length || 0;
    
    if (mousedownCount > 0 && scrollCount > 0) {
      console.log('   ✅ 事件监听器已添加');
      console.log('   - mousedown 监听器:', mousedownCount);
      console.log('   - scroll 监听器:', scrollCount);
      results.eventListeners = true;
    } else {
      console.log('   ⚠️  事件监听器未完全添加');
      console.log('   - mousedown 监听器:', mousedownCount);
      console.log('   - scroll 监听器:', scrollCount);
      console.log('   提示: 可能录制尚未开始');
    }
  } catch (error) {
    console.log('   ⚠️  无法检查事件监听器');
    console.log('   (这在某些浏览器中是正常的)');
  }
  console.log('');
  
  // 5. 总结
  console.log('%c=== 诊断总结 ===', 'color: #2196F3; font-size: 16px; font-weight: bold');
  console.log('');
  
  const allGood = results.contentScript && results.sessionState && results.backend;
  
  if (allGood) {
    console.log('%c✅ 所有检查通过！', 'color: #4CAF50; font-weight: bold');
    console.log('');
    
    if (results.recording) {
      console.log('%c录制正在进行中', 'color: #FF9800; font-weight: bold');
      console.log('');
      console.log('请执行以下测试：');
      console.log('1. 点击页面上的任意元素');
      console.log('2. 查看是否有红色涟漪动画');
      console.log('3. 滚动页面');
      console.log('4. 查看是否有蓝色滚动指示器');
      console.log('');
      console.log('然后运行以下命令检查步骤计数：');
      console.log('%cchrome.runtime.sendMessage({ type: "GET_SESSION_STATE" }, (r) => console.log("步骤数:", r.session.stepCount));', 'background: #f0f0f0; padding: 4px');
    } else {
      console.log('%c录制尚未开始', 'color: #FF9800; font-weight: bold');
      console.log('');
      console.log('开始录制步骤：');
      console.log('1. 点击浏览器工具栏的 Acro 扩展图标');
      console.log('2. 点击 "Start Recording" 按钮');
      console.log('3. 等待 3 秒倒计时');
      console.log('4. 开始点击和滚动页面');
    }
  } else {
    console.log('%c❌ 发现问题', 'color: #f44336; font-weight: bold');
    console.log('');
    
    if (!results.contentScript) {
      console.log('⚠️  Content Script 未加载');
      console.log('   解决方案：重新加载扩展和页面');
    }
    
    if (!results.sessionState) {
      console.log('⚠️  会话状态异常');
      console.log('   解决方案：重新加载扩展');
    }
    
    if (!results.backend) {
      console.log('⚠️  后端未运行');
      console.log('   解决方案：启动后端服务（cd backend && python app.py）');
    }
  }
  
  console.log('');
  console.log('%c=== 诊断完成 ===', 'color: #2196F3; font-size: 16px; font-weight: bold');
  console.log('');
  console.log('如需更多帮助，请查看 diagnose-recording.md 文件');
  
})();
