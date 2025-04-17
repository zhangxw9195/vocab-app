const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const bodyParser = require('body-parser');
const session = require('express-session');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');

const app = express();
const port = 3000;

// 配置中间件
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
/* app.use(session({
    secret: 'vocab-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
})); */


/* app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { 
      maxAge: 24 * 60 * 60 * 1000 // 24小时
    }
  })); */


/* */
/* */
/* */

const cors = require('cors'); // 添加这行导入语句
// 后端添加DELETE方法到CORS配置
// 然后配置CORS
app.use(cors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true // 允许发送cookie
}));

app.use(session({
    secret: 'vocab-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { 
        secure: false,
        maxAge: 24 * 60 * 60 * 1000 // 24小时
    }
}));


// 修改文件上传配置
const upload = multer({ 
    dest: 'uploads/',
    limits: {
        fileSize: 5 * 1024 * 1024 // 限制5MB
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
            cb(null, true);
        } else {
            cb(new Error('只允许上传CSV文件'), false);
        }
    }
});

// 初始化数据目录
function initData() {
    if (!fs.existsSync('data')) fs.mkdirSync('data');
    if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

    if (!fs.existsSync('data/users.json')) {
        fs.writeFileSync('data/users.json', JSON.stringify([
            { id: 1, username: 'admin', password: 'admin123', role: 'admin' }
        ]));
    }

    if (!fs.existsSync('data/vocab.json')) {
        fs.writeFileSync('data/vocab.json', JSON.stringify([]));
    }

    // 添加统计文件初始化
    if (!fs.existsSync('data/stats.json')) {
        fs.writeFileSync('data/stats.json', JSON.stringify({
            totalLogins: 0,
            vocabCount: 0
        }));
    }
}
initData();



// 用户认证中间件
function requireAuth(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({ error: '未登录' });
    }
    next();
}

// 用户注册
app.post('/api/register', (req, res) => {
    const { username, password, secretKey } = req.body; // 添加secretKey参数
    const users = JSON.parse(fs.readFileSync('data/users.json'));

    if (users.some(u => u.username === username)) {
        return res.status(400).json({ error: '用户名已存在' });
    }

    const newUser = {
        id: getNextId(users),
        username,
        password,
        role: secretKey === 'ADMIN_SECRET_KEY' ? 'admin' : 'user' // 密钥正确则设为admin
    };

    users.push(newUser);
    fs.writeFileSync('data/users.json', JSON.stringify(users, null, 2));
    res.json({ success: true, isAdmin: newUser.role === 'admin' });
});

// 用户登录
/* app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const users = JSON.parse(fs.readFileSync('data/users.json'));

    const user = users.find(u => u.username === username && u.password === password);
    if (!user) {
        return res.status(401).json({ error: '用户名或密码错误' });
    }

    req.session.user = user;
    //res.json({ success: true, username: user.username });
    res.json({ 
        success: true, 
        username: user.username,
        role: user.role  // 添加角色信息
    });
}); */


// 修改登录路由，增加登录计数
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const users = JSON.parse(fs.readFileSync('data/users.json'));

    const user = users.find(u => u.username === username && u.password === password);
    if (!user) {
        return res.status(401).json({ error: '用户名或密码错误' });
    }

    // 更新登录计数
    const stats = JSON.parse(fs.readFileSync('data/stats.json'));
    stats.totalLogins++;
    fs.writeFileSync('data/stats.json', JSON.stringify(stats, null, 2));

    req.session.user = user;
    res.json({ 
        success: true, 
        username: user.username,
        role: user.role,
        loginCount: stats.totalLogins // 返回登录计数
    });
});

// 用户注销
app.post('/api/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ error: '注销失败' });
        }
        res.json({ success: true });
    });
});



// 获取当前用户
/* app.get('/api/current-user', (req, res) => {
    //if (!req.session.user) {
    //    return res.status(401).json({ error: '未登录' });
    //}
    //res.json({ user: req.session.user });
    if (!req.session.user) return res.status(401).json({ error: '未登录' });
    res.json({ 
        user: {
            username: req.session.user.username,
            role: req.session.user.role
        }
    });
}); */


app.get('/api/current-user', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: '未登录' });
    
    // 从 stats.json 读取 loginCount
    const stats = JSON.parse(fs.readFileSync('data/stats.json'));
    
    res.json({ 
        user: {
            username: req.session.user.username,
            role: req.session.user.role
        },
        loginCount: stats.totalLogins // 返回登录计数
    });
});



// 词汇管理路由
app.route('/api/vocab')
    .get(requireAuth, (req, res) => {
        /* const vocab = JSON.parse(fs.readFileSync('data/vocab.json'));
        res.json(vocab); */
        
        try {
            const vocab = JSON.parse(fs.readFileSync('data/vocab.json', 'utf8')); // 明确指定utf8
            
            // 修正编码方式 - 先转为UTF-8的Buffer再编码
            const jsonString = JSON.stringify(vocab);
            const encodedData = Buffer.from(jsonString, 'utf8').toString('base64');
            
            res.json({
                encoded: true,
                data: encodedData,
                charset: 'utf-8' // 明确声明字符集
            });
        } catch (error) {
            console.error('编码失败:', error);
            res.status(500).json({ error: '数据编码失败' });
        }
    })
    /* .post(requireAuth, (req, res) => {
        const { word, definition } = req.body;
        if (!word || !definition) {
            return res.status(400).json({ error: '单词和释义不能为空' });
        }

        const vocab = JSON.parse(fs.readFileSync('data/vocab.json'));

        const newItem = {
            id: getNextId(vocab),
            word: word.trim(),
            definition: definition.trim(),
            createdBy: req.session.user.username,
            createdAt: new Date().toLocaleString()   //createdAt: new Date().toISOString()
        };

        vocab.push(newItem);
        fs.writeFileSync('data/vocab.json', JSON.stringify(vocab, null, 2));

        res.json({ success: true, item: newItem });
    }) */;



// 导出词汇为CSV
app.get('/api/vocab/export', requireAuth, (req, res) => {
    const vocab = JSON.parse(fs.readFileSync('data/vocab.json'));
    
    const csvData = stringify(vocab, {
        header: true,
        columns: [
            { key: 'id', header: 'ID' },
            { key: 'word', header: '单词' },
            { key: 'definition', header: '释义' },
            { key: 'createdBy', header: '添加者' },
            { key: 'createdAt', header: '添加时间' }
        ]
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=vocab-export.csv');
    res.send(csvData);
});

// 导入CSV词汇
// 修改/api/vocab/import路由
app.post('/api/vocab/import', requireAuth, upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ 
            success: false,
            error: '请上传有效的CSV文件',
            details: req.fileValidationError || '未接收到文件'
        });
    }

    try {
        const fileContent = fs.readFileSync(req.file.path, 'utf8');
        const vocab = JSON.parse(fs.readFileSync('data/vocab.json'));
        const currentUser = req.session.user.username;

        // 获取当前最大ID
        const maxId = vocab.length > 0 ? Math.max(...vocab.map(item => item.id)) : 0;

        const results = parse(fileContent, {
            columns: true,
            skip_empty_lines: true
        }).map((record, index) => ({
            id: maxId + index + 1,  // 确保每个新条目有唯一ID
            word: (record.word || record['单词'] || '').trim(),
            definition: (record.definition || record['释义'] || '').trim(),
            createdBy: currentUser,
            createdAt: new Date().toISOString()
        })).filter(item => item.word && item.definition);

        if (results.length === 0) {
            throw new Error('CSV文件中没有有效数据');
        }

        const updatedVocab = [...vocab, ...results];
        fs.writeFileSync('data/vocab.json', JSON.stringify(updatedVocab, null, 2));
        fs.unlinkSync(req.file.path);

        res.json({ 
            success: true, 
            imported: results.length,
            total: updatedVocab.length
        });
    } catch (error) {
        console.error('导入错误:', error);
        res.status(500).json({ error: error.message });
    } finally {
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
    }
});





// 启动服务器
app.listen(port, () => {
    console.log(`服务器运行在 http://localhost:${port}`);
});

// 辅助函数
//function getNextId(items) {
//    return items.length > 0 ? Math.max(...items.map(item => item.id)) + 1 : 1;
//}

// 在server.js顶部添加或修改此函数
function getNextId(items) {
    if (!items || items.length === 0) return 1;
    return Math.max(...items.map(item => item.id)) + 1;
}

// 修改/api/vocab POST路由
/* app.post('/api/vocab', requireAuth, (req, res) => {
    const { word, definition } = req.body;
    if (!word || !definition) {
        return res.status(400).json({ error: '单词和释义不能为空' });
    }

    const vocab = JSON.parse(fs.readFileSync('data/vocab.json'));

    const newItem = {
        id: getNextId(vocab),  // 使用修正后的ID生成函数
        word: word.trim(),
        definition: definition.trim(),
        createdBy: req.session.user.username,
        createdAt: new Date().toISOString()
    };

    vocab.push(newItem);
    fs.writeFileSync('data/vocab.json', JSON.stringify(vocab, null, 2));

    res.json({ success: true, item: newItem });
}); */


app.post('/api/vocab', requireAuth, (req, res) => {
    const { word, definition } = req.body;
    
    if (!word || !definition) {
        return res.status(400).json({ error: '单词和释义不能为空' });
    }

    try {
        // 同步读取确保数据一致性
        const vocab = JSON.parse(fs.readFileSync('data/vocab.json', 'utf8'));
        
        // 严格检查（不区分大小写和前后空格）
        const normalizedWord = word.trim().toLowerCase();
        const exists = vocab.some(item => 
            item.word.trim().toLowerCase() === normalizedWord
        );
        
        //console.log('Checking for duplicate:', normalizedWord, vocab.map(item => item.word));
        
        if (exists) {
            
            // 返回更详细的冲突信息
            const existingItem = vocab.find(item => 
                item.word.trim().toLowerCase() === normalizedWord
            );
            return res.status(409).json({ 
                error: '词汇已存在',
                existing: existingItem,
                attempted: {
                    word: word.trim(),
                    definition: definition.trim()
                }
            });
        }

        // 创建新条目
        const newItem = {
            id: getNextId(vocab),
            word: word.trim(),
            definition: definition.trim(),
            createdBy: req.session.user.username,
            createdAt: new Date().toISOString()
        };

        // 同步写入确保数据一致性
        const newVocab = [...vocab, newItem];
        fs.writeFileSync('data/vocab.json', JSON.stringify(newVocab, null, 2));
        
        return res.json({ 
            success: true, 
            item: newItem
        });
    } catch (error) {
        console.error('添加词汇失败:', error);
        return res.status(500).json({ 
            error: '添加词汇失败',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});



//
//
//
// 后端API示例 (Node.js/Express)
//const fs = require('fs');
//const path = require('path');

// 编辑保存词汇
app.put('/api/vocab/:id', requireAuth, (req, res) => {
    const id = parseInt(req.params.id);
    const vocabPath = path.join(__dirname, 'data', 'vocab.json');
    
    try {
        // 1. 读取并解析当前词汇表
        const vocabData = fs.readFileSync(vocabPath, 'utf8');
        let vocab = JSON.parse(vocabData);
        
        // 2. 查找要编辑的词汇索引
        const index = vocab.findIndex(item => item.id === id);
        if (index === -1) {
            return res.status(404).json({ error: '未找到该词汇' });
        }
        
        // 3. 准备更新数据（保留不可变字段）
        const updatedItem = {
            ...vocab[index], // 保留原有数据
            word: req.body.word || vocab[index].word, // 新词或保留原词
            definition: req.body.definition || vocab[index].definition, // 新释义或保留原释义
            updatedAt: new Date().toISOString() // 添加更新时间
        };
        
        // 4. 更新数组
        vocab[index] = updatedItem;
        
        // 5. 写回文件（格式化保存）
        fs.writeFileSync(vocabPath, JSON.stringify(vocab, null, 2));
        
        // 6. 返回更新后的词汇
        res.json({ 
            success: true,
            vocab: updatedItem
        });
        
    } catch (err) {
        console.error('编辑保存错误:', err);
        res.status(500).json({ 
            error: '服务器内部错误',
            details: process.env.NODE_ENV === 'development' ? err.message : null
        });
    }
});


// PUT /api/vocab/:id - 更新词汇
app.put('/:id', requireAuth, async (req, res) => {
    try {
        const { word, definition } = req.body;
        
        if (!word || !definition) {
            return res.status(400).json({ error: '单词和释义不能为空' });
        }
        
        // 从文件系统读取数据
        const vocabPath = path.join(__dirname, '../data/vocab.json');
        let vocab = JSON.parse(fs.readFileSync(vocabPath));
        
        // 查找并更新词汇
        const index = vocab.findIndex(item => item.id === parseInt(req.params.id));
        if (index === -1) {
            return res.status(404).json({ error: '词汇未找到' });
        }
        
        vocab[index] = {
            ...vocab[index],
            word,
            definition,
            updatedAt: new Date().toISOString()
        };
        
        // 写回文件
        fs.writeFileSync(vocabPath, JSON.stringify(vocab, null, 2));
        
        res.json(vocab[index]);
    } catch (error) {
        console.error('更新词汇错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});


/* */
/* */
/* */

app.delete('/api/vocab/:id', requireAuth, (req, res) => {
    const id = parseInt(req.params.id);
    let vocab = JSON.parse(fs.readFileSync('data/vocab.json'));

    const initialLength = vocab.length;
    vocab = vocab.filter(item => item.id !== id);

    if (vocab.length === initialLength) {
        return res.status(404).json({ error: '未找到该词汇' });
    }

    fs.writeFileSync('data/vocab.json', JSON.stringify(vocab, null, 2));
    res.json({ success: true });
});



// 在路由文件中添加
// 后端路由示例 (Node.js/Express)
/* app.delete('/api/vocab/all', requireAuth, async (req, res) => {
    console.log('DELETE /api/vocab/all 请求到达'); // 调试日志
    try {
        // 检查用户权限
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: '无权执行此操作' });
        }
        
        // 数据库方式删除
        //await Vocab.deleteMany({});
        
        // 或文件系统方式
        fs.writeFileSync('data/vocab.json', JSON.stringify([]));
        
        res.json({ success: true });
    } catch (err) {
        console.error('删除全部词汇错误:', err);
        res.status(500).json({ error: '删除失败: ' + err.message });
    }
}); */


// 全部删除词汇 (放在server.js的适当位置)
/* app.delete('/api/vocab/all', requireAuth, (req, res) => {
    console.log('DELETE /api/vocab/all 请求到达'); // 调试日志
    // 检查用户权限
    if (req.session.user.role !== 'admin') {
        return res.status(403).json({ error: '无权执行此操作' });
    }
    
    try {
        // 清空词汇文件
        fs.writeFileSync('data/vocab.json', JSON.stringify([]));
        res.json({ success: true });
    } catch (err) {
        console.error('删除全部词汇错误:', err);
        res.status(500).json({ error: '删除失败: ' + err.message });
    }
}); */


// 后端
app.post('/api/vocab/clear-all', requireAuth, (req, res) => {
    console.log('DELETE /api/vocab/all 请求到达'); // 调试日志
    // 检查用户权限
    if (req.session.user.role !== 'admin') {
        return res.status(403).json({ error: '无权执行此操作' });
    }
    
    try {
        // 清空词汇文件
        fs.writeFileSync('data/vocab.json', JSON.stringify([]));
        res.json({ success: true });
    } catch (err) {
        console.error('删除全部词汇错误:', err);
        res.status(500).json({ error: '删除失败: ' + err.message });
    }
});


// 添加获取统计信息的API
app.get('/api/stats', (req, res) => {
    try {
        const stats = JSON.parse(fs.readFileSync('data/stats.json'));
        const vocab = JSON.parse(fs.readFileSync('data/vocab.json'));
        
        // 确保词汇计数是最新的
        stats.vocabCount = vocab.length;
        fs.writeFileSync('data/stats.json', JSON.stringify(stats, null, 2));
        
        res.json(stats);
    } catch (error) {
        console.error('获取统计信息失败:', error);
        res.status(500).json({ error: '获取统计信息失败' });
    }
});


// 修改后的词汇获取路由
// 修改 /api/vocab 路由
/* app.get('/api/vocab', requireAuth, (req, res) => {
    try {
        const vocab = JSON.parse(fs.readFileSync('data/vocab.json'));
        
        // 统一返回结构：包含 encoded 字段表示是否编码
        const responseData = {
            encoded: true,
            data: Buffer.from(JSON.stringify(vocab)).toString('base64')
        };
        
        res.json(responseData);
    } catch (error) {
        console.error('获取词汇错误:', error);
        res.status(500).json({ error: '获取词汇失败' });
    }
}); */


// 处理前端路由
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


// 错误处理
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: '服务器错误' });
});




