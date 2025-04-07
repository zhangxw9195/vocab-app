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

    // 搜索词汇
    async function searchVocab(query) {
        const searchInput = document.getElementById('search-input').value.trim();
        const resultContainer = document.getElementById('search-results');
        // 清空之前的结果
        resultContainer.classList.remove('visible');

        // 检查输入是否为空
        if (!searchInput) {
            return; // 不执行查询
        }
        
        try {          
            const response = await fetch('/api/vocab');
            if (!response.ok) throw new Error('搜索失败');
            
            const vocab = await response.json();
            const filtered = vocab.filter(item => 
                item.word.toLowerCase().includes(query.toLowerCase()) || 
                item.definition.toLowerCase().includes(query.toLowerCase())
            );
            
            const tbody = document.querySelector('#result-table tbody');
            tbody.innerHTML = '';
            
            filtered.forEach(item => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${item.word}</td>
                    <td>${item.definition}</td>
                `;
                tbody.appendChild(row);
            });

            // 显示结果区域
            resultContainer.classList.add('visible');
        } catch (error) {
            console.error('搜索失败:', error);

            // 无结果时不显示区域
            resultContainer.classList.remove('visible');
        }
    }

    // 初始化检查
    const isAuthenticated = await checkAuth();
    if (isAuthenticated) {
        searchVocab('');
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

    // 事件监听 - 管理按钮
    document.getElementById('manage-btn').addEventListener('click', () => {
        window.location.href = '/index.html';
    });

    // 事件监听 - 搜索按钮
    document.getElementById('search-btn').addEventListener('click', () => {
        const query = document.getElementById('search-input').value.trim();
        searchVocab(query);
    });

    // 事件监听 - 回车搜索
    document.getElementById('search-input').addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            const query = document.getElementById('search-input').value.trim();
            searchVocab(query);
        }
    });
});



// 检查用户权限并更新UI
async function checkAndUpdateUI() {
    try {
        const response = await fetch('/api/current-user');
        if (!response.ok) return;
        
        const { user } = await response.json();
        const roleHint = document.getElementById('user-role-hint');
        
        if (user.role === 'admin') {
            // 添加admin-mode类到body
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

// 页面加载时执行
document.addEventListener('DOMContentLoaded', checkAndUpdateUI);