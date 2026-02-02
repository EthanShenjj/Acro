/**
 * Acro Demo Recorder - Diagnostic Test Script
 * 
 * 在浏览器控制台运行此脚本来诊断录制问题
 * 
 * 使用方法：
 * 1. 打开要录制的页面
 * 2. 按 F12 打开开发者工具
 * 3. 复制此脚本到控制台并运行
 */

(async function runDiagnostics() {
  console.log('=== Acro Demo Recorder 诊断测试 ===\n');
  
  const results = {
    extensionLoaded: false,
    contentScriptInjected: false,
    backendReachable: false,
    sessionCreated: false,
    eventListenerActive: false,
    screenshotCapable: false
  };
  
  // Test 1: 检查扩展是否加载
  console.log('测试 1: 检查扩展是否加载...');
  try {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
      results.extensionLoaded = true;
      console.log('✅ 扩展已加载, ID:', chrome.runtime.id);
    } else {
      console.log('❌ 扩展未加载或无法访问');
    }
  } catch (error) {
    console.log('❌ 扩展检查失败:', error.message);
  }
  
  // Test 2: 检查 Content Script 是否注入
  console.log('\n测试 2: 检查 Content Script 是否注入...');
  try {
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'GET_SESSION_STATE' }, (response) => {
        resolve(response);
      });
    });
    
    if (response && response.session) {
      results.contentScriptInjected = true;
      console.log('✅ Content Script 已注入');
      console.log('   当前状态:', response.session.status);
      console.log('   Session ID:', response.session.sessionId || '无');
      console.log('   步骤数:', response.session.stepCount);
    } else {
      console.log('❌ Content Script 未注入或无响应');
    }
  } catch (error) {
    console.log('❌ Content Script 检查失败:', error.message);
  }
  
  // Test 3: 检查后端是否可达
  console.log('\n测试 3: 检查后端服务...');
  try {
    const response = await fetch('http://localhost:5001/api/recording/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    
    if (response.ok) {
      const data = await response.json();
      results.backendReachable = true;
      results.sessionCreated = true;
      console.log('✅ 后端服务正常');
      console.log('   测试 Session ID:', data.sessionId);
      
      // 清理测试会话
      await fetch('http://localhost:5001/api/recording/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: data.sessionId })
      });
    } else {
      console.log('❌ 后端服务响应异常, 状态码:', response.status);
    }
  } catch (error) {
    console.log('❌ 无法连接到后端服务:', error.message);
    console.log('   请确认后端服务在 http://localhost:5001 运行');
  }
  
  // Test 4: 检查事件监听器
  console.log('\n测试 4: 检查事件监听器...');
  const clickHandlers = [];
  const originalAddEventListener = document.addEventListener;
  
  // 检查是否有 mousedown 监听器
  const mousedownListeners = getEventListeners(document);
  if (mousedownListeners && mousedownListeners.mousedown) {
    results.eventListenerActive = mousedownListeners.mousedown.length > 0;
    console.log('✅ 检测到', mousedownListeners.mousedown.length, '个 mousedown 监听器');
  } else {
    console.log('⚠️  无法检测事件监听器（需要在开发者工具中运行）');
    console.log('   请手动检查：开始录制后点击页面，查看是否有红色涟漪动画');
  }
  
  // Test 5: 检查截图能力
  console.log('\n测试 5: 检查截图权限...');
  try {
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'CAPTURE_SCREENSHOT' }, (response) => {
        resolve(response);
      });
    });
    
    if (response && response.screenshot) {
      results.screenshotCapable = true;
      console.log('✅ 截图功能正常');
      console.log('   截图大小:', Math.round(response.screenshot.length / 1024), 'KB');
    } else if (response && response.error) {
      console.log('❌ 截图失败:', response.error);
    } else {
      console.log('❌ 截图功能无响应');
    }
  } catch (error) {
    console.log('❌ 截图测试失败:', error.message);
  }
  
  // 总结
  console.log('\n=== 诊断结果总结 ===');
  console.log('扩展加载:', results.extensionLoaded ? '✅' : '❌');
  console.log('Content Script:', results.contentScriptInjected ? '✅' : '❌');
  console.log('后端服务:', results.backendReachable ? '✅' : '❌');
  console.log('会话创建:', results.sessionCreated ? '✅' : '❌');
  console.log('事件监听:', results.eventListenerActive ? '✅' : '⚠️');
  console.log('截图功能:', results.screenshotCapable ? '✅' : '❌');
  
  // 建议
  console.log('\n=== 建议 ===');
  if (!results.extensionLoaded) {
    console.log('1. 在 chrome://extensions/ 检查扩展是否已启用');
    console.log('2. 重新加载扩展');
  }
  
  if (!results.contentScriptInjected) {
    console.log('1. 重新加载此页面');
    console.log('2. 检查 manifest.json 中的 content_scripts 配置');
  }
  
  if (!results.backendReachable) {
    console.log('1. 在终端运行: cd backend && python app.py');
    console.log('2. 确认后端在 http://localhost:5001 运行');
  }
  
  if (!results.screenshotCapable) {
    console.log('1. 确认扩展有 activeTab 权限');
    console.log('2. 重新加载扩展');
  }
  
  console.log('\n如需更多帮助，请查看 extension/debug-recording.md');
  
  return results;
})();
