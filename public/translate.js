// 在登录成功处理中添加登录计数显示
function handleLoginSuccess(data) {
    // 保存用户数据和登录计数
    localStorage.setItem('token', data.token);
    localStorage.setItem('userData', JSON.stringify({
        ...data.user,
        loginCount: data.loginCount
    }));
    
    // 更新UI
    updateUserInfo();
}

// 添加更新用户信息的函数
function updateUserInfo() {
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const usernameElement = document.getElementById('username');
    const loginCountElement = document.getElementById('login-count');
    
    if (usernameElement) {
        usernameElement.textContent = userData.username || '';
    }
    
    if (loginCountElement && userData.loginCount) {
        loginCountElement.textContent = `您是第 ${userData.loginCount} 位登录用户`;
    }
}

// 在页面加载时调用
/* document.addEventListener('DOMContentLoaded', function() {
    updateUserInfo();
    // ...其他初始化代码...
}); */


document.addEventListener('DOMContentLoaded', async () => {
    updateUserInfo();

    // 检查登录状态
    /* async function checkAuth() {
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
    } */

    async function checkAuth() {
        try {
            const response = await fetch('/api/current-user');
            if (!response.ok) {
                window.location.href = '/login.html';
                return false;
            }
            
            const { user, loginCount } = await response.json();
            document.getElementById('username').textContent = user.username;
            
            // 更新登录计数
            if (loginCount) {
                document.getElementById('login-count').textContent = `您是第 ${loginCount} 位登录用户`;
            }
            
            return true;
        } catch (error) {
            window.location.href = '/login.html';
            return false;
        }
    }

    // 搜索词汇
    /* async function searchVocab(query) {
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
    } */

    //20250415
    // 通用的Base64解码函数（解决中文乱码）
    /* function safeBase64Decode(encodedStr) {
        try {
            // 将Base64转换为Buffer再转为UTF-8字符串
            const buff = Buffer.from(encodedStr, 'base64');
            return JSON.parse(buff.toString('utf8'));
        } catch (e) {
            console.error('解码失败:', e);
            return [];
        }
    } */

    // 浏览器兼容的Base64解码函数
    function safeBase64Decode(encodedStr) {
        try {
            // 浏览器环境使用atob + TextDecoder
            const binaryStr = atob(encodedStr);
            
            // 方法1：使用TextDecoder（现代浏览器）
            if (typeof TextDecoder !== 'undefined') {
                const bytes = new Uint8Array(binaryStr.length);
                for (let i = 0; i < binaryStr.length; i++) {
                    bytes[i] = binaryStr.charCodeAt(i);
                }
                return JSON.parse(new TextDecoder('utf-8').decode(bytes));
            }
            
            // 方法2：兼容旧浏览器的方案
            const decodedStr = decodeURIComponent(escape(binaryStr));
            return JSON.parse(decodedStr);
        } catch (e) {
            console.error('解码失败:', e);
            return []; // 返回空数组避免页面崩溃
        }
    }

    async function searchVocab(query) {
        const searchInput = document.getElementById('search-input').value.trim();
        const resultContainer = document.getElementById('search-results');
        resultContainer.classList.remove('visible');
    
        if (!searchInput) return;
    
        try {
            const response = await fetch('/api/vocab');
            if (!response.ok) throw new Error('搜索失败');
            
            const result = await response.json();
            
            // 解码处理
            //const vocabData = result.encoded ? JSON.parse(atob(result.data)) : result.data;
            const vocabData = result.encoded ? safeBase64Decode(result.data) : result.data;
            
            const filtered = vocabData.filter(item => 
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
    
            resultContainer.classList.add('visible');
        } catch (error) {
            console.error('搜索失败:', error);
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