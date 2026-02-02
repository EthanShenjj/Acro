/**
 * 停止录制问题诊断脚本
 * 在浏览器控制台运行此脚本来诊断问题
 */

(async function diagnoseStopIssue() {
  console.log('=== 开始诊断停止录制问题 ===\n');

  // 1. 检查扩展是否可用
  console.log('1. 检查扩展 API...');
  if (typeof chrome === 'undefined' || !chrome.runtime) {
    console.error('❌ Chrome 扩展 API 不可用');
    return;
  }
  console.log('✅ Chrome 扩展 API 可用\n');

  // 2. 获取当前会话状态
  console.log('2. 获取会话状态...');
  try {
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'GET_SESSION_STATE' }, resolve);
    });

    if (!response || !response.session) {
      console.error('❌ 无法获取会话状态');
      return;
    }

    const session = response.session;
    console.log('✅ 会话状态:', {
      sessionId: session.sessionId,
      projectId: session.projectId,
      status: session.status,
      stepCount: session.stepCount,
      startTime: session.startTime ? new Date(session.startTime).toLocaleString() : null,
      currentTabId: session.currentTabId
    });

    // 检查是否有步骤被记录
    if (session.stepCount === 0) {
      console.warn('⚠️  警告: 步骤计数为 0，可能没有事件被记录');
      console.log('\n可能的原因:');
      console.log('- 事件监听器没有正确添加');
      console.log('- 截图失败导致事件没有上传');
      console.log('- 上传请求失败');
    } else {
      console.log(`✅ 已记录 ${session.stepCount} 个步骤\n`);
    }

    // 3. 检查后端项目数据
    if (session.projectId) {
      console.log('3. 检查后端项目数据...');
      try {
        const projectResponse = await fetch(`http://localhost:5001/api/projects/${session.projectId}`);
        if (projectResponse.ok) {
          const project = await projectResponse.json();
          console.log('✅ 项目数据:', {
            id: project.id,
            title: project.title,
            uuid: project.uuid
          });

          // 获取步骤数据
          const stepsResponse = await fetch(`http://localhost:5001/api/projects/${session.projectId}/steps`);
          if (stepsResponse.ok) {
            const steps = await stepsResponse.json();
            console.log(`✅ 后端有 ${steps.length} 个步骤`);
            
            if (steps.length === 0) {
              console.warn('⚠️  警告: 后端没有步骤数据');
              console.log('\n可能的原因:');
              console.log('- 上传请求没有到达后端');
              console.log('- 后端保存失败');
              console.log('- 数据库写入失败');
            } else {
              console.log('\n步骤详情:');
              steps.forEach((step, index) => {
                console.log(`  步骤 ${index + 1}:`, {
                  id: step.id,
                  actionType: step.actionType,
                  targetText: step.targetText,
                  hasImage: !!step.imageUrl,
                  hasAudio: !!step.audioUrl
                });
              });
            }
          } else {
            console.error('❌ 无法获取步骤数据:', stepsResponse.status);
          }
        } else {
          console.error('❌ 无法获取项目数据:', projectResponse.status);
        }
      } catch (error) {
        console.error('❌ 后端请求失败:', error.message);
        console.log('\n请确保:');
        console.log('- 后端服务正在运行 (http://localhost:5001)');
        console.log('- 没有 CORS 错误');
      }
      console.log('');
    } else {
      console.log('3. 跳过后端检查（项目尚未创建）\n');
    }

    // 4. 检查存储中的失败上传
    console.log('4. 检查 IndexedDB 中的失败上传...');
    try {
      const db = await new Promise((resolve, reject) => {
        const request = indexedDB.open('AcroRecorder', 1);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      const transaction = db.transaction(['failedUploads'], 'readonly');
      const store = transaction.objectStore('failedUploads');
      const countRequest = store.count();

      const failedCount = await new Promise((resolve, reject) => {
        countRequest.onsuccess = () => resolve(countRequest.result);
        countRequest.onerror = () => reject(countRequest.error);
      });

      if (failedCount > 0) {
        console.warn(`⚠️  发现 ${failedCount} 个失败的上传`);
        
        // 获取失败上传的详情
        const getAllRequest = store.getAll();
        const failedUploads = await new Promise((resolve, reject) => {
          getAllRequest.onsuccess = () => resolve(getAllRequest.result);
          getAllRequest.onerror = () => reject(getAllRequest.error);
        });

        console.log('\n失败上传详情:');
        failedUploads.forEach((upload, index) => {
          console.log(`  失败上传 ${index + 1}:`, {
            sessionId: upload.sessionId,
            orderIndex: upload.orderIndex,
            actionType: upload.actionType,
            retryCount: upload.retryCount,
            timestamp: new Date(upload.timestamp).toLocaleString()
          });
        });
      } else {
        console.log('✅ 没有失败的上传\n');
      }

      db.close();
    } catch (error) {
      console.log('ℹ️  无法访问 IndexedDB:', error.message);
      console.log('（这可能是正常的，如果没有失败的上传）\n');
    }

    // 5. 提供诊断建议
    console.log('=== 诊断总结 ===\n');

    if (session.status === 'idle') {
      console.log('✅ 当前没有活动的录制会话');
    } else if (session.status === 'recording') {
      console.log('ℹ️  录制正在进行中');
      console.log('\n建议:');
      console.log('1. 执行一些操作（点击、滚动）');
      console.log('2. 等待几秒钟让上传完成');
      console.log('3. 点击停止录制');
    } else if (session.status === 'paused') {
      console.log('ℹ️  录制已暂停');
      console.log('\n建议:');
      console.log('1. 点击继续录制或完成录制');
    } else if (session.status === 'stopped') {
      console.log('ℹ️  录制已停止');
      if (session.stepCount === 0) {
        console.log('\n⚠️  问题: 没有记录任何步骤');
        console.log('\n可能的原因:');
        console.log('1. START_CAPTURE 消息没有发送到内容脚本');
        console.log('2. 事件监听器没有正确添加');
        console.log('3. 截图失败导致事件没有上传');
        console.log('\n解决方案:');
        console.log('1. 刷新页面');
        console.log('2. 重新开始录制');
        console.log('3. 检查浏览器控制台是否有错误');
      }
    }

    // 6. 测试截图功能
    console.log('\n6. 测试截图功能...');
    try {
      const screenshotResponse = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: 'CAPTURE_SCREENSHOT' }, resolve);
      });

      if (screenshotResponse && screenshotResponse.screenshot) {
        console.log('✅ 截图功能正常');
        console.log(`   截图大小: ${screenshotResponse.screenshot.length} 字符`);
      } else if (screenshotResponse && screenshotResponse.error) {
        console.error('❌ 截图失败:', screenshotResponse.error);
        console.log('\n可能的原因:');
        console.log('- 标签页不是活动标签页');
        console.log('- 权限不足');
        console.log('- 浏览器限制');
      } else {
        console.error('❌ 截图响应无效');
      }
    } catch (error) {
      console.error('❌ 截图测试失败:', error.message);
    }

    console.log('\n=== 诊断完成 ===');

  } catch (error) {
    console.error('❌ 诊断过程出错:', error);
  }
})();
