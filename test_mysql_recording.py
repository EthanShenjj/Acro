#!/usr/bin/env python3
"""测试MySQL数据库录制"""

import requests
import json
import subprocess

BASE_URL = "http://localhost:5001"

def check_mysql_database():
    """检查MySQL数据库当前状态"""
    cmd = [
        '/usr/local/mysql/bin/mysql',
        '-u', 'root',
        '-prootroot',
        '-e', 'USE acro_db; SELECT COUNT(*) FROM projects; SELECT COUNT(*) FROM steps;'
    ]
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    output = result.stdout
    
    # 解析输出
    lines = [line for line in output.split('\n') if line.strip() and not line.startswith('mysql:')]
    
    project_count = 0
    step_count = 0
    
    for i, line in enumerate(lines):
        if 'COUNT(*)' in line:
            if i + 1 < len(lines):
                if project_count == 0:
                    project_count = int(lines[i + 1])
                else:
                    step_count = int(lines[i + 1])
    
    print(f"MySQL数据库状态: {project_count} 个项目, {step_count} 个步骤")
    return project_count, step_count

def test_recording_flow():
    """测试完整的录制流程"""
    print("=== 测试MySQL数据库录制 ===\n")
    
    # 1. 检查初始状态
    print("1. 检查初始MySQL数据库状态...")
    initial_projects, initial_steps = check_mysql_database()
    print()
    
    # 2. 启动录制会话
    print("2. 启动录制会话...")
    response = requests.post(f"{BASE_URL}/api/recording/start", json={})
    print(f"状态码: {response.status_code}")
    print(f"响应: {response.json()}")
    
    if response.status_code != 200:
        print("✗ 启动录制失败")
        return
    
    session_id = response.json()['sessionId']
    print(f"✓ 会话ID: {session_id}\n")
    
    # 3. 上传测试步骤
    print("3. 上传第一个测试步骤...")
    
    # 简单的1x1红色像素PNG
    test_image = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="
    
    step_data = {
        "sessionId": session_id,
        "orderIndex": 1,
        "actionType": "click",
        "targetText": "MySQL测试按钮",
        "posX": 100,
        "posY": 200,
        "viewportWidth": 1920,
        "viewportHeight": 1080,
        "screenshotBase64": test_image
    }
    
    response = requests.post(f"{BASE_URL}/api/recording/chunk", json=step_data)
    print(f"状态码: {response.status_code}")
    print(f"响应: {response.json()}")
    
    if response.status_code != 200:
        print("✗ 上传步骤失败")
        return
    
    step_id = response.json()['stepId']
    print(f"✓ 步骤ID: {step_id}\n")
    
    # 4. 检查MySQL数据库
    print("4. 检查MySQL数据库中的新数据...")
    cmd = [
        '/usr/local/mysql/bin/mysql',
        '-u', 'root',
        '-prootroot',
        '-e', f'USE acro_db; SELECT id, project_id, order_index, action_type, target_text FROM steps WHERE id = {step_id};'
    ]
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    output = result.stdout
    
    if f'{step_id}' in output:
        print(f"✓ 在MySQL中找到步骤:")
        for line in output.split('\n'):
            if line.strip() and not line.startswith('mysql:'):
                print(f"  {line}")
    else:
        print(f"✗ MySQL数据库中未找到步骤 ID={step_id}")
        print("这是问题所在！")
    print()
    
    # 5. 上传第二个步骤
    print("5. 上传第二个步骤...")
    step_data['orderIndex'] = 2
    step_data['targetText'] = "MySQL第二个按钮"
    step_data['posX'] = 300
    step_data['posY'] = 400
    
    response = requests.post(f"{BASE_URL}/api/recording/chunk", json=step_data)
    print(f"状态码: {response.status_code}")
    
    if response.status_code == 200:
        step_id_2 = response.json()['stepId']
        print(f"✓ 第二个步骤ID: {step_id_2}\n")
    else:
        print(f"✗ 上传第二个步骤失败: {response.json()}\n")
    
    # 6. 停止录制
    print("6. 停止录制...")
    response = requests.post(f"{BASE_URL}/api/recording/stop", json={"sessionId": session_id})
    print(f"状态码: {response.status_code}")
    print(f"响应: {response.json()}")
    
    if response.status_code != 200:
        print("✗ 停止录制失败")
        return
    
    project_id = response.json()['projectId']
    print(f"✓ 项目ID: {project_id}\n")
    
    # 7. 检查最终状态
    print("7. 检查最终MySQL数据库状态...")
    final_projects, final_steps = check_mysql_database()
    
    print(f"\n变化:")
    print(f"  项目: {initial_projects} -> {final_projects} (+{final_projects - initial_projects})")
    print(f"  步骤: {initial_steps} -> {final_steps} (+{final_steps - initial_steps})")
    
    if final_steps - initial_steps == 2:
        print("\n✓✓✓ 成功！两个步骤都已保存到MySQL数据库 ✓✓✓")
    else:
        print(f"\n✗ 问题！预期增加2个步骤，实际增加了 {final_steps - initial_steps} 个")
    
    # 8. 显示项目的所有步骤
    print(f"\n8. MySQL中项目 {project_id} 的所有步骤:")
    cmd = [
        '/usr/local/mysql/bin/mysql',
        '-u', 'root',
        '-prootroot',
        '-e', f'USE acro_db; SELECT id, order_index, action_type, target_text FROM steps WHERE project_id = {project_id} ORDER BY order_index;'
    ]
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    output = result.stdout
    
    for line in output.split('\n'):
        if line.strip() and not line.startswith('mysql:'):
            print(f"  {line}")
    
    print("\n=== 测试完成 ===")

if __name__ == "__main__":
    try:
        test_recording_flow()
    except Exception as e:
        print(f"\n✗ 测试失败: {e}")
        import traceback
        traceback.print_exc()
