#!/usr/bin/env python3
"""测试录制API和数据库存储"""

import requests
import json
import sqlite3

BASE_URL = "http://localhost:5001"

def check_database():
    """检查数据库当前状态"""
    conn = sqlite3.connect('backend/acro.db')
    cursor = conn.cursor()
    
    cursor.execute("SELECT COUNT(*) FROM projects")
    project_count = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM steps")
    step_count = cursor.fetchone()[0]
    
    print(f"当前数据库状态: {project_count} 个项目, {step_count} 个步骤")
    
    conn.close()
    return project_count, step_count

def test_recording_flow():
    """测试完整的录制流程"""
    print("=== 测试录制API和数据库存储 ===\n")
    
    # 1. 检查初始状态
    print("1. 检查初始数据库状态...")
    initial_projects, initial_steps = check_database()
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
    print("3. 上传测试步骤...")
    
    # 简单的1x1红色像素PNG
    test_image = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="
    
    step_data = {
        "sessionId": session_id,
        "orderIndex": 1,
        "actionType": "click",
        "targetText": "测试按钮",
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
    
    # 4. 检查数据库
    print("4. 检查数据库中的新数据...")
    conn = sqlite3.connect('backend/acro.db')
    cursor = conn.cursor()
    
    cursor.execute("SELECT id, project_id, order_index, action_type, target_text FROM steps WHERE id = ?", (step_id,))
    step = cursor.fetchone()
    
    if step:
        print(f"✓ 找到步骤: ID={step[0]}, ProjectID={step[1]}, Order={step[2]}, Action={step[3]}, Text={step[4]}")
    else:
        print(f"✗ 数据库中未找到步骤 ID={step_id}")
        print("这是问题所在！")
    
    conn.close()
    print()
    
    # 5. 上传第二个步骤
    print("5. 上传第二个步骤...")
    step_data['orderIndex'] = 2
    step_data['targetText'] = "第二个按钮"
    step_data['posX'] = 300
    step_data['posY'] = 400
    
    response = requests.post(f"{BASE_URL}/api/recording/chunk", json=step_data)
    print(f"状态码: {response.status_code}")
    print(f"响应: {response.json()}")
    
    if response.status_code == 200:
        step_id_2 = response.json()['stepId']
        print(f"✓ 第二个步骤ID: {step_id_2}\n")
    else:
        print("✗ 上传第二个步骤失败\n")
    
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
    print("7. 检查最终数据库状态...")
    final_projects, final_steps = check_database()
    
    print(f"\n变化:")
    print(f"  项目: {initial_projects} -> {final_projects} (+{final_projects - initial_projects})")
    print(f"  步骤: {initial_steps} -> {final_steps} (+{final_steps - initial_steps})")
    
    if final_steps - initial_steps == 2:
        print("\n✓ 成功！两个步骤都已保存到数据库")
    else:
        print(f"\n✗ 问题！预期增加2个步骤，实际增加了 {final_steps - initial_steps} 个")
    
    # 8. 显示项目的所有步骤
    print(f"\n8. 项目 {project_id} 的所有步骤:")
    conn = sqlite3.connect('backend/acro.db')
    cursor = conn.cursor()
    cursor.execute("SELECT id, order_index, action_type, target_text FROM steps WHERE project_id = ? ORDER BY order_index", (project_id,))
    steps = cursor.fetchall()
    
    for step in steps:
        print(f"  Step {step[0]}: Order={step[1]}, Action={step[2]}, Text={step[3]}")
    
    conn.close()
    
    print("\n=== 测试完成 ===")

if __name__ == "__main__":
    try:
        test_recording_flow()
    except Exception as e:
        print(f"\n✗ 测试失败: {e}")
        import traceback
        traceback.print_exc()
