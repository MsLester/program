// ============================
// 1. 获取页面上的元素
// ============================
const input = document.getElementById('todo-input'); // 输入框
const addBtn = document.getElementById('add-btn');   // 添加按钮
const list = document.getElementById('todo-list');   // 列表容器

const filterDate = document.getElementById('filter-date'); // 日期输入框
const filterBtn = document.getElementById('filter-btn');   // 查找按钮
const clearBtn = document.getElementById('clear-btn');     // 清除按钮

// ============================
// 2. 定义数据结构（任务数组）
// ============================
// 每个任务结构示例：
// {
//   id: 1710000000000,   // 唯一标识
//   text: '买牛奶',       // 任务文字
//   done: false,         // 是否完成
//   date: '2026-03-12'    // 创建日期（本地）
// }
let todos = [];

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
// 4. 渲染函数：把数据画到页面上
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
// 5. 添加任务
// ============================
function addTodo() {
  const text = input.value.trim();
  if (!text) return; // 空内容不添加

  const todo = {
    id: Date.now(),
    text,
    done: false,
    date: getTodayString()
  };

  todos.push(todo);
  input.value = '';
  input.focus();

  // 默认显示全部任务
  render(todos);
}

// ============================
// 6. 按日期查找
// ============================
function filterByDate() {
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
// 7. 清除筛选
// ============================
function clearFilter() {
  filterDate.value = '';
  render(todos);
}

// ============================
// 8. 事件绑定
// ============================
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
list.addEventListener('click', (e) => {
  const action = e.target.dataset.action;
  if (!action) return;

  const li = e.target.closest('li');
  if (!li) return;

  const id = Number(li.dataset.id);

  if (action === 'toggle') {
    // 切换完成状态
    todos = todos.map((t) =>
      t.id === id ? { ...t, done: !t.done } : t
    );
  }

  if (action === 'delete') {
    // 删除任务
    todos = todos.filter((t) => t.id !== id);
  }

  // 更新当前视图（如果有日期筛选，继续按筛选显示）
  filterByDate();
});

// ============================
// 9. 初次渲染（空列表）
// ============================
render(todos);
