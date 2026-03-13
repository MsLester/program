# ============================
# 初始化数据库脚本
# ============================
# 说明：
# 1. 运行前请确保 MySQL 服务已启动
# 2. 如果有密码，请修改 DB_PASSWORD
# 3. 运行：python init_db.py

import pymysql

# 数据库配置（与 app.py 保持一致）
DB_HOST = 'localhost'
DB_PORT = 3306
DB_USER = 'root'
DB_PASSWORD = 'root'  # 如果你的 MySQL 有密码，请改这里
DB_NAME = 'todo_app'

# 连接 MySQL（不指定数据库）
conn = pymysql.connect(
    host=DB_HOST,
    port=DB_PORT,
    user=DB_USER,
    password=DB_PASSWORD,
    autocommit=True
)

with conn.cursor() as cursor:
    # 创建数据库
    cursor.execute(f"CREATE DATABASE IF NOT EXISTS {DB_NAME} DEFAULT CHARSET utf8mb4")
    # 选择数据库
    cursor.execute(f"USE {DB_NAME}")
    # 创建用户表
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INT PRIMARY KEY AUTO_INCREMENT,
            username VARCHAR(50) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    # 创建任务表（按用户存储）
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS todos (
            id INT PRIMARY KEY AUTO_INCREMENT,
            user_id INT NOT NULL,
            text VARCHAR(255) NOT NULL,
            done TINYINT(1) NOT NULL DEFAULT 0,
            date VARCHAR(10) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )

print('数据库初始化完成')
