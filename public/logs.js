// 加载日志数据
/* async function loadLogs() {
    try {
        const response = await fetch('/api/logs');
        if (!response.ok) throw new Error('加载日志失败');
        
        const logs = await response.json();
        renderLogsTable(logs);
    } catch (error) {
        console.error('加载日志失败:', error);
        alert('加载日志失败: ' + error.message);
    }
} */

    // 修改loadLogs函数添加错误处理
async function loadLogs() {
    try {
        const response = await fetch('/api/logs');
        
        if (response.status === 403) {
            // 无权访问的特殊处理
            alert('您的账户没有查看日志的权限');
            window.location.href = '/translate.html';
            return;
        }
        
        if (!response.ok) throw new Error('加载日志失败');
        
        const logs = await response.json();
        renderLogsTable(logs);
    } catch (error) {
        console.error('加载日志失败:', error);
        
        // 特殊处理权限错误
        if (error.message.includes('无权访问')) {
            window.location.href = '/translate.html';
        } else {
            alert('加载日志失败: ' + error.message);
        }
    }
}


// 渲染日志表格
/* function renderLogsTable(logs) {
    const tbody = document.querySelector('#logs-table tbody');
    tbody.innerHTML = '';
    
    logs.forEach(log => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${new Date(log.timestamp).toLocaleString()}</td>
            <td>${log.username}</td>
            <td>${log.ip || 'N/A'}</td>
            <td>${log.actionType}</td>
            <td>${log.details}</td>
        `;
        tbody.appendChild(row);
    });
} */

// 渲染日志表格
function renderLogsTable(logs) {
    const tbody = document.querySelector('#logs-table tbody');
    tbody.innerHTML = '';
    
    logs.forEach(log => {
        const row = document.createElement('tr');
        // 根据登录成功/失败添加不同样式类
        if (log.actionType === '用户登录') {
            row.classList.add(log.success ? 'login-success' : 'login-fail');
        }
        
        row.innerHTML = `
            <td>${new Date(log.timestamp).toLocaleString()}</td>
            <td>${log.username}</td>
            <td>${log.ip || 'N/A'}</td>
            <td>${log.actionType}</td>
            <td>${log.details}</td>
            <td>${log.success !== undefined ? (log.success ? '成功' : '失败') : '-'}</td>
        `;
        tbody.appendChild(row);
    });
}

// 修改renderLogsTable函数确保按API返回的顺序显示
/* function renderLogsTable(logs) {
    const tbody = document.querySelector('#logs-table tbody');
    tbody.innerHTML = '';
    
    // 直接按API返回的顺序渲染(已经是倒序)
    logs.forEach(log => {
        const row = document.createElement('tr');
        if (log.actionType === '用户登录') {
            row.classList.add(log.success ? 'login-success' : 'login-fail');
        }
        
        row.innerHTML = `
            <td>${new Date(log.timestamp).toLocaleString()}</td>
            <td>${log.username}</td>
            <td>${log.ip || 'N/A'}</td>
            <td>${log.actionType}</td>
            <td>${log.details}</td>
            <td>${log.success !== undefined ? (log.success ? '成功' : '失败') : '-'}</td>
        `;
        tbody.appendChild(row);
    });
} */

// 清理旧日志
async function cleanOldLogs() {
    if (!confirm('确定要清理3个月前的日志吗？此操作不可恢复。')) return;
    
    try {
        const response = await fetch('/api/logs/clean', {
            method: 'POST'
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || '清理日志失败');
        }
        
        await loadLogs();
        alert('日志清理成功');
    } catch (error) {
        console.error('清理日志失败:', error);
        alert('清理日志失败: ' + error.message);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    // 先验证权限再加载内容
    try {
        // 1. 检查登录状态
        const authResponse = await fetch('/api/current-user');
        if (!authResponse.ok) {
            window.location.href = '/login.html';
            return;
        }
        
        const { user } = await authResponse.json();
        
        // 2. 检查是否是超级管理员
        if (!user || !user.isSystem) {
            // 非超级管理员重定向到首页并显示提示
            alert('无权访问: 仅超级管理员可查看系统日志');
            window.location.href = '/translate.html';
            return;
        }
        
        // 3. 通过验证后加载日志
        await loadLogs();
        await checkAndUpdateUI();
        
    } catch (error) {
        console.error('初始化失败:', error);
        window.location.href = '/login.html';
    }


    // 检查登录状态
    async function checkAuth() {
        try {
            const response = await fetch('/api/current-user');
            if (!response.ok) {
                window.location.href = '/login.html';
                return false;
            }
            
            const { user } = await response.json();
            document.getElementById('username').textContent = user.username;
            return true;
        } catch (error) {
            window.location.href = '/login.html';
            return false;
        }
    }

    // 初始化检查
    const isAuthenticated = await checkAuth();
    if (isAuthenticated) {
        await loadLogs();
        await checkAndUpdateUI();
    }

    // 事件监听 - 注销按钮
    document.getElementById('logout-btn').addEventListener('click', async () => {
        try {
            const response = await fetch('/api/logout', { 
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                window.location.href = '/login.html';
            } else {
                throw new Error('注销失败');
            }
        } catch (error) {
            console.error('注销错误:', error);
            alert('注销失败: ' + error.message);
        }
    });

    // 事件监听 - 返回翻译按钮
    document.getElementById('translate-btn').addEventListener('click', () => {
        window.location.href = '/translate.html';
    });

    // 事件监听 - 清理日志按钮
    document.getElementById('clean-logs-btn').addEventListener('click', cleanOldLogs);
});

// 检查用户权限并更新UI
async function checkAndUpdateUI() {
    try {
        const response = await fetch('/api/current-user');
        if (!response.ok) return;
        
        const { user } = await response.json();
        const roleHint = document.getElementById('user-role-hint');
        
        if (user.role === 'admin') {
            document.body.classList.add('admin-mode');
            roleHint.textContent = '管理员模式';
            roleHint.classList.add('role-admin');
        } else {
            document.body.classList.remove('admin-mode');
            roleHint.textContent = '普通用户模式';
            roleHint.classList.add('role-user');
        }
    } catch (error) {
        console.error('权限检查失败:', error);
    }
}