# MySQL 数据库配置指南

## 方法一：使用自动化脚本（推荐）

1. 确保 MySQL 已安装并运行
2. 配置 `.env` 文件中的数据库信息
3. 运行设置脚本：

```bash
cd backend
./setup_mysql.sh
```

脚本会自动：
- 创建数据库
- 初始化表结构
- 创建系统文件夹

## 方法二：手动设置

### 1. 安装 MySQL

**macOS (使用 Homebrew):**
```bash
brew install mysql
brew services start mysql
```

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install mysql-server
sudo systemctl start mysql
```

### 2. 创建数据库

登录 MySQL：
```bash
mysql -u root -p
```

执行以下 SQL 命令：
```sql
CREATE DATABASE acro_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

或者直接导入 SQL 文件：
```bash
mysql -u root -p < create_database.sql
```

### 3. 配置 .env 文件

编辑 `backend/.env` 文件：

```env
# Database Configuration
USE_SQLITE=False
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password_here
DB_NAME=acro_db
```

**重要提示：**
- 如果 MySQL root 用户没有密码，保持 `DB_PASSWORD=` 为空
- 如果使用其他用户，修改 `DB_USER` 和 `DB_PASSWORD`

### 4. 初始化数据库表

```bash
cd backend
python3 init_db.py
```

这会创建所有必要的表和系统文件夹。

### 5. 验证设置

启动后端服务器：
```bash
python3 app.py
```

检查是否有数据库连接错误。

## 常见问题

### 问题 1: Access denied for user 'root'@'localhost'

**原因：** MySQL 密码不正确或用户没有权限

**解决方案：**
1. 重置 MySQL root 密码
2. 或者在 `.env` 中设置正确的密码

### 问题 2: Can't connect to MySQL server

**原因：** MySQL 服务未运行

**解决方案：**
```bash
# macOS
brew services start mysql

# Ubuntu/Debian
sudo systemctl start mysql
```

### 问题 3: Database 'acro_db' doesn't exist

**原因：** 数据库未创建

**解决方案：**
```bash
mysql -u root -p -e "CREATE DATABASE acro_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

## 数据库结构

初始化后会创建以下表：

- `folders` - 文件夹管理
- `projects` - 项目信息
- `steps` - 录制步骤

以及系统文件夹：
- "All Flows" - 默认文件夹
- "Trash" - 回收站

## 切换到 SQLite（开发环境）

如果不想使用 MySQL，可以切换到 SQLite：

1. 编辑 `.env` 文件：
```env
USE_SQLITE=True
```

2. 重启后端服务器

SQLite 数据库文件会自动创建在 `backend/acro.db`

## 数据库管理工具

推荐使用以下工具管理 MySQL 数据库：

- **MySQL Workbench** - 官方 GUI 工具
- **phpMyAdmin** - Web 界面
- **DBeaver** - 跨平台数据库工具
- **TablePlus** - macOS 上的现代化工具

## 备份和恢复

### 备份数据库
```bash
mysqldump -u root -p acro_db > acro_backup.sql
```

### 恢复数据库
```bash
mysql -u root -p acro_db < acro_backup.sql
```
