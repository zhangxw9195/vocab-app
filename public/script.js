// 在全局变量部分添加排序相关变量
let currentSortField = 'word'; // 默认按单词排序
let currentSortOrder = 'asc';  // 默认升序

let sortedVocabData = []; // 新增全局变量存储排序后的完整数据

// 在script.js顶部添加全局变量
let currentSearchTerm = '';

// 分页相关变量
let currentPage = 1;
let pageSize = 50; // 默认每页50条
let totalVocabCount = 0;

// Toast 提示函数
function showToast(message, type = 'info') {
    // 如果已经存在toast容器则复用
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.style.position = 'fixed';
        toastContainer.style.bottom = '20px';
        toastContainer.style.right = '20px';
        toastContainer.style.zIndex = '1000';
        document.body.appendChild(toastContainer);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <span>${message}</span>
        <button class="toast-close">&times;</button>
    `;
    
    // 添加关闭按钮事件
    toast.querySelector('.toast-close').addEventListener('click', () => {
        toast.remove();
    });

    toastContainer.appendChild(toast);
    
    // 自动消失
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// 添加CSS样式（如果尚未存在）
if (!document.getElementById('toast-styles')) {
    const style = document.createElement('style');
    style.id = 'toast-styles';
    style.textContent = `
        .toast {
            padding: 12px 24px;
            margin-bottom: 10px;
            border-radius: 4px;
            color: white;
            display: flex;
            justify-content: space-between;
            align-items: center;
            min-width: 250px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            transform: translateY(20px);
            opacity: 0;
            animation: slideIn 0.3s forwards;
        }
        .toast-success { background-color: #4CAF50; }
        .toast-error { background-color: #f44336; }
        .toast-info { background-color: #2196F3; }
        .toast-close {
            background: transparent;
            border: none;
            color: white;
            font-size: 18px;
            cursor: pointer;
            margin-left: 15px;
        }
        .fade-out {
            animation: fadeOut 0.3s forwards;
        }
        @keyframes slideIn {
            to { transform: translateY(0); opacity: 1; }
        }
        @keyframes fadeOut {
            to { opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}


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


// 初始化页面
async function initPage() {
    const isAdmin = await checkPermissions();
    console.log('管理员状态:', isAdmin);
    
    if (isAdmin) {
        document.body.classList.add('admin-mode');
        ['add-vocab-btn', 'export-btn', 'import-form', 'delete-all-btn'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.style.display = 'block';
                console.log('显示元素:', id);
            }
        });
    }

    // 确保先加载词汇再更新统计
    await loadVocab(1, pageSize); // 明确传递初始参数

    // 获取统计信息
    try {
        const statsResponse = await fetch('/api/stats');
        if (statsResponse.ok) {
            const stats = await statsResponse.json();
            updateVocabCount(stats.vocabCount);
        }
    } catch (error) {
        console.error('获取统计信息失败:', error);
    }
    
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


// 在 loadVocab 中添加 data-word 属性便于查找
// 加载词汇数据并分页显示
async function loadVocab(page = currentPage, size = pageSize, searchTerm = currentSearchTerm, highlightId = null) {
    try {
        const response = await fetch('/api/vocab');
        if (!response.ok) throw new Error('加载失败');
        
        const result = await response.json();
        let vocabData = result.encoded ? safeBase64Decode(result.data) : result.data;
        
        //// 按字母顺序排序并存储到全局变量
        //sortedVocabData = [...vocabData].sort((a, b) => a.word.localeCompare(b.word));
        // 排序处理
        sortedVocabData = sortVocabData(vocabData, currentSortField, currentSortOrder);
        
        // 搜索过滤
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            sortedVocabData = sortedVocabData.filter(item => 
                item.word.toLowerCase().includes(term) || 
                item.definition.toLowerCase().includes(term)
            );
        }
        
        // 更新总词汇数
        totalVocabCount = sortedVocabData.length;
        updateVocabCount(totalVocabCount);
        
        // 查找需要高亮的项目所在的页码
        if (highlightId) {
            const itemIndex = sortedVocabData.findIndex(item => item.id === highlightId);
            if (itemIndex >= 0) {
                page = Math.floor(itemIndex / pageSize) + 1;
            }
        }
        
        // 分页处理
        const startIndex = (page - 1) * size;
        const paginatedData = sortedVocabData.slice(startIndex, startIndex + size);
        
        // 渲染表格并传递高亮ID
        renderVocabTable(paginatedData, highlightId);
        
        // 更新当前页码
        currentPage = page;
        
        // 渲染分页控件
        renderPaginationControls();
        
    } catch (error) {
        console.error('加载词汇失败:', error);
        showToast('加载词汇失败: ' + error.message, 'error');
    }
}

// 添加排序函数
function sortVocabData(data, field, order) {
    const sorted = [...data];
    
    sorted.sort((a, b) => {
        let valueA, valueB;
        
        switch(field) {
            case 'word':
                valueA = a.word.toLowerCase();
                valueB = b.word.toLowerCase();
                break;
            case 'id':
                valueA = a.id;
                valueB = b.id;
                break;
            case 'createdAt':
                valueA = new Date(a.createdAt).getTime();
                valueB = new Date(b.createdAt).getTime();
                break;
            default:
                valueA = a.word.toLowerCase();
                valueB = b.word.toLowerCase();
        }
        
        if (valueA < valueB) return order === 'asc' ? -1 : 1;
        if (valueA > valueB) return order === 'asc' ? 1 : -1;
        return 0;
    });
    
    return sorted;
}



// 添加更新词汇总数的函数
function updateVocabCount(count) {
    const countElement = document.getElementById('vocab-count');
    if (countElement) {
        countElement.textContent = `(共 ${count} 条词汇)`;
    }
}

// 单独渲染表格的函数
/* function renderVocabTable(data, highlightId = null) {
    const tbody = document.querySelector('#vocab-table tbody');
    tbody.innerHTML = '';
    
    data.forEach((item, index) => {
        // 查找当前项目在全局排序后的位置
        const globalIndex = sortedVocabData.findIndex(v => v.id === item.id);
        const rowNumber = globalIndex >= 0 ? globalIndex + 1 : (currentPage - 1) * pageSize + index + 1;
        
        const row = document.createElement('tr');
        row.dataset.id = item.id;
        row.innerHTML = `
            <td>${rowNumber}</td>
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
        
        // 高亮显示
        if (highlightId && item.id === highlightId) {
            row.classList.add('highlight');
            setTimeout(() => row.classList.remove('highlight'), 2000);
        }
        
        tbody.appendChild(row);
    });
} */

function renderVocabTable(data, highlightId = null) {
    const tbody = document.querySelector('#vocab-table tbody');
    tbody.innerHTML = '';
    
    data.forEach((item, index) => {
        // 根据当前排序方式计算正确的序号
        let rowNumber;
        if (currentSortField === 'id' && currentSortOrder === 'asc') {
            // 按ID升序时直接使用ID作为序号
            rowNumber = item.id;
        } else {
            // 其他情况使用分页序号
            const globalIndex = sortedVocabData.findIndex(v => v.id === item.id);
            rowNumber = globalIndex >= 0 ? globalIndex + 1 : (currentPage - 1) * pageSize + index + 1;
        }
        
        const row = document.createElement('tr');
        row.dataset.id = item.id;
        row.innerHTML = `
            <td>${rowNumber}</td>
            <td>${item.word}</td>
            <td>${item.definition}</td>
            <td>${item.createdBy}</td>
            <td>${new Date(item.createdAt).toLocaleString()}</td>
            <td>
                <button class="edit-btn admin-only" data-id="${item.id}">编辑</button>
                <button class="delete-btn admin-only" data-id="${item.id}">删除</button>
                <button class="save-btn admin-only" data-id="${item.id}" style="display:none;">保存</button>
                <button class="cancel-btn admin-only" data-id="${item.id}" style="display:none;">取消</button>
            </td>
        `;
        
        if (highlightId && item.id === highlightId) {
            row.classList.add('highlight');
            setTimeout(() => row.classList.remove('highlight'), 2000);
        }
        
        tbody.appendChild(row);
    });
}


// 渲染分页控件
function renderPaginationControls() {
    const totalPages = Math.ceil(totalVocabCount / pageSize);
    const pageNumbers = document.getElementById('page-numbers');
    pageNumbers.innerHTML = '';
    
    // 确保当前页不超过总页数
    if (currentPage > totalPages && totalPages > 0) {
        currentPage = totalPages;
        loadVocab(currentPage, pageSize, currentSearchTerm);
        return;
    }
    
    // 计算显示的页码范围
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);
    
    // 确保显示5个页码
    if (endPage - startPage < 4) {
        if (currentPage < 3) {
            endPage = Math.min(5, totalPages);
        } else {
            startPage = Math.max(1, endPage - 4);
        }
    }
    
    // 添加页码按钮
    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.textContent = i;
        if (i === currentPage) {
            pageBtn.classList.add('active');
            pageBtn.disabled = true;
        }
        pageBtn.addEventListener('click', () => {
            loadVocab(i, pageSize, currentSearchTerm);
        });
        pageNumbers.appendChild(pageBtn);
    }
    
    // 更新导航按钮状态
    document.getElementById('first-page').disabled = currentPage === 1;
    document.getElementById('prev-page').disabled = currentPage === 1;
    document.getElementById('next-page').disabled = currentPage === totalPages || totalPages === 0;
    document.getElementById('last-page').disabled = currentPage === totalPages || totalPages === 0;
    
    // 更新页面信息显示
    const startItem = totalVocabCount > 0 ? (currentPage - 1) * pageSize + 1 : 0;
    const endItem = Math.min(currentPage * pageSize, totalVocabCount);
    document.querySelector('.page-info').textContent = 
        `显示 ${startItem}-${endItem} 条，共 ${totalVocabCount} 条`;
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
        const form = e.target;
        const word = form.word.value.trim();
        const definition = form.definition.value.trim();
    
        if (!word || !definition) {
            showToast('单词和释义不能为空', 'error');
            return;
        }
    
        try {
            const response = await fetch('/api/vocab', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ word, definition })
            });
            
            const result = await response.json();
            
            if (response.status === 409) {
                // 处理重复词汇
                let message = `"${result.attempted.word}" 已存在 (ID: ${result.existing.id})\n\n`;
                message += `现有记录：\n`;
                message += `单词：${result.existing.word}\n`;
                message += `释义：${result.existing.definition}\n`;
                message += `添加者：${result.existing.createdBy}\n`;
                message += `添加时间：${new Date(result.existing.createdAt).toLocaleString()}`;
                
                if (confirm(`${message}\n\n是否查看该词汇？`)) {
                    // 重新加载数据并高亮显示
                    await loadVocab(currentPage, pageSize, '', result.existing.id);
                    
                    // 滚动到该行
                    const row = document.querySelector(`tr[data-id="${result.existing.id}"]`);
                    if (row) {
                        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }
                return;
            }
            
            if (!response.ok) {
                throw new Error(result.error || '添加失败');
            }

            // 成功处理
            form.reset();
            document.getElementById('add-vocab-modal').classList.add('hidden');
            //await loadVocab(currentPage, pageSize, currentSearchTerm); // 保持当前页和搜索条件

            // 重新加载词汇并高亮显示新添加的项目
            await loadVocab(currentPage, pageSize, currentSearchTerm, result.item.id);
            
            // 滚动到新添加的行
            const row = document.querySelector(`tr[data-id="${result.item.id}"]`);
            if (row) {
                setTimeout(() => {
                    row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100); // 小延迟确保DOM更新完成
            }

            showToast(`"${result.item.word}" 添加成功`, 'success');
        } catch (error) {
            console.error('添加失败:', error);
            showToast(`添加失败: ${error.message}`, 'error');
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


    // 在删除词汇的函数中
    document.getElementById('vocab-table').addEventListener('click', async (e) => {
        if (e.target.classList.contains('delete-btn')) {
            const id = e.target.dataset.id;
            if (confirm('确定要删除这个词汇吗？')) {
                try {
                    const response = await fetch(`/api/vocab/${id}`, { method: 'DELETE' });
                    if (!response.ok) throw new Error('删除失败');
                    await loadVocab(currentPage, pageSize, currentSearchTerm); // 保持当前页和搜索条件
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


    //20250424---------------------------------------------
    // 分页按钮事件监听
    // 分页按钮事件监听
    document.getElementById('first-page').addEventListener('click', () => {
        loadVocab(1, pageSize, currentSearchTerm);
    });

    document.getElementById('prev-page').addEventListener('click', () => {
        if (currentPage > 1) {
            loadVocab(currentPage - 1, pageSize, currentSearchTerm);
        }
    });

    document.getElementById('next-page').addEventListener('click', () => {
        const totalPages = Math.ceil(totalVocabCount / pageSize);
        if (currentPage < totalPages) {
            loadVocab(currentPage + 1, pageSize, currentSearchTerm);
        }
    });

    document.getElementById('last-page').addEventListener('click', () => {
        const totalPages = Math.ceil(totalVocabCount / pageSize);
        loadVocab(totalPages, pageSize, currentSearchTerm);
    });

    // 每页数量变化事件
    document.getElementById('page-size').addEventListener('change', (e) => {
        const newSize = parseInt(e.target.value);
        pageSize = newSize;
        loadVocab(1, newSize, currentSearchTerm); // 重置到第一页
    });

    // 搜索功能
    document.getElementById('search-btn').addEventListener('click', () => {
        currentSearchTerm = document.getElementById('search-input').value.trim();
        loadVocab(1, pageSize, currentSearchTerm); // 搜索时重置到第一页
    });

    // 清除搜索
    document.getElementById('clear-search-btn').addEventListener('click', () => {
        document.getElementById('search-input').value = '';
        currentSearchTerm = '';
        loadVocab(1, pageSize); // 清除搜索后重置到第一页
    });

    // 回车键搜索
    document.getElementById('search-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            currentSearchTerm = e.target.value.trim();
            loadVocab(1, pageSize, currentSearchTerm);
        }
    });

    // 排序字段变化事件
    document.getElementById('sort-by').addEventListener('change', (e) => {
        currentSortField = e.target.value;
        loadVocab(1, pageSize, currentSearchTerm); // 排序后回到第一页
    });
    
    // 排序顺序变化事件
    document.getElementById('sort-order').addEventListener('change', (e) => {
        currentSortOrder = e.target.value;
        loadVocab(1, pageSize, currentSearchTerm); // 排序后回到第一页
    });


    
    // 初始加载
    await loadVocab(1, pageSize);

    //--------------------------------------------------
    const isAdmin = await checkAndUpdateUI();
    console.log('是否是管理员:', isAdmin); // 调试输出
    
    if (isAdmin) {
      // 初始化管理相关的事件监听
      initAdminFeatures();
    }
});



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

