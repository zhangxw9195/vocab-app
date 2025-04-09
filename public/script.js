// 在 script.js 顶部添加以下函数定义
function initAdminFeatures() {
    console.log("初始化管理员专属功能");
    
    // 1. 启用高级功能按钮
    document.querySelectorAll('.admin-feature').forEach(btn => {
        btn.disabled = false;
        btn.classList.add('active');
    });
    
    // 2. 显示管理员控制面板
    const adminPanel = document.getElementById('admin-panel');
    if (adminPanel) adminPanel.style.display = 'block';
    
    // 3. 设置特殊权限
    window.isAdmin = true;
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

    // 加载词汇列表
    async function loadVocab() {
        try {
            const response = await fetch('/api/vocab');
            if (!response.ok) throw new Error('加载失败');
            
            const vocab = await response.json();
            const tbody = document.querySelector('#vocab-table tbody');
            tbody.innerHTML = '';
            
            vocab.forEach(item => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${item.id}</td>
                    <td>${item.word}</td>
                    <td>${item.definition}</td>
                    <td>${item.createdBy}</td>
                    <td>${new Date(item.createdAt).toLocaleString()}</td>
                    <td>
                        <button class="edit-btn admin-only" data-id="${item.id}">编辑</button>
                        <button class="save-btn admin-only" data-id="${item.id}" style="display:none;">保存</button>
                        <button class="cancel-btn admin-only" data-id="${item.id}" style="display:none;">取消</button>
                        <button class="delete-btn admin-only" data-id="${item.id}">删除</button>
                    </td>
                `;
                tbody.appendChild(row);
            });
            // 确保在加载完成后应用权限控制
            async function initPage() {
                const isAdmin = await checkPermissions();
                if (isAdmin) {
                    document.body.classList.add('admin-mode');
                }
                await loadVocab();
            }
        } catch (error) {
            console.error('加载词汇失败:', error);
            alert('加载词汇失败: ' + error.message);
        }
    }

    // 初始化检查
    const isAuthenticated = await checkAuth();
    if (isAuthenticated) {
        await loadVocab();
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

    // [保持其他事件监听代码不变]
    document.getElementById('add-vocab-btn').addEventListener('click', () => {
        document.getElementById('add-vocab-modal').classList.remove('hidden');
    });

    document.querySelector('.close-btn').addEventListener('click', () => {
        document.getElementById('add-vocab-modal').classList.add('hidden');
    });

    window.addEventListener('click', (e) => {
        if (e.target === document.getElementById('add-vocab-modal')) {
            document.getElementById('add-vocab-modal').classList.add('hidden');
        }
    });

    document.getElementById('add-vocab-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const word = document.getElementById('word').value.trim();
        const definition = document.getElementById('definition').value.trim();

        if (!word || !definition) {
            alert('单词和释义不能为空');
            return;
        }

        try {
            const response = await fetch('/api/vocab', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ word, definition })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || '添加失败');
            }
            
            document.getElementById('add-vocab-modal').classList.add('hidden');
            document.getElementById('add-vocab-form').reset();
            await loadVocab();
        } catch (error) {
            alert('添加失败: ' + error.message);
        }
    });

    document.getElementById('export-btn').addEventListener('click', async () => {
        try {
            const response = await fetch('/api/vocab/export');
            if (!response.ok) throw new Error('导出失败');
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'vocab-export.csv';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
        } catch (error) {
            alert('导出失败: ' + error.message);
        }
    });

    document.getElementById('import-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fileInput = document.getElementById('import-file');
    const importBtn = document.querySelector('#import-form button[type="submit"]');
    
    if (fileInput.files.length === 0) {
        alert('请先选择CSV文件');
        return;
    }

    // 验证文件类型
    const file = fileInput.files[0];
    if (!file.name.endsWith('.csv')) {
        alert('请上传CSV格式的文件');
        return;
    }

    // 显示加载状态
    importBtn.disabled = true;
    importBtn.innerHTML = '<span class="spinner"></span> 导入中...';

    try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/vocab/import', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || '导入失败');
        }

        alert(`成功导入 ${result.imported} 条词汇`);
        fileInput.value = '';
        await loadVocab();
    } catch (error) {
        console.error('导入错误:', error);
        alert(`导入失败: ${error.message}`);
    } finally {
        importBtn.disabled = false;
        importBtn.textContent = '导入CSV';
    }
});

    document.getElementById('vocab-table').addEventListener('click', async (e) => {
        if (e.target.classList.contains('delete-btn')) {
            const id = e.target.dataset.id;
            if (confirm('确定要删除这个词汇吗？')) {
                try {
                    const response = await fetch(`/api/vocab/${id}`, { method: 'DELETE' });
                    if (!response.ok) throw new Error('删除失败');
                    await loadVocab();
                } catch (error) {
                    alert('删除失败: ' + error.message);
                }
            }
        }
    });


    // 在DOMContentLoaded事件监听器中添加以下代码

    // 编辑词汇功能
    document.getElementById('vocab-table').addEventListener('click', async (e) => {
        const id = e.target.dataset.id;
        
        // 处理编辑按钮点击
        if (e.target.classList.contains('edit-btn')) {
            const row = e.target.closest('tr');
            const cells = row.cells;

            // 添加编辑模式类
            row.classList.add('edit-mode');
            
            // 保存原始值
            row.dataset.originalWord = cells[1].textContent;
            row.dataset.originalDefinition = cells[2].textContent;
            
            // 转换为输入框
            cells[1].innerHTML = `<input type="text" class="edit-word" value="${cells[1].textContent}">`;
            cells[2].innerHTML = `<textarea class="edit-definition">${cells[2].textContent}</textarea>`;
            
            // 切换按钮显示
            e.target.classList.add('hidden');
            row.querySelector('.save-btn').classList.remove('hidden');
            row.querySelector('.cancel-btn').classList.remove('hidden');
        }

        // 保存/取消后退出编辑模式
        function exitEditMode(row) {
            // 移除编辑模式类
            row.classList.remove('edit-mode');
            
            // 如果是取消操作，恢复原始值
            if (row.dataset.originalWord) {
                const cells = row.cells;
                cells[1].textContent = row.dataset.originalWord;
                cells[2].textContent = row.dataset.originalDefinition;
            }
        }
        
        // 处理保存按钮点击
        if (e.target.classList.contains('save-btn')) {
            const row = e.target.closest('tr');
            const wordInput = row.querySelector('.edit-word');
            const definitionInput = row.querySelector('.edit-definition');
            
            try {
                const response = await fetch(`/api/vocab/${id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({
                        word: wordInput.value.trim(),
                        definition: definitionInput.value.trim()
                    })
                });
                
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.message || '更新失败');
                }
                
                // 更新表格显示
                const cells = row.cells;
                cells[1].textContent = wordInput.value.trim();
                cells[2].textContent = definitionInput.value.trim();
                
                // 切换按钮显示
                row.querySelector('.edit-btn').classList.remove('hidden');
                e.target.classList.add('hidden');
                row.querySelector('.cancel-btn').classList.add('hidden');
                
            } catch (error) {
                alert('更新失败: ' + error.message);
            }

            //exitEditMode(row);  //加上该句后，修改后的值未刷新显示
        }
        
        // 处理取消按钮点击
        if (e.target.classList.contains('cancel-btn')) {
            const row = e.target.closest('tr');
            const cells = row.cells;
            
            // 恢复原始值
            cells[1].textContent = row.dataset.originalWord;
            cells[2].textContent = row.dataset.originalDefinition;
            
            // 切换按钮显示
            row.querySelector('.edit-btn').classList.remove('hidden');
            row.querySelector('.save-btn').classList.add('hidden');
            e.target.classList.add('hidden');

            //exitEditMode(row);
        }
        
        // [保留原有的删除按钮处理代码]
        if (e.target.classList.contains('delete-btn')) {
            // ...原有删除逻辑...
        }
    });
});


// 在页面加载时检查权限
async function checkPermissions() {
    try {
        const response = await fetch('/api/current-user');
        if (!response.ok) return false;
        
        const { user } = await response.json();
        return user.role === 'admin';
    } catch (error) {
        console.error('权限检查失败:', error);
        return false;
    }
}

// 初始化页面时控制按钮显示
/*async function initPage() {
    const isAdmin = await checkPermissions();
    
    // 获取所有管理按钮
    const manageButtons = [
        'add-vocab-btn',    // 添加按钮
        'export-btn',       // 导出按钮
        'import-form',      // 导入表单
        'vocab-manage-tab'  // 词汇管理标签页
    ].map(id => document.getElementById(id));
    
    // 设置显示/隐藏
    manageButtons.forEach(btn => {
        if (btn) btn.style.display = isAdmin ? 'block' : 'none';
    });
    
    // 如果是普通用户，移除删除按钮
    if (!isAdmin) {
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.remove();
        });
    }
}*/


// 在initPage函数中添加
async function initPage() {
    const isAdmin = await checkPermissions();
    console.log('管理员状态:', isAdmin); // 调试输出
    
    // 显示/隐藏管理按钮
    document.querySelectorAll('.admin-only').forEach(el => {
        el.style.display = isAdmin ? 'inline-block' : 'none'; // 修改为inline-block
    });
    
    await loadVocab();
    await updateRoleHint();
}

// 页面加载完成后初始化
//document.addEventListener('DOMContentLoaded', initPage);

//更新用户角色提示
async function updateRoleHint() {
    try {
        const response = await fetch('/api/current-user');
        if (!response.ok) return;
        
        const { user } = await response.json();
        const hint = document.getElementById('user-role-hint');
        
        hint.textContent = user.role === 'admin' ? '管理员模式' : '普通用户模式';
        hint.className = user.role === 'admin' ? 'role-admin' : 'role-user';
    } catch (error) {
        console.error('更新角色提示失败:', error);
    }
}

// 在initPage中调用
/*async function initPage() {
    // ...原有代码...
    await updateRoleHint();
}*/
// 修改initPage函数
/*async function initPage() {
    const isAdmin = await checkPermissions();
    console.log('管理员状态:', isAdmin);
    
    if (isAdmin) {
        document.body.classList.add('admin-mode');
        // 确保初始只显示编辑和删除按钮
        document.querySelectorAll('.edit-btn, .delete-btn').forEach(btn => {
            btn.style.display = 'inline-block';
        });
    }
    
    await loadVocab();
    await updateRoleHint();
}*/

// 将loadVocab移到最外层
async function loadVocab() {
    try {
        const response = await fetch('/api/vocab');
        if (!response.ok) throw new Error('加载失败');
        
        const vocab = await response.json();
        const tbody = document.querySelector('#vocab-table tbody');
        tbody.innerHTML = '';
        
        vocab.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.id}</td>
                <td>${item.word}</td>
                <td>${item.definition}</td>
                <td>${item.createdBy}</td>
                <td>${new Date(item.createdAt).toLocaleString()}</td>
                <td>
                    <button class="edit-btn admin-only" data-id="${item.id}">编辑</button>
                    <button class="save-btn admin-only" data-id="${item.id}" style="display:none">保存</button>
                    <button class="cancel-btn admin-only" data-id="${item.id}" style="display:none">取消</button>
                    <button class="delete-btn admin-only" data-id="${item.id}">删除</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('加载词汇失败:', error);
        alert('加载词汇失败: ' + error.message);
    }
}

// 修改initPage函数
async function initPage() {
    const isAdmin = await checkPermissions();
    console.log('管理员状态:', isAdmin);
    
    if (isAdmin) {
        document.body.classList.add('admin-mode');
        // 只显示特定的管理元素
        ['add-vocab-btn', 'export-btn', 'import-form'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.style.display = 'block';
                console.log('显示元素:', id);
            }
        });
    }
    
    await loadVocab();
    await updateRoleHint();
}


// 修改后的权限检查函数
async function checkAndUpdateUI() {
  try {
    const response = await fetch('/api/current-user');
    if (!response.ok) throw new Error('获取用户信息失败');
    
    const { user } = await response.json();
    console.log('当前用户信息:', user); // 调试输出
    
    const isAdmin = user?.role === 'admin';
    
    // 显示/隐藏管理按钮
    document.querySelectorAll('.admin-only').forEach(el => {
      el.style.display = isAdmin ? 'block' : 'none';
    });
    
    // 更新角色提示
    const roleHint = document.getElementById('user-role-hint');
    if (roleHint) {
      roleHint.textContent = isAdmin ? '管理员模式' : '普通用户模式';
      roleHint.className = isAdmin ? 'role-hint admin-hint' : 'role-hint user-hint';
    }
    
    return isAdmin;
  } catch (error) {
    console.error('权限检查错误:', error);
    return false;
  }
}

// 在页面加载时调用
document.addEventListener('DOMContentLoaded', async () => {
  const isAdmin = await checkAndUpdateUI();
  console.log('是否是管理员:', isAdmin); // 调试输出
  
  if (isAdmin) {
    // 初始化管理相关的事件监听
    initAdminFeatures();
  }
});


async function updateUIForAdmin() {
  try {
    const response = await fetch('/api/current-user');
    const { user } = await response.json();
    
    console.log('当前用户:', user); // 调试输出
    
    if (user?.role === 'admin') {
      // 显示所有管理相关元素
      document.querySelectorAll('.admin-only').forEach(el => {
        el.style.display = 'block';
        console.log('显示元素:', el.id); // 调试输出
      });
      
      // 添加管理员样式
      document.body.classList.add('admin-mode');
    }
  } catch (error) {
    console.error('权限检查错误:', error);
  }
}



// 在DOMContentLoaded事件监听器中添加
// 全部删除功能 (增强版)
document.getElementById('delete-all-btn').addEventListener('click', async function() {
    // 双重确认
    const confirm1 = confirm('⚠️ 警告：这将永久删除所有词汇！建议删除之前先导出备份！');
    if (!confirm1) return;
    
    const confirm2 = prompt('请输入"CONFIRM DELETE ALL"确认操作:');
    if (confirm2 !== 'CONFIRM DELETE ALL') {
        alert('操作已取消');
        return;
    }
    
    // 显示加载状态
    const btn = this;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> 删除中...';
    
    try {
        /* const response = await fetch('/api/vocab/all', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}` // 如果使用token认证
            },
            credentials: 'include' // 确保发送session cookie
        }); */

        //const response = await fetch(`/api/vocab/all`, { method: 'DELETE' });

        // 前端
        const response = await fetch('/api/vocab/clear-all', { method: 'POST' });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || '删除失败');
        }
        
        // 刷新列表
        await loadVocab();
        alert('✅ 所有词汇已成功删除');
    } catch (error) {
        console.error('删除失败详情:', error);
        alert(`删除失败: ${error.message}`);
    } finally {
        // 恢复按钮状态
        btn.disabled = false;
        btn.textContent = '全部删除';
    }
});


// 页面加载和登录后都调用
document.addEventListener('DOMContentLoaded', updateUIForAdmin);

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', initPage);

