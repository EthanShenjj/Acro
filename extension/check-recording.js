/**
 * 快速检查录制状态的脚本
 * 在浏览器控制台运行此脚本
 */

(async function checkRecording() {
  console.log('=== 检查录制状态 ===\n');
  
  // 1. 检查扩展是否加载
  if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id) {
    console.error('❌ 扩展未加载');
    return;
  }
  console.log('✅ 扩展已加载');
  
  // 2. 获取当前会话状态
  try {
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'GET_SESSION_STATE' }, resolve);
    });
    
    console.log('\n当前会话状态:');
    console.log('- 状态:', response.session.status);
    console.log('- Session ID:', response.session.sessionId || '无');
    console.log('- 步骤数:', response.session.stepCount);
    console.log('- 开始时间:', response.session.startTime ? new Date(response.session.startTime).toLocaleString() : '无');
    
    if (response.session.status === 'idle') {
      console.log('\n⚠️  当前未在录制');
      console.log('请点击扩展图标开始录制');
    } else if (response.session.status === 'recording') {
      console.log('\n✅ 正在录制中');
      console.log('现在点击页面或滚动页面应该会被记录');
    } else if (response.session.status === 'paused') {
      console.log('\n⏸️  录制已暂停');
      console.log('点击 Continue 按钮继续录制');
    }
    
  } catch (error) {
    console.error('❌ 无法获取会话状态:', error);
  }
  
  // 3. 测试点击事件
  console.log('\n=== 测试事件监听 ===');
  console.log('请点击页面任意位置...');
  
  // 添加临时监听器来验证事件
  let clickDetected = false;
  const testClickHandler = () => {
    clickDetected = true;
    console.log('✅ 检测到点击事件');
  };
  
  document.addEventListener('mousedown', testClickHandler, true);
  
  setTimeout(() => {
    document.removeEventListener('mousedown', testClickHandler, true);
    if (!clickDetected) {
      console.log('⚠️  5秒内未检测到点击');
    }
  }, 5000);
  
})();
