// 加载用户数据
async function loadUsers() {
    try {
        const response = await fetch('/api/users');
        if (!response.ok) throw new Error('加载用户失败');
        
        const users = await response.json();
        renderUserTable(users);
    } catch (error) {
        console.error('加载用户失败:', error);
        alert('加载用户失败: ' + error.message);
    }
}

// 渲染用户表格
function renderUserTable(users) {
    const tbody = document.querySelector('#user-table tbody');
    tbody.innerHTML = '';
    
    // 过滤掉系统超级账户
    const filteredUsers = users.filter(user => !user.isSystem);

    filteredUsers.forEach((user, index) => {
        const row = document.createElement('tr');
        row.dataset.id = user.id;
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${user.username}</td>
            <td>${user.role === 'admin' ? '管理员' : '普通用户'}</td>
            <td>
                <button class="edit-user-btn admin-only" data-id="${user.id}">编辑</button>
                <button class="delete-user-btn admin-only" data-id="${user.id}">删除</button>
                <button class="save-user-btn admin-only" data-id="${user.id}" style="display:none;">保存</button>
                <button class="cancel-user-btn admin-only" data-id="${user.id}" style="display:none;">取消</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// 添加用户
async function addUser(username, password, role) {
    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                username, 
                password,
                secretKey: role === 'admin' ? 'ADMIN_SECRET_KEY' : ''
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || '添加用户失败');
        }
        
        // 刷新用户列表
        await loadUsers();
        alert('用户添加成功');
    } catch (error) {
        console.error('添加用户失败:', error);
        alert('添加用户失败: ' + error.message);
    }
}

// 
// 更新用户
async function updateUser(id, username, password, role) {
    try {
        // 先获取当前用户列表和当前登录用户信息
        const [usersResponse, currentUserResponse] = await Promise.all([
            fetch('/api/users'),
            fetch('/api/current-user')
        ]);
        
        if (!usersResponse.ok) throw new Error('获取用户列表失败');
        if (!currentUserResponse.ok) throw new Error('获取当前用户信息失败');
        
        const users = await usersResponse.json();
        const { user: currentUser } = await currentUserResponse.json();
        
        // 检查是否是修改自己的账户
        if (parseInt(id) === currentUser.id) {
            // 检查是否在修改自己的角色
            if (role !== currentUser.role) {
                alert('不能修改自己的角色');
                return;
            }
            
            // 检查是否在修改自己的用户名
            const originalUser = users.find(u => u.id === parseInt(id));
            if (username !== originalUser.username) {
                alert('不能修改自己的用户名');
                return;
            }
        }
        
        // 检查是否是最后一个管理员被降级
        const currentUserData = users.find(u => u.id === parseInt(id));
        if (currentUserData.role === 'admin' && role === 'user') {
            const otherAdmins = users.filter(u => u.role === 'admin' && u.id !== parseInt(id));
            if (otherAdmins.length === 0) {
                alert('系统中必须至少保留一个管理员账户');
                return;
            }
        }
        
        // 构建更新数据对象
        const updateData = { username, role };
        // 只有密码不为空时才包含密码字段
        if (password && password.trim() !== '') {
            updateData.password = password;
        }
        
        const response = await fetch(`/api/users/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || '更新用户失败');
        }
        
        // 刷新用户列表
        await loadUsers();
        alert('用户更新成功');
    } catch (error) {
        console.error('更新用户失败:', error);
        alert('更新用户失败: ' + error.message);
        throw error; // 重新抛出错误以便上层处理
    }
}


// 删除用户
async function deleteUser(id) {
    if (!confirm('确定要删除这个用户吗？')) return;
    
    try {
        const response = await fetch(`/api/users/${id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || '删除用户失败');
        }
        
        // 刷新用户列表
        await loadUsers();
    } catch (error) {
        console.error('删除用户失败:', error);
        alert('删除用户失败: ' + error.message);
    }
}

// 检查用户权限并更新UI
/* async function checkAndUpdateUI() {
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
} */

/* async function checkAndUpdateUI() {
    try {
        const response = await fetch('/api/current-user');
        if (!response.ok) return;
        
        const { user } = await response.json();
        const roleHint = document.getElementById('user-role-hint');
        
        if (user.role === 'admin') {
            document.body.classList.add('admin-mode');
            roleHint.textContent = '管理员模式';
            roleHint.classList.add('role-admin');
            
            // 如果是超级管理员，添加super-mode类
            if (user.isSystem) {
                document.body.classList.add('super-mode');
                roleHint.textContent = '超级管理员模式';
            }
        } else {
            document.body.classList.remove('admin-mode');
            document.body.classList.remove('super-mode');
            roleHint.textContent = '普通用户模式';
            roleHint.classList.add('role-user');
        }
    } catch (error) {
        console.error('权限检查失败:', error);
    }
} */

// 检查用户权限并更新UI
async function checkAndUpdateUI() {
    try {
        const response = await fetch('/api/current-user');
        if (!response.ok) return;
        
        const { user } = await response.json();
        const roleHint = document.getElementById('user-role-hint');
        
        // 清除所有可能的类
        document.body.classList.remove('admin-mode', 'super-mode');
        roleHint.classList.remove('role-admin', 'role-user');
        
        if (user.role === 'admin') {
            document.body.classList.add('admin-mode');
            roleHint.classList.add('role-admin');
            
            if (user.isSystem) {
                document.body.classList.add('super-mode');
                roleHint.textContent = '超级管理员模式';
            } else {
                roleHint.textContent = '管理员模式';
            }
        } else {
            roleHint.textContent = '普通用户模式';
            roleHint.classList.add('role-user');
        }
    } catch (error) {
        console.error('权限检查失败:', error);
    }
}


// 导出用户数据
/* async function exportUsers() {
    const exportBtn = document.getElementById('export-users-btn');
    if (!exportBtn) {
        console.error('错误：导出按钮未找到');
        return;
    }

    // 保存并禁用按钮状态
    const originalText = exportBtn.textContent;
    exportBtn.disabled = true;
    exportBtn.textContent = '准备导出...';

    try {
        // 添加请求超时
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        const response = await fetch('/api/users/export', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            signal: controller.signal
        });
        clearTimeout(timeout);

        // 处理HTTP错误
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            let errorMessage = '导出失败';
            
            if (response.status === 404) {
                errorMessage = '后端导出功能未配置';
            } else if (response.status === 403) {
                errorMessage = '权限不足：需要超级管理员权限';
            }
            
            throw new Error(`${errorMessage} (状态码: ${response.status})`);
        }

        // 处理响应数据
        const data = await response.json();
        if (!Array.isArray(data)) {
            throw new Error('无效的响应数据格式');
        }

        // 创建下载
        const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: 'application/json;charset=utf-8'
        });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `用户数据_${new Date().toLocaleDateString('zh-CN')}.json`;
        document.body.appendChild(a);
        a.click();
        
        // 延迟清理
        setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            exportBtn.textContent = '导出成功！';
            setTimeout(() => exportBtn.textContent = originalText, 2000);
        }, 100);

    } catch (error) {
        console.error('导出过程中出错:', error);
        
        // 用户友好提示
        let userMessage = error.message;
        if (error.name === 'AbortError') {
            userMessage = '请求超时，请检查网络连接';
        }
        
        alert(`⚠️ ${userMessage}\n\n如需帮助，请联系系统管理员。`);
        exportBtn.textContent = '导出失败';
        setTimeout(() => exportBtn.textContent = originalText, 2000);
        
    } finally {
        exportBtn.disabled = false;
    }
} */

async function exportUsers() {
    const exportBtn = document.getElementById('export-users-btn');
    if (!exportBtn) {
        console.error('错误：导出按钮未找到');
        return;
    }

    // 保存并禁用按钮状态
    const originalText = exportBtn.textContent;
    exportBtn.disabled = true;
    exportBtn.textContent = '准备导出...';

    try {
        // 添加请求超时
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        const response = await fetch('/api/users/export', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            signal: controller.signal
        });
        clearTimeout(timeout);

        // 处理HTTP错误
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            let errorMessage = '导出失败';
            
            if (response.status === 404) {
                errorMessage = '后端导出功能未配置';
            } else if (response.status === 403) {
                errorMessage = '权限不足：需要超级管理员权限';
            }
            
            throw new Error(`${errorMessage} (状态码: ${response.status})`);
        }

        // 处理响应数据
        const data = await response.json();
        if (!Array.isArray(data)) {
            throw new Error('无效的响应数据格式');
        }

        // 添加格式选择，如果用户取消则直接返回
        const format = prompt('请选择导出格式 (输入 "json" 或 "csv"):\n(取消将中止导出操作)', 'csv')?.toLowerCase();
        
        // 如果用户点击取消或关闭提示框，format 将为 null 或 undefined
        if (format === null || format === undefined) {
            exportBtn.textContent = '导出已取消';
            setTimeout(() => exportBtn.textContent = originalText, 2000);
            return; // 直接返回，不执行后续导出操作
        }
        
        // 检查用户输入的有效性
        if (format !== 'json' && format !== 'csv') {
            alert('无效的格式选择，请输入 "json" 或 "csv"');
            exportBtn.textContent = '导出已取消';
            setTimeout(() => exportBtn.textContent = originalText, 2000);
            return;
        }

        if (format === 'csv') {
            // 转换为CSV格式
            const csvContent = convertToCSV(data);
            const blob = new Blob([csvContent], {
                type: 'text/csv;charset=utf-8'
            });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `用户数据_${new Date().toLocaleDateString('zh-CN')}.csv`;
            document.body.appendChild(a);
            a.click();
            
            // 延迟清理
            setTimeout(() => {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                exportBtn.textContent = '导出成功！';
                setTimeout(() => exportBtn.textContent = originalText, 2000);
            }, 100);
        } else {
            // JSON格式
            const blob = new Blob([JSON.stringify(data, null, 2)], {
                type: 'application/json;charset=utf-8'
            });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `用户数据_${new Date().toLocaleDateString('zh-CN')}.json`;
            document.body.appendChild(a);
            a.click();
            
            // 延迟清理
            setTimeout(() => {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                exportBtn.textContent = '导出成功！';
                setTimeout(() => exportBtn.textContent = originalText, 2000);
            }, 100);
        }

    } catch (error) {
        console.error('导出过程中出错:', error);
        
        // 用户友好提示
        let userMessage = error.message;
        if (error.name === 'AbortError') {
            userMessage = '请求超时，请检查网络连接';
        }
        
        alert(`⚠️ ${userMessage}\n\n如需帮助，请联系系统管理员。`);
        exportBtn.textContent = '导出失败';
        setTimeout(() => exportBtn.textContent = originalText, 2000);
        
    } finally {
        exportBtn.disabled = false;
    }
}

// 辅助函数：将数据转换为CSV格式
function convertToCSV(data) {
    if (!data || data.length === 0) return '';
    
    // 获取所有可能的字段
    const fields = new Set();
    data.forEach(item => {
        Object.keys(item).forEach(key => fields.add(key));
    });
    
    const headers = Array.from(fields).join(',');
    const rows = data.map(item => {
        return Array.from(fields).map(field => {
            // 处理字段值中的逗号和引号
            let value = item[field] || '';
            if (typeof value === 'string') {
                if (value.includes(',') || value.includes('"')) {
                    value = `"${value.replace(/"/g, '""')}"`;
                }
            }
            return value;
        }).join(',');
    });
    
    return [headers, ...rows].join('\n');
}


// 导入用户数据
/* async function importUsers(file, overwrite) {
    const importBtn = document.querySelector('#import-user-form button[type="submit"]');
    const originalText = importBtn.textContent;
    importBtn.disabled = true;
    importBtn.textContent = '正在导入...';
    
    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('overwrite', overwrite);
        
        const response = await fetch('/api/users/import', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || '导入用户失败');
        }
        
        const result = await response.json();
        
        let message = `成功导入 ${result.imported} 个用户，跳过 ${result.skipped} 个现有用户`;
        if (result.errors && result.errors.length > 0) {
            message += `\n\n遇到 ${result.errors.length} 个错误:\n${result.errors.slice(0, 3).join('\n')}`;
            if (result.errors.length > 3) {
                message += `\n...还有 ${result.errors.length - 3} 个错误未显示`;
            }
            console.error('导入过程中部分错误:', result.errors);
        }
        
        alert(message);
        
        // 刷新用户列表
        await loadUsers();
        document.getElementById('import-user-modal').classList.add('hidden');
        
    } catch (error) {
        console.error('导入用户失败:', error);
        
        let userMessage = error.message;
        if (error.message.includes('JSON解析失败')) {
            userMessage = '文件格式错误: 请确保上传的是有效的JSON文件';
        } else if (error.message.includes('不支持的文件格式')) {
            userMessage = '只支持JSON或CSV文件';
        }
        
        alert(`导入用户失败: ${userMessage}\n\n如需帮助，请联系管理员。`);
    } finally {
        importBtn.disabled = false;
        importBtn.textContent = originalText;
    }
} */

async function importUsers(file, overwrite) {
    const importBtn = document.querySelector('#import-user-form button[type="submit"]');
    const originalText = importBtn.textContent;
    importBtn.disabled = true;
    importBtn.textContent = '正在导入...';
    
    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('overwrite', overwrite);
        
        const response = await fetch('/api/users/import', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || '导入用户失败');
        }
        
        const result = await response.json();
        
        let message = `成功导入 ${result.imported} 个用户，跳过 ${result.skipped} 个现有用户`;
        if (result.errors && result.errors.length > 0) {
            message += `\n\n遇到 ${result.errors.length} 个错误:\n${result.errors.slice(0, 3).join('\n')}`;
            if (result.errors.length > 3) {
                message += `\n...还有 ${result.errors.length - 3} 个错误未显示`;
            }
            console.error('导入过程中部分错误:', result.errors);
        }
        
        alert(message);
        
        // 刷新用户列表
        await loadUsers();
        document.getElementById('import-user-modal').classList.add('hidden');
        
    } catch (error) {
        console.error('导入用户失败:', error);
        
        let userMessage = error.message;
        if (error.message.includes('JSON解析失败')) {
            userMessage = '文件格式错误: 请确保上传的是有效的JSON文件';
        } else if (error.message.includes('CSV解析失败')) {
            userMessage = '文件格式错误: 请确保上传的是有效的CSV文件';
        } else if (error.message.includes('不支持的文件格式')) {
            userMessage = '只支持JSON或CSV文件';
        }
        
        alert(`导入用户失败: ${userMessage}\n\n如需帮助，请联系管理员。`);
    } finally {
        importBtn.disabled = false;
        importBtn.textContent = originalText;
    }
}


document.addEventListener('DOMContentLoaded', async () => {
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
        await loadUsers();
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

    // 添加用户按钮
    document.getElementById('add-user-btn').addEventListener('click', () => {
        document.getElementById('add-user-modal').classList.remove('hidden');
    });

    // 关闭模态框
    document.querySelector('.close-btn').addEventListener('click', () => {
        document.getElementById('add-user-modal').classList.add('hidden');
    });

    // 点击模态框外部关闭
    window.addEventListener('click', (e) => {
        if (e.target === document.getElementById('add-user-modal')) {
            document.getElementById('add-user-modal').classList.add('hidden');
        }
    });

    // 添加用户表单提交
    document.getElementById('add-user-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('new-username').value.trim();
        const password = document.getElementById('new-password').value.trim();
        const role = document.getElementById('user-role').value;
        
        if (!username || !password) {
            alert('用户名和密码不能为空');
            return;
        }
        
        await addUser(username, password, role);
        document.getElementById('add-user-modal').classList.add('hidden');
        document.getElementById('add-user-form').reset();
    });

    // 用户表格事件委托
    document.getElementById('user-table').addEventListener('click', async (e) => {
        const id = e.target.dataset.id;
        const row = e.target.closest('tr');
        
        // 编辑用户
        if (e.target.classList.contains('edit-user-btn')) {
            const cells = row.cells;
            
            // 保存原始值
            row.dataset.originalUsername = cells[1].textContent;
            row.dataset.originalRole = cells[2].textContent === '管理员' ? 'admin' : 'user';
            
            // 转换为输入框
            cells[1].innerHTML = `<input type="text" class="edit-username" value="${cells[1].textContent}">`;
            cells[2].innerHTML = `
                <select class="edit-role">
                    <option value="user" ${cells[2].textContent === '普通用户' ? 'selected' : ''}>普通用户</option>
                    <option value="admin" ${cells[2].textContent === '管理员' ? 'selected' : ''}>管理员</option>
                </select>
            `;
            
            // 切换按钮显示
            e.target.classList.add('hidden');
            row.querySelector('.save-user-btn').classList.remove('hidden');
            row.querySelector('.cancel-user-btn').classList.remove('hidden');
        }
        
        // 保存用户
        /* if (e.target.classList.contains('save-user-btn')) {
            const username = row.querySelector('.edit-username').value.trim();
            const role = row.querySelector('.edit-role').value;
            const password = prompt('请输入新密码（留空则保持不变）:');
            
            if (username) {
                await updateUser(id, username, password, role);
            } else {
                alert('用户名不能为空');
            }
        } */
        // 保存用户：
        if (e.target.classList.contains('save-user-btn')) {
            const username = row.querySelector('.edit-username').value.trim();
            const role = row.querySelector('.edit-role').value;
            
            try {
                // 先验证用户名
                if (!username) {
                    alert('用户名不能为空');
                    return;
                }
                
                // 弹出密码输入框
                let password = prompt('请输入新密码（留空则保持不变）:');
                
                // 如果用户点击取消，恢复原始状态
                if (password === null) {
                    const cells = row.cells;
                    cells[1].textContent = row.dataset.originalUsername;
                    cells[2].textContent = row.dataset.originalRole === 'admin' ? '管理员' : '普通用户';
                    
                    // 切换按钮显示
                    row.querySelector('.edit-user-btn').classList.remove('hidden');
                    row.querySelector('.delete-user-btn').classList.remove('hidden');
                    row.querySelector('.save-user-btn').classList.add('hidden');
                    row.querySelector('.cancel-user-btn').classList.add('hidden');
                    return;
                }
                
                // 调用更新用户函数
                await updateUser(id, username, password, role);
                
            } catch (error) {
                // 如果更新失败，恢复原始状态
                const cells = row.cells;
                cells[1].textContent = row.dataset.originalUsername;
                cells[2].textContent = row.dataset.originalRole === 'admin' ? '管理员' : '普通用户';
                
                // 切换按钮显示
                row.querySelector('.edit-user-btn').classList.remove('hidden');
                row.querySelector('.delete-user-btn').classList.remove('hidden');
                row.querySelector('.save-user-btn').classList.add('hidden');
                row.querySelector('.cancel-user-btn').classList.add('hidden');
            }
        }
        
        // 取消编辑
        if (e.target.classList.contains('cancel-user-btn')) {
            const cells = row.cells;
            cells[1].textContent = row.dataset.originalUsername;
            cells[2].textContent = row.dataset.originalRole === 'admin' ? '管理员' : '普通用户';
            
            // 切换按钮显示
            row.querySelector('.edit-user-btn').classList.remove('hidden');
            row.querySelector('.save-user-btn').classList.add('hidden');
            e.target.classList.add('hidden');
        }
        
        // 删除用户
        if (e.target.classList.contains('delete-user-btn')) {
            await deleteUser(id);
        }
    });


    //
    //
    //
    // 导出用户按钮事件
    document.getElementById('export-users-btn').addEventListener('click', exportUsers);
    
    // 导入用户按钮事件
    document.getElementById('import-users-btn').addEventListener('click', () => {
        document.getElementById('import-user-modal').classList.remove('hidden');
    });
    
    // 关闭模态框
    document.querySelector('#import-user-modal .close-btn').addEventListener('click', () => {
        document.getElementById('import-user-modal').classList.add('hidden');
    });
    
    // 点击模态框外部关闭
    window.addEventListener('click', (e) => {
        if (e.target === document.getElementById('import-user-modal')) {
            document.getElementById('import-user-modal').classList.add('hidden');
        }
    });
    
    // 导入表单提交
    document.getElementById('import-user-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fileInput = document.getElementById('user-file');
        const overwrite = document.getElementById('overwrite-existing').checked;
        
        if (fileInput.files.length > 0) {
            await importUsers(fileInput.files[0], overwrite);
        } else {
            alert('请选择要导入的文件');
        }
    });
});