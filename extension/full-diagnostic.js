/**
 * 完整的录制诊断工具
 * 在浏览器控制台运行此脚本来诊断所有问题
 */

(async function fullDiagnostic() {
  console.clear();
  console.log('%c=== Acro 录制完整诊断 ===', 'font-size: 16px; font-weight: bold; color: #667eea');
  console.log('');
  
  const results = {
    extensionLoaded: false,
    sessionState: null,
    contentScriptActive: false,
    eventListenersAttached: false,
    backendReachable: false
  };
  
  // 1. 检查扩展
  console.log('%c1. 检查扩展状态', 'font-weight: bold');
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
    results.extensionLoaded = true;
    console.log('✅ 扩展已加载, ID:', chrome.runtime.id);
  } else {
    console.log('❌ 扩展未加载');
    return results;
  }
  
  // 2. 获取会话状态
  console.log('\n%c2. 获取会话状态', 'font-weight: bold');
  try {
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'GET_SESSION_STATE' }, resolve);
    });
    
    results.sessionState = response.session;
    console.log('会话信息:');
    console.log('  状态:', response.session.status);
    console.log('  Session ID:', response.session.sessionId || '无');
    console.log('  步骤数:', response.session.stepCount);
    console.log('  Tab ID:', response.session.currentTabId || '无');
    
    if (response.session.status === 'idle') {
      console.log('\n%c⚠️  当前未在录制！', 'color: orange; font-weight: bold');
      console.log('请按以下步骤操作:');
      console.log('1. 点击浏览器工具栏的 Acro 扩展图标');
      console.log('2. 点击 "Start Recording" 按钮');
      console.log('3. 等待 3 秒倒计时完成');
      console.log('4. 然后再次运行此诊断脚本');
      return results;
    } else if (response.session.status === 'paused') {
      console.log('\n%c⏸️  录制已暂停', 'color: gray; font-weight: bold');
      console.log('点击控制栏的 Continue 按钮继续录制');
      return results;
    } else if (response.session.status === 'recording') {
      console.log('\n%c✅ 正在录制中', 'color: green; font-weight: bold');
    }
    
  } catch (error) {
    console.log('❌ 无法获取会话状态:', error);
    return results;
  }
  
  // 3. 检查 Content Script
  console.log('\n%c3. 检查 Content Script', 'font-weight: bold');
  
  // 检查是否有 Acro 相关的日志
  console.log('查看控制台是否有以下日志:');
  console.log('  - "[Acro] Content script loaded"');
  console.log('  - "[Acro] Capture started, event listeners added"');
  
  // 4. 测试事件监听
  console.log('\n%c4. 测试事件监听', 'font-weight: bold');
  console.log('现在请执行以下操作:');
  console.log('');
  console.log('%c👆 点击页面任意位置', 'color: red; font-weight: bold; font-size: 14px');
  console.log('   应该看到:');
  console.log('   - 红色涟漪动画');
  console.log('   - 控制台输出 "[Acro] Mouse down detected"');
  console.log('   - 控制台输出 "[Acro] Processing click event"');
  console.log('');
  console.log('%c📜 向下滚动页面', 'color: blue; font-weight: bold; font-size: 14px');
  console.log('   应该看到:');
  console.log('   - 蓝色滚动指示器 (↓ Scroll Down)');
  console.log('   - 控制台输出 "[Acro] Scroll detected"');
  console.log('   - 控制台输出 "[Acro] Processing scroll event"');
  console.log('');
  
  // 添加临时监听器来验证
  let clickDetected = false;
  let scrollDetected = false;
  
  const testClickHandler = (e) => {
    if (!clickDetected) {
      clickDetected = true;
      console.log('%c✅ 检测到点击事件!', 'color: green; font-weight: bold');
      console.log('   位置:', e.clientX, e.clientY);
    }
  };
  
  const testScrollHandler = () => {
    if (!scrollDetected) {
      scrollDetected = true;
      console.log('%c✅ 检测到滚动事件!', 'color: green; font-weight: bold');
      console.log('   位置:', window.scrollY);
    }
  };
  
  document.addEventListener('mousedown', testClickHandler, true);
  document.addEventListener('scroll', testScrollHandler, true);
  
  // 10秒后清理
  setTimeout(() => {
    document.removeEventListener('mousedown', testClickHandler, true);
    document.removeEventListener('scroll', testScrollHandler, true);
    
    console.log('\n%c=== 10秒测试结果 ===', 'font-weight: bold');
    if (clickDetected) {
      console.log('✅ 点击事件正常');
    } else {
      console.log('❌ 未检测到点击事件');
    }
    
    if (scrollDetected) {
      console.log('✅ 滚动事件正常');
    } else {
      console.log('⚠️  未检测到滚动事件（可能页面未滚动）');
    }
  }, 10000);
  
  // 5. 检查后端
  console.log('\n%c5. 检查后端服务', 'font-weight: bold');
  try {
    const response = await fetch('http://localhost:5001/api/folders');
    if (response.ok) {
      results.backendReachable = true;
      console.log('✅ 后端服务正常');
    } else {
      console.log('❌ 后端服务响应异常:', response.status);
    }
  } catch (error) {
    console.log('❌ 无法连接后端服务');
    console.log('   请确认后端在 http://localhost:5001 运行');
  }
  
  // 6. 常见问题检查
  console.log('\n%c6. 常见问题检查', 'font-weight: bold');
  
  // 检查页面是否可滚动
  const isScrollable = document.body.scrollHeight > window.innerHeight;
  if (isScrollable) {
    console.log('✅ 页面可滚动 (高度:', document.body.scrollHeight, 'px)');
  } else {
    console.log('⚠️  页面不可滚动 - 滚动事件无法测试');
    console.log('   建议使用 test-page.html 进行测试');
  }
  
  // 检查是否在特殊页面
  if (window.location.protocol === 'chrome:' || window.location.protocol === 'chrome-extension:') {
    console.log('⚠️  当前在特殊页面，扩展可能无法正常工作');
    console.log('   请在普通网页上测试');
  }
  
  console.log('\n%c=== 诊断完成 ===', 'font-weight: bold; color: #667eea');
  console.log('等待 10 秒来测试事件监听...');
  
  return results;
})();
