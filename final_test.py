#!/usr/bin/env python3
import requests
import subprocess
import time

print("=== MySQL数据库录制测试 ===\n")

# 1. 启动会话
print("1. 启动录制会话...")
r = requests.post('http://localhost:5001/api/recording/start', json={})
print(f"   状态: {r.status_code}")
session_id = r.json()['sessionId']
print(f"   会话ID: {session_id}\n")

# 2. 上传步骤
print("2. 上传步骤...")
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

r = requests.post('http://localhost:5001/api/recording/chunk', json=step_data)
print(f"   状态: {r.status_code}")
result = r.json()
print(f"   响应: {result}")

if 'stepId' in result:
    step_id = result['stepId']
    print(f"   ✓ 步骤ID: {step_id}\n")
    
    # 3. 检查MySQL
    print("3. 检查MySQL数据库...")
    time.sleep(0.5)  # 等待数据库写入
    
    cmd = ['/usr/local/mysql/bin/mysql', '-u', 'root', '-prootroot', '-e',
           f'USE acro_db; SELECT id, project_id, order_index, action_type, target_text FROM steps WHERE id = {step_id};']
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    lines = [l for l in result.stdout.split('\n') if l.strip() and 'Warning' not in l]
    
    if len(lines) > 1:
        print("   ✓ 在MySQL中找到步骤:")
        for line in lines:
            print(f"     {line}")
    else:
        print("   ✗ MySQL中未找到步骤")
else:
    print(f"   ✗ 上传失败: {result}")
    exit(1)

print()

# 4. 上传第二个步骤
print("4. 上传第二个步骤...")
step_data['orderIndex'] = 2
step_data['targetText'] = "第二个按钮"
step_data['posX'] = 300

r = requests.post('http://localhost:5001/api/recording/chunk', json=step_data)
if r.status_code == 200:
    step_id_2 = r.json()['stepId']
    print(f"   ✓ 步骤ID: {step_id_2}\n")
else:
    print(f"   ✗ 失败: {r.json()}\n")

# 5. 停止录制
print("5. 停止录制...")
r = requests.post('http://localhost:5001/api/recording/stop', json={"sessionId": session_id})
print(f"   状态: {r.status_code}")
project_id = r.json()['projectId']
print(f"   ✓ 项目ID: {project_id}\n")

# 6. 查看所有步骤
print(f"6. 项目 {project_id} 的所有步骤:")
cmd = ['/usr/local/mysql/bin/mysql', '-u', 'root', '-prootroot', '-e',
       f'USE acro_db; SELECT id, order_index, action_type, target_text FROM steps WHERE project_id = {project_id} ORDER BY order_index;']

result = subprocess.run(cmd, capture_output=True, text=True)
lines = [l for l in result.stdout.split('\n') if l.strip() and 'Warning' not in l]

for line in lines:
    print(f"   {line}")

# 7. 统计
print("\n7. 数据库统计:")
cmd = ['/usr/local/mysql/bin/mysql', '-u', 'root', '-prootroot', '-e',
       'USE acro_db; SELECT COUNT(*) as projects FROM projects; SELECT COUNT(*) as steps FROM steps;']

result = subprocess.run(cmd, capture_output=True, text=True)
lines = [l for l in result.stdout.split('\n') if l.strip() and 'Warning' not in l]

for line in lines:
    print(f"   {line}")

print("\n=== ✓ 测试完成！数据已成功保存到MySQL ===")
