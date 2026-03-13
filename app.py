# ============================
# 一个最简单的 Flask + MySQL 登录/注册后端
# ============================
# 说明：
# 1. 先运行 init_db.py 创建数据库和表
# 2. 再运行 python app.py 启动服务

from flask import Flask, request, jsonify, session, send_from_directory
import pymysql
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.exceptions import HTTPException
from datetime import date
from pathlib import Path
import logging

# ============================
# 1. 配置区（默认本地 MySQL）
# ============================
DB_HOST = 'localhost'
DB_PORT = 3306
DB_USER = 'root'
DB_PASSWORD = 'root'  # 如果你的 MySQL 有密码，请改这里
DB_NAME = 'todo_app'

# Flask 的密钥（用于加密 Session）
SECRET_KEY = 'simple-secret-key'

# ============================
# 2. 创建应用
# ============================
app = Flask(__name__)
app.secret_key = SECRET_KEY

# ============================
# 2.1 日志配置（同时输出到终端和文件）
# ============================
BASE_DIR = Path(__file__).resolve().parent
LOG_DIR = BASE_DIR / 'logs'
LOG_FILE = LOG_DIR / 'app.log'
LOG_DIR.mkdir(exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler(LOG_FILE, encoding='utf-8'),
        logging.StreamHandler()
    ]
)

app.logger.setLevel(logging.INFO)


@app.before_request
def log_request_start():
    app.logger.info('REQUEST %s %s', request.method, request.path)


@app.after_request
def log_request_end(response):
    app.logger.info('RESPONSE %s %s -> %s', request.method, request.path, response.status_code)
    return response


@app.errorhandler(pymysql.MySQLError)
def handle_mysql_error(err):
    app.logger.exception('Database error on %s %s', request.method, request.path)
    if request.path.startswith('/api/'):
        return jsonify({'message': '数据库连接失败，请确认 MySQL 服务已启动'}), 503
    return 'Database error', 503


@app.errorhandler(Exception)
def handle_unexpected_error(err):
    if isinstance(err, HTTPException):
        return err
    app.logger.exception('Unhandled error on %s %s', request.method, request.path)
    if request.path.startswith('/api/'):
        return jsonify({'message': '服务器内部错误，请稍后重试'}), 500
    return 'Internal server error', 500

# ============================
# 3. 数据库连接函数
# ============================
def get_conn():
    return pymysql.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=True
    )

# ============================
# 4. 静态页面：返回前端文件
# ============================
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/style.css')
def style():
    return send_from_directory('.', 'style.css')

@app.route('/script.js')
def script():
    return send_from_directory('.', 'script.js')


@app.route('/favicon.ico')
def favicon():
    # Avoid noisy 404 logs in browser console.
    return '', 204

# ============================
# 5. 工具函数：检查是否登录
# ============================
def require_login():
    user_id = session.get('user_id')
    if not user_id:
        return None, (jsonify({'message': '未登录'}), 401)
    return user_id, None

# ============================
# 6. 接口：注册
# ============================
@app.post('/api/register')
def register():
    data = request.get_json() or {}
    username = (data.get('username') or '').strip()
    password = (data.get('password') or '').strip()

    if not username or not password:
        app.logger.warning('注册失败：用户名或密码为空')
        return jsonify({'message': '用户名和密码不能为空'}), 400

    # 检查用户名是否存在
    conn = get_conn()
    with conn.cursor() as cursor:
        cursor.execute('SELECT id FROM users WHERE username = %s', (username,))
        if cursor.fetchone():
            app.logger.warning('注册失败：用户名已存在 username=%s', username)
            return jsonify({'message': '用户名已存在'}), 400

        # 保存加密后的密码
        pwd_hash = generate_password_hash(password)
        cursor.execute(
            'INSERT INTO users (username, password_hash) VALUES (%s, %s)',
            (username, pwd_hash)
        )

    app.logger.info('注册成功 username=%s', username)
    return jsonify({'message': '注册成功'})

# ============================
# 7. 接口：登录
# ============================
@app.post('/api/login')
def login():
    data = request.get_json() or {}
    username = (data.get('username') or '').strip()
    password = (data.get('password') or '').strip()

    if not username or not password:
        app.logger.warning('登录失败：用户名或密码为空')
        return jsonify({'message': '用户名和密码不能为空'}), 400

    conn = get_conn()
    with conn.cursor() as cursor:
        cursor.execute('SELECT id, password_hash FROM users WHERE username = %s', (username,))
        user = cursor.fetchone()

    if not user:
        app.logger.warning('登录失败：用户名不存在 username=%s', username)
        return jsonify({'message': '用户名不存在'}), 400

    if not check_password_hash(user['password_hash'], password):
        app.logger.warning('登录失败：密码错误 username=%s', username)
        return jsonify({'message': '密码错误'}), 400

    # 登录成功：写入 Session
    session['user_id'] = user['id']
    session['username'] = username

    app.logger.info('登录成功 username=%s', username)
    return jsonify({'message': '登录成功', 'username': username})

# ============================
# 8. 接口：检查是否登录
# ============================
@app.get('/api/me')
def me():
    username = session.get('username')
    if not username:
        return jsonify({'loggedIn': False})
    return jsonify({'loggedIn': True, 'username': username})

# ============================
# 9. 接口：退出登录
# ============================
@app.post('/api/logout')
def logout():
    username = session.get('username')
    session.clear()
    app.logger.info('退出登录 username=%s', username)
    return jsonify({'message': '已退出'})

# ============================
# 10. 接口：获取当前用户的任务
# ============================
@app.get('/api/todos')
def get_todos():
    user_id, err = require_login()
    if err:
        return err

    conn = get_conn()
    with conn.cursor() as cursor:
        cursor.execute(
            'SELECT id, text, done, date FROM todos WHERE user_id = %s ORDER BY id DESC',
            (user_id,)
        )
        rows = cursor.fetchall()

    # done 从 0/1 转为 true/false
    todos = []
    for r in rows:
        todos.append({
            'id': r['id'],
            'text': r['text'],
            'done': bool(r['done']),
            'date': r['date']
        })

    return jsonify({'todos': todos})

# ============================
# 11. 接口：新增任务
# ============================
@app.post('/api/todos')
def create_todo():
    user_id, err = require_login()
    if err:
        return err

    data = request.get_json() or {}
    text = (data.get('text') or '').strip()
    todo_date = (data.get('date') or '').strip()

    if not text:
        return jsonify({'message': '任务内容不能为空'}), 400

    if not todo_date:
        todo_date = date.today().strftime('%Y-%m-%d')

    conn = get_conn()
    with conn.cursor() as cursor:
        cursor.execute(
            'INSERT INTO todos (user_id, text, done, date) VALUES (%s, %s, %s, %s)',
            (user_id, text, 0, todo_date)
        )
        todo_id = cursor.lastrowid

    return jsonify({
        'todo': {
            'id': todo_id,
            'text': text,
            'done': False,
            'date': todo_date
        }
    })

# ============================
# 12. 接口：更新任务完成状态
# ============================
@app.put('/api/todos/<int:todo_id>')
def update_todo(todo_id):
    user_id, err = require_login()
    if err:
        return err

    data = request.get_json() or {}
    done = data.get('done')

    if done is None:
        return jsonify({'message': '缺少 done 参数'}), 400

    conn = get_conn()
    with conn.cursor() as cursor:
        cursor.execute(
            'UPDATE todos SET done = %s WHERE id = %s AND user_id = %s',
            (1 if done else 0, todo_id, user_id)
        )

    return jsonify({'message': '更新成功'})

# ============================
# 13. 接口：删除任务
# ============================
@app.delete('/api/todos/<int:todo_id>')
def delete_todo(todo_id):
    user_id, err = require_login()
    if err:
        return err

    conn = get_conn()
    with conn.cursor() as cursor:
        cursor.execute(
            'DELETE FROM todos WHERE id = %s AND user_id = %s',
            (todo_id, user_id)
        )

    return jsonify({'message': '删除成功'})

# ============================
# 14. 启动服务
# ============================
if __name__ == '__main__':
    # host=0.0.0.0 方便局域网访问，初学者本地用 127.0.0.1 也可以
    app.logger.info('Server started at http://127.0.0.1:5000')
    app.run(host='127.0.0.1', port=5000, debug=False)
