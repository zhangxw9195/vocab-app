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
                    <td><button class="delete-btn" data-id="${item.id}">删除</button></td>
                `;
                tbody.appendChild(row);
            });
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

    // 事件监听
    document.getElementById('logout-btn').addEventListener('click', async () => {
        try {
            const response = await fetch('/api/logout', { method: 'POST' });
            if (!response.ok) throw new Error('注销失败');
            window.location.href = '/login.html';
        } catch (error) {
            alert('注销失败: ' + error.message);
        }
    });

    // 添加词汇按钮
    document.getElementById('add-vocab-btn').addEventListener('click', () => {
        document.getElementById('add-vocab-modal').classList.remove('hidden');
    });

    // 关闭模态框
    document.querySelector('.close-btn').addEventListener('click', () => {
        document.getElementById('add-vocab-modal').classList.add('hidden');
    });

    // 点击模态框外部关闭
    window.addEventListener('click', (e) => {
        if (e.target === document.getElementById('add-vocab-modal')) {
            document.getElementById('add-vocab-modal').classList.add('hidden');
        }
    });

    // 添加词汇表单
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

    // 导出CSV
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

    // 导入CSV
    document.getElementById('import-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fileInput = document.getElementById('import-file');
        if (fileInput.files.length === 0) {
            alert('请选择文件');
            return;
        }

        const formData = new FormData();
        formData.append('file', fileInput.files[0]);

        try {
            const response = await fetch('/api/vocab/import', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || '导入失败');
            }
            
            const result = await response.json();
            alert(`成功导入 ${result.imported} 条词汇，当前总计 ${result.total} 条`);
            fileInput.value = '';
            await loadVocab();
        } catch (error) {
            alert('导入失败: ' + error.message);
        }
    });

    // 删除词汇 (事件委托)
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
});