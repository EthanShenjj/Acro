#!/usr/bin/env python3
"""检查数据库中的项目和步骤"""

from app import create_app
from models.project import Project
from models.step import Step

app = create_app()
with app.app_context():
    # 获取所有项目
    all_projects = Project.query.all()
    total_count = len(all_projects)
    
    print(f'\n=== 数据库检查 ===')
    print(f'总项目数: {total_count}')
    print('')
    
    if total_count == 0:
        print('❌ 数据库中没有任何项目！')
        print('')
        print('可能的原因：')
        print('1. 录制时没有捕获任何事件（点击或滚动）')
        print('2. 事件捕获失败（截图失败或上传失败）')
        print('3. 后端未收到 /api/recording/chunk 请求')
        print('4. 数据库连接问题')
        print('')
        print('请运行诊断脚本：')
        print('1. 打开浏览器控制台（F12）')
        print('2. 复制 diagnose-recording.js 的内容')
        print('3. 粘贴到控制台并按回车')
    else:
        # 获取最近的项目
        projects = Project.query.order_by(Project.created_at.desc()).limit(10).all()
        print(f'最近的 {len(projects)} 个项目:')
        print('')
        
        for p in projects:
            step_count = Step.query.filter_by(project_id=p.id).count()
            print(f'项目 {p.id}: {p.title}')
            print(f'  - UUID: {p.uuid}')
            print(f'  - 创建时间: {p.created_at}')
            print(f'  - 步骤数: {step_count}')
            print(f'  - 缩略图: {p.thumbnail_url or "(无)"}')
            
            # 显示步骤详情
            if step_count > 0:
                steps = Step.query.filter_by(project_id=p.id).order_by(Step.order_index).all()
                print(f'  - 步骤详情:')
                for s in steps:
                    target = s.target_text[:30] if s.target_text else "(无文本)"
                    print(f'    {s.order_index}. {s.action_type.value} - {target}')
                    print(f'       图片: {s.image_url}')
                    print(f'       音频: {s.audio_url or "(无)"}')
            else:
                print(f'  ⚠️  此项目没有步骤！')
            
            print('')
    
    print('=== 检查完成 ===')
