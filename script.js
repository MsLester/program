// ============================
// 1. 获取页面上的元素
// ============================
// Todo 相关元素
const input = document.getElementById('todo-input'); // 输入框
const addBtn = document.getElementById('add-btn');   // 添加按钮
const list = document.getElementById('todo-list');   // 列表容器
const todoSection = document.getElementById('todo-section'); // Todo 区域

const filterDate = document.getElementById('filter-date'); // 日期输入框
const filterBtn = document.getElementById('filter-btn');   // 查找按钮
const clearBtn = document.getElementById('clear-btn');     // 清除按钮

// 登录 / 注册相关元素
const authSection = document.getElementById('auth-section');
const authStatus = document.getElementById('auth-status');
const authMessage = document.getElementById('auth-message');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const registerBtn = document.getElementById('register-btn');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');

// ============================
// 2. 定义数据结构（任务数组）
// ============================
// 任务从后端读取，保存在前端内存里
let todos = [];

// 当前登录用户（未登录为 null）
let currentUser = null;

// ============================
// 3. 工具函数：获取本地日期字符串
// ============================
function getTodayString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`; // 例如：2026-03-12
}

// ============================
// 4. 工具函数：显示提示信息
// ============================
function showAuthMessage(text, isError) {
  authMessage.textContent = text;
  authMessage.style.color = isError ? '#c00' : '#090';
}

// ============================
// 5. 工具函数：切换登录界面
// ============================
function setAuthUI(username) {
  if (username) {
    // 已登录
    currentUser = username;
    authStatus.textContent = `已登录：${username}`;
    authSection.classList.add('hidden');
    todoSection.classList.remove('hidden');
    logoutBtn.classList.remove('hidden');
    showAuthMessage('', false);

    // 登录后清空输入框
    usernameInput.value = '';
    passwordInput.value = '';

    // 登录后拉取任务
    loadTodos();
  } else {
    // 未登录
    currentUser = null;
    authStatus.textContent = '未登录';
    authSection.classList.remove('hidden');
    todoSection.classList.add('hidden');
    logoutBtn.classList.add('hidden');
    showAuthMessage('', false);

    // 清空前端任务
    todos = [];
    render(todos);
  }
}

// ============================
// 6. 与后端交互：注册
// ============================
async function registerUser() {
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();

  if (!username || !password) {
    showAuthMessage('用户名和密码不能为空', true);
    return;
  }

  try {
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (!res.ok) {
      showAuthMessage(data.message || '注册失败', true);
      return;
    }

    showAuthMessage('注册成功，请登录', false);
  } catch (err) {
    showAuthMessage('网络错误，无法注册', true);
  }
}

// ============================
// 7. 与后端交互：登录
// ============================
async function loginUser() {
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();

  if (!username || !password) {
    showAuthMessage('用户名和密码不能为空', true);
    return;
  }

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (!res.ok) {
      showAuthMessage(data.message || '登录失败', true);
      return;
    }

    setAuthUI(data.username);
  } catch (err) {
    showAuthMessage('网络错误，无法登录', true);
  }
}

// ============================
// 8. 与后端交互：退出登录
// ============================
async function logoutUser() {
  try {
    await fetch('/api/logout', { method: 'POST' });
  } catch (err) {
    // 即使网络出错，也强制退出本地状态
  }
  setAuthUI(null);
}

// ============================
// 9. 与后端交互：检查是否已登录
// ============================
async function checkLogin() {
  try {
    const res = await fetch('/api/me');
    const data = await res.json();

    if (data.loggedIn) {
      setAuthUI(data.username);
    } else {
      setAuthUI(null);
    }
  } catch (err) {
    setAuthUI(null);
  }
}

// ============================
// 10. 与后端交互：获取任务
// ============================
async function loadTodos() {
  try {
    const res = await fetch('/api/todos');
    const data = await res.json();

    if (!res.ok) {
      return;
    }

    todos = data.todos || [];
    render(todos);
  } catch (err) {
    // 忽略网络错误
  }
}

// ============================
// 11. 与后端交互：新增任务
// ============================
async function createTodo(text) {
  try {
    const res = await fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        date: getTodayString()
      })
    });

    const data = await res.json();

    if (!res.ok) {
      return null;
    }

    return data.todo;
  } catch (err) {
    return null;
  }
}

// ============================
// 12. 与后端交互：更新任务完成状态
// ============================
async function updateTodoDone(id, done) {
  try {
    const res = await fetch(`/api/todos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done })
    });

    if (!res.ok) {
      return false;
    }

    return true;
  } catch (err) {
    return false;
  }
}

// ============================
// 13. 与后端交互：删除任务
// ============================
async function deleteTodo(id) {
  try {
    const res = await fetch(`/api/todos/${id}`, {
      method: 'DELETE' });

    if (!res.ok) {
      return false;
    }

    return true;
  } catch (err) {
    return false;
  }
}

// ============================
// 14. 渲染函数：把数据画到页面上
// ============================
function render(listToShow) {
  // 清空旧内容
  list.innerHTML = '';

  // 遍历要显示的任务
  listToShow.forEach((todo) => {
    // 创建 <li>
    const li = document.createElement('li');
    li.className = 'todo-item';
    li.dataset.id = String(todo.id);

    // 任务文本
    const textSpan = document.createElement('span');
    textSpan.className = 'todo-text' + (todo.done ? ' completed' : '');
    textSpan.textContent = todo.text;

    // 日期显示
    const dateSpan = document.createElement('span');
    dateSpan.className = 'todo-date';
    dateSpan.textContent = todo.date;

    // 按钮区域
    const actions = document.createElement('div');
    actions.className = 'todo-actions';

    // 完成按钮（根据当前状态显示不同文字）
    const doneBtn = document.createElement('button');
    doneBtn.textContent = todo.done ? '取消完成' : '完成';
    doneBtn.dataset.action = 'toggle';

    // 删除按钮
    const delBtn = document.createElement('button');
    delBtn.textContent = '删除';
    delBtn.dataset.action = 'delete';

    // 组装结构
    actions.appendChild(doneBtn);
    actions.appendChild(delBtn);

    li.appendChild(textSpan);
    li.appendChild(dateSpan);
    li.appendChild(actions);

    list.appendChild(li);
  });
}

// ============================
// 15. 添加任务（调用后端）
// ============================
async function addTodo() {
  if (!currentUser) return; // 未登录不允许添加

  const text = input.value.trim();
  if (!text) return; // 空内容不添加

  const newTodo = await createTodo(text);
  if (!newTodo) return;

  todos.unshift(newTodo); // 新任务放在最上面
  input.value = '';
  input.focus();

  // 默认显示全部任务
  render(todos);
}

// ============================
// 16. 按日期查找
// ============================
function filterByDate() {
  if (!currentUser) return; // 未登录不允许操作

  const dateValue = filterDate.value;

  // 如果没选择日期，就显示全部
  if (!dateValue) {
    render(todos);
    return;
  }

  const filtered = todos.filter((t) => t.date === dateValue);
  render(filtered);
}

// ============================
// 17. 清除筛选
// ============================
function clearFilter() {
  if (!currentUser) return; // 未登录不允许操作

  filterDate.value = '';
  render(todos);
}

// ============================
// 18. 事件绑定
// ============================
// 注册 / 登录 / 退出
registerBtn.addEventListener('click', registerUser);
loginBtn.addEventListener('click', loginUser);
logoutBtn.addEventListener('click', logoutUser);

// 添加任务
addBtn.addEventListener('click', addTodo);

// 回车添加任务
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    addTodo();
  }
});

// 点击查找
filterBtn.addEventListener('click', filterByDate);

// 点击清除
clearBtn.addEventListener('click', clearFilter);

// 列表按钮（完成 / 删除）使用事件委托
list.addEventListener('click', async (e) => {
  if (!currentUser) return; // 未登录不允许操作

  const action = e.target.dataset.action;
  if (!action) return;

  const li = e.target.closest('li');
  if (!li) return;

  const id = Number(li.dataset.id);

  if (action === 'toggle') {
    const target = todos.find((t) => t.id === id);
    if (!target) return;

    const ok = await updateTodoDone(id, !target.done);
    if (!ok) return;

    target.done = !target.done;
  }

  if (action === 'delete') {
    const ok = await deleteTodo(id);
    if (!ok) return;

    todos = todos.filter((t) => t.id !== id);
  }

  // 更新当前视图（如果有日期筛选，继续按筛选显示）
  filterByDate();
});

// ============================
// 19. 页面初始化
// ============================
render(todos);   // 先渲染空列表
checkLogin();    // 检查是否已登录
