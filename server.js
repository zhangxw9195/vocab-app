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
/* const upload = multer({ 
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
}); */

const upload = multer({ 
    dest: 'uploads/',
    limits: {
        fileSize: 5 * 1024 * 1024 // 限制5MB
    },
    fileFilter: (req, file, cb) => {
        // 允许JSON和CSV文件
        if (file.mimetype === 'application/json' || 
            file.originalname.endsWith('.json') ||
            file.mimetype === 'text/csv' || 
            file.originalname.endsWith('.csv')) {
            cb(null, true);
        } else {
            cb(new Error('只允许上传JSON或CSV文件'), false);
        }
    }
});


// 初始化数据目录
function initData() {
    const usersPath = path.join(__dirname, 'data', 'users.json');
    
    if (!fs.existsSync(usersPath)) {
        console.log('初始化用户数据文件...');
        fs.writeFileSync(usersPath, JSON.stringify([
            {
                id: 1,
                username: 'superadmin',
                password: 'superadmin321',
                role: 'admin',
                isSystem: true
            }
        ], null, 2));
    }

    //--------------------------------------
    if (!fs.existsSync('data')) fs.mkdirSync('data');
    
    const defaultAdmin = {
        id: 1,
        username: 'superadmin',
        password: 'superadmin321', // 应提示首次登录后修改
        role: 'admin',
        isSystem: true // 标记为系统账户
    };
    if (!fs.existsSync('data/users.json')) {
        fs.writeFileSync('data/users.json', JSON.stringify([defaultAdmin]));
    }


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

    if (!fs.existsSync('data/logs.json')) {
        fs.writeFileSync('data/logs.json', JSON.stringify([]));
    }
}
initData();


//==============================================================================放在最后就失败报错，why?
// 用户数据导出路由
app.get('/api/users/export', requireAuth, async (req, res) => {
    //console.log('接收到导出请求'); // 调试日志
    
    try {
        // 1. 验证超级管理员权限
        if (!req.session.user?.isSystem) {
            console.warn(`非法导出尝试 by ${req.session.user?.username || '未知用户'}`);
            return res.status(403).json({ 
                error: '权限不足：仅超级管理员可执行此操作' 
            });
        }

        // 2. 确认文件路径
        const usersPath = path.join(__dirname, 'data', 'users.json');
        //console.log('尝试访问文件:', usersPath);
        
        if (!fs.existsSync(usersPath)) {
            console.error('用户数据文件不存在');
            return res.status(404).json({ error: '系统未初始化用户数据' });
        }

        // 3. 读取并处理数据
        const fileContent = fs.readFileSync(usersPath, 'utf8');
        const users = JSON.parse(fileContent);
        
        const exportData = users
            .filter(user => !user.isSystem) // 过滤系统账户
            .map(({ isSystem, ...safeData }) => safeData); // 移除敏感字段  //.map(({ password, isSystem, ...safeData }) => safeData); // 移除敏感字段

        //console.log(`准备导出 ${exportData.length} 条用户记录`);
        
        // 4. 发送响应
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=users_export.json');
        return res.json(exportData);

    } catch (error) {
        console.error('导出处理失败:', error);
        return res.status(500).json({ 
            error: '服务器处理导出请求时出错',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

//用户数据导入路由
app.post('/api/users/import', requireAuth, upload.single('file'), async (req, res) => {
    if (!req.session.user?.isSystem) {
        return res.status(403).json({ 
            error: '无权操作: 仅超级管理员可导入用户数据',
            details: '当前用户没有足够的权限'
        });
    }
    
    if (!req.file) {
        return res.status(400).json({ 
            error: '未上传文件',
            details: '请选择有效的JSON或CSV文件'
        });
    }
    
    try {
        const fileContent = fs.readFileSync(req.file.path, 'utf8');
        let importedUsers;
        
        // 检查文件类型并解析
        if (req.file.originalname.endsWith('.json') || req.file.mimetype === 'application/json') {
            try {
                importedUsers = JSON.parse(fileContent);
                if (!Array.isArray(importedUsers)) {
                    throw new Error('JSON文件应包含用户数组');
                }
            } catch (parseError) {
                throw new Error(`JSON解析失败: ${parseError.message}`);
            }
        } else if (req.file.originalname.endsWith('.csv') || req.file.mimetype === 'text/csv') {
            importedUsers = parse(fileContent, {
                columns: true,
                skip_empty_lines: true,
                trim: true
            });
        } else {
            throw new Error('不支持的文件格式');
        }

        // 验证导入数据
        if (!importedUsers || importedUsers.length === 0) {
            throw new Error('导入文件没有有效数据');
        }

        const currentUsers = JSON.parse(fs.readFileSync('data/users.json', 'utf8'));
        const overwrite = req.body.overwrite === 'true';
        
        let importedCount = 0;
        let skippedCount = 0;
        let errors = [];
        
        for (const importedUser of importedUsers) {
            try {
                // 跳过系统账户
                if (importedUser.isSystem) {
                    skippedCount++;
                    continue;
                }
                
                // 验证必要字段
                if (!importedUser.username || !importedUser.role) {
                    errors.push(`用户缺少必要字段: ${JSON.stringify(importedUser)}`);
                    continue;
                }
                
                const existingIndex = currentUsers.findIndex(u => 
                    u.id === importedUser.id || u.username === importedUser.username
                );
                
                if (existingIndex >= 0) {
                    if (overwrite) {
                        // 保留原始密码(如果不提供新密码)
                        if (!importedUser.password) {
                            importedUser.password = currentUsers[existingIndex].password;
                        }
                        currentUsers[existingIndex] = {
                            ...currentUsers[existingIndex],
                            ...importedUser,
                            id: currentUsers[existingIndex].id // 保持原始ID不变
                        };
                        importedCount++;
                    } else {
                        skippedCount++;
                    }
                } else {
                    // 为新用户设置默认密码(如果未提供)
                    if (!importedUser.password) {
                        importedUser.password = generateRandomPassword();
                    }
                    // 确保新用户有唯一ID
                    importedUser.id = getNextId(currentUsers);
                    currentUsers.push(importedUser);
                    importedCount++;
                }
            } catch (userError) {
                errors.push(`处理用户 ${importedUser.username || '未知用户'} 失败: ${userError.message}`);
            }
        }
        
        // 保存更新后的用户数据
        fs.writeFileSync('data/users.json', JSON.stringify(currentUsers, null, 2));
        
        // 清理上传的临时文件
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        
        // 返回导入结果
        res.json({ 
            success: true, 
            imported: importedCount,
            skipped: skippedCount,
            totalUsers: currentUsers.length,
            errors: errors.length > 0 ? errors : undefined
        });
        
    } catch (error) {
        console.error('导入用户失败:', error);
        
        // 清理上传的临时文件
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        
        res.status(500).json({ 
            error: '导入用户失败',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// 生成随机密码函数
function generateRandomPassword(length = 12) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
    let password = '';
    for (let i = 0; i < length; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}


//==============================================================================
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
/* app.post('/api/login', (req, res) => {
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
}); */


// 用户登录路由
/* app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const users = JSON.parse(fs.readFileSync('data/users.json'));

    const user = users.find(u => u.username === username && u.password === password);
    if (!user) {
        // 记录失败的登录尝试
        recordLoginAttempt(username, req.ip, false);
        return res.status(401).json({ error: '用户名或密码错误' });
    }

    // 更新登录计数
    const stats = JSON.parse(fs.readFileSync('data/stats.json'));
    stats.totalLogins++;
    fs.writeFileSync('data/stats.json', JSON.stringify(stats, null, 2));

    req.session.user = user;
    
    // 记录成功的登录
    recordLoginAttempt(username, req.ip, true);
    
    res.json({ 
        success: true, 
        username: user.username,
        role: user.role,
        loginCount: stats.totalLogins
    });
}); */

/* app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const users = JSON.parse(fs.readFileSync('data/users.json'));

    const user = users.find(u => u.username === username && u.password === password);
    if (!user) {
        recordLoginAttempt(username, req.ip, false);
        return res.status(401).json({ error: '用户名或密码错误' });
    }

    // 更新登录计数
    const stats = JSON.parse(fs.readFileSync('data/stats.json'));
    stats.totalLogins++;
    fs.writeFileSync('data/stats.json', JSON.stringify(stats, null, 2));

    // 存储完整的用户信息到session
    req.session.user = {
        id: user.id,
        username: user.username,
        role: user.role,
        isSystem: user.isSystem || false
    };
    
    recordLoginAttempt(username, req.ip, true);
    
    res.json({ 
        success: true, 
        user: {
            id: user.id,
            username: user.username,
            role: user.role
        },
        loginCount: stats.totalLogins
    });
}); */

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const users = JSON.parse(fs.readFileSync('data/users.json'));

    const user = users.find(u => u.username === username && u.password === password);
    if (!user) {
        recordLoginAttempt(username, req.ip, false);
        return res.status(401).json({ error: '用户名或密码错误' });
    }

    // 更新登录计数
    const stats = JSON.parse(fs.readFileSync('data/stats.json'));
    stats.totalLogins++;
    fs.writeFileSync('data/stats.json', JSON.stringify(stats, null, 2));

    // 设置session - 包含完整用户信息
    req.session.user = {
        id: user.id,
        username: user.username,
        role: user.role,
        isSystem: user.isSystem || false
    };
    
    recordLoginAttempt(username, req.ip, true);
    
    res.json({ 
        success: true,
        user: req.session.user,
        loginCount: stats.totalLogins
    });
});

// 专用函数记录登录尝试
function recordLoginAttempt(username, ip, success) {
    try {
        const logs = JSON.parse(fs.readFileSync('data/logs.json'));
        const newLog = {
            timestamp: new Date().toISOString(),
            username: username || 'unknown',
            ip: ip,
            actionType: '用户登录',
            details: success ? '登录成功' : '登录失败',
            success: success
        };
        
        logs.push(newLog);
        fs.writeFileSync('data/logs.json', JSON.stringify(logs, null, 2));
    } catch (error) {
        console.error('记录登录日志失败:', error);
    }
}


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


/* app.get('/api/current-user', (req, res) => {
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
}); */


// 确保 /api/current-user 返回完整信息
app.get('/api/current-user', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: '未登录' });
    
    const stats = JSON.parse(fs.readFileSync('data/stats.json'));
    const users = JSON.parse(fs.readFileSync('data/users.json'));
    
    // 从用户文件中获取完整用户信息
    const fullUser = users.find(u => u.id === req.session.user.id);
    if (!fullUser) return res.status(404).json({ error: '用户不存在' });
    
    res.json({ 
        user: {
            id: fullUser.id,
            username: fullUser.username,
            role: fullUser.role,
            isSystem: fullUser.isSystem || false
        },
        loginCount: stats.totalLogins
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
/* app.post('/api/vocab/clear-all', requireAuth, (req, res) => {
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

// 全部删除路由示例
app.post('/api/vocab/clear-all', requireAuth, async (req, res) => {
    if (!req.session.user.isSystem) {
        return res.status(403).json({ 
            error: '无权操作: 仅超级管理员可执行此操作' 
        });
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


//=================================================================
// 获取单个用户信息
app.get('/api/users/:id', requireAuth, (req, res) => {
    try {
        const users = JSON.parse(fs.readFileSync('data/users.json'));
        const user = users.find(u => u.id === parseInt(req.params.id));
        
        if (!user) {
            return res.status(404).json({ error: '用户未找到' });
        }
        
        // 不返回密码等敏感信息
        const { password, ...userData } = user;
        res.json(userData);
    } catch (error) {
        console.error('获取用户信息失败:', error);
        res.status(500).json({ error: '获取用户信息失败' });
    }
});

// 获取所有用户
app.get('/api/users', requireAuth, (req, res) => {
    if (req.session.user.role !== 'admin') {
        return res.status(403).json({ error: '无权访问' });
    }
    
    const users = JSON.parse(fs.readFileSync('data/users.json'));
    
    // 过滤掉系统账户
    const filteredUsers = users.filter(user => !user.isSystem);
    res.json(filteredUsers);
});

// 更新用户信息
app.put('/api/users/:id', requireAuth, (req, res) => {
    if (req.session.user.role !== 'admin') {
        return res.status(403).json({ error: '无权操作' });
    }
    
    const id = parseInt(req.params.id);
    const { username, password, role } = req.body;
    
    if (!username || !role) {
        return res.status(400).json({ error: '用户名和角色不能为空' });
    }
    
    try {
        const users = JSON.parse(fs.readFileSync('data/users.json'));
        const userIndex = users.findIndex(u => u.id === id);
        
        if (userIndex === -1) {
            return res.status(404).json({ error: '用户未找到' });
        }
        
        // 检查是否是系统账户
        if (users[userIndex].isSystem) {
            return res.status(403).json({ error: '系统内置账户不可修改' });
        }

        // 检查是否是最后一个管理员被降级
        if (users[userIndex].role === 'admin' && role === 'user') {
            const otherAdmins = users.filter(u => u.role === 'admin' && u.id !== id);
            if (otherAdmins.length === 0) {
                return res.status(400).json({ error: '系统中必须至少保留一个管理员账户' });
            }
        }
        
        // 更新用户信息
        users[userIndex] = {
            ...users[userIndex],
            username,
            role,
            // 只有提供了新密码才更新密码
            password: password ? password : users[userIndex].password
        };
        
        fs.writeFileSync('data/users.json', JSON.stringify(users, null, 2));
        res.json({ success: true, user: users[userIndex] });
    } catch (error) {
        console.error('更新用户错误:', error);
        res.status(500).json({ error: '更新用户失败' });
    }
});

// 删除用户
app.delete('/api/users/:id', requireAuth, (req, res) => {
    if (req.session.user.role !== 'admin') {
        return res.status(403).json({ error: '无权操作' });
    }
    
    const id = parseInt(req.params.id);
    let users = JSON.parse(fs.readFileSync('data/users.json'));

    // 检查是否是系统账户
    const userToDelete = users.find(u => u.id === id);
    if (userToDelete && userToDelete.isSystem) {
        return res.status(403).json({ error: '系统内置账户不可删除' });
    }

    // 检查是否是最后一个管理员
    //const userToDelete = users.find(u => u.id === id);
    if (userToDelete && userToDelete.role === 'admin') {
        const otherAdmins = users.filter(u => u.role === 'admin' && u.id !== id);
        if (otherAdmins.length === 0) {
            return res.status(400).json({ error: '不能删除最后一个管理员账户' });
        }
    }
    /* if (userToUpdate.isSystem) {
        return res.status(400).json({ error: '系统内置账户不可修改' });
    } */
    
    // 不能删除自己
    if (id === req.session.user.id) {
        return res.status(400).json({ error: '不能删除当前登录的用户' });
    }
    
    const initialLength = users.length;
    users = users.filter(u => u.id !== id);
    
    if (users.length === initialLength) {
        return res.status(404).json({ error: '用户未找到' });
    }
    
    fs.writeFileSync('data/users.json', JSON.stringify(users, null, 2));
    res.json({ success: true });
});


//============================================================================
// 日志记录中间件
function logAction(req, res, next) {
    const originalSend = res.send;
    res.send = function(body) {
        // 只记录成功的操作
        if (res.statusCode >= 200 && res.statusCode < 300) {
            const logs = JSON.parse(fs.readFileSync('data/logs.json'));
            const newLog = {
                timestamp: new Date().toISOString(),
                username: req.session.user?.username || 'anonymous',
                ip: req.ip,
                actionType: `${req.method} ${req.path}`,
                details: JSON.stringify({
                    params: req.params,
                    query: req.query,
                    body: req.body
                })
            };
            
            logs.push(newLog);
            fs.writeFileSync('data/logs.json', JSON.stringify(logs, null, 2));
        }
        originalSend.call(this, body);
    };
    next();
}

// 应用日志中间件
//app.use(logAction);  //20250429 暂时注释


// 获取日志API
/* app.get('/api/logs', requireAuth, (req, res) => {
    if (req.session.user.role !== 'admin') {
        return res.status(403).json({ error: '无权访问' });
    }
    
    try {
        const logs = JSON.parse(fs.readFileSync('data/logs.json'));
        res.json(logs);
    } catch (error) {
        console.error('获取日志失败:', error);
        res.status(500).json({ error: '获取日志失败' });
    }
}); */

// 获取日志API - 只允许超级管理员访问
// 修改获取日志的API，添加排序功能
app.get('/api/logs', requireAuth, (req, res) => {
    if (!req.session.user.isSystem) {
        return res.status(403).json({ 
            error: '无权访问: 仅超级管理员可查看系统日志' 
        });
    }
    
    try {
        const logs = JSON.parse(fs.readFileSync('data/logs.json'));
        
        // 按时间倒序排序 (最新的在前)
        logs.sort((a, b) => {
            return new Date(b.timestamp) - new Date(a.timestamp);
        });
        
        res.json(logs);
    } catch (error) {
        console.error('获取日志失败:', error);
        res.status(500).json({ error: '获取日志失败' });
    }
});

// 清理日志API
app.post('/api/logs/clean', requireAuth, (req, res) => {
    if (!req.session.user.isSystem) {
        return res.status(403).json({ 
            error: '无权操作: 仅超级管理员可清理日志' 
        });
    }

    if (req.session.user.role !== 'admin') {
        return res.status(403).json({ error: '无权操作' });
    }
    
    try {
        const logs = JSON.parse(fs.readFileSync('data/logs.json'));
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        
        const filteredLogs = logs.filter(log => 
            new Date(log.timestamp) > threeMonthsAgo
        );
        
        fs.writeFileSync('data/logs.json', JSON.stringify(filteredLogs, null, 2));
        res.json({ success: true, remaining: filteredLogs.length });
    } catch (error) {
        console.error('清理日志失败:', error);
        res.status(500).json({ error: '清理日志失败' });
    }
});
//----------------------------------------------------------------------------

// 确保已安装必要的模块
//const fs = require('fs');
//const path = require('path');

// 用户数据导出路由
// 用户数据导出路由 - 确保在server.js中正确添加
// 确保在server.js中添加以下路由
// 添加在server.js的其他路由附近
/* app.get('/api/users/export', requireAuth, async (req, res) => {
    try {
        // 1. 验证超级管理员权限
        if (!req.session.user?.isSystem) {
            console.log(`非法导出尝试 by: ${req.session.user?.username}`);
            return res.status(403).json({ error: '仅超级管理员可导出用户数据' });
        }

        // 2. 确认文件路径
        const usersPath = path.join(__dirname, 'data', 'users.json');
        console.log(`尝试访问文件路径: ${usersPath}`);
        
        if (!fs.existsSync(usersPath)) {
            console.error('用户文件不存在');
            return res.status(404).json({ error: '用户数据未初始化' });
        }

        // 3. 读取并处理数据
        const users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
        const exportData = users
            .filter(user => !user.isSystem)
            .map(({ password, isSystem, ...rest }) => rest);

        // 4. 发送响应
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=users_export.json');
        res.json(exportData);

    } catch (error) {
        console.error('导出处理错误:', error);
        res.status(500).json({ error: '服务器处理导出请求时出错' });
    }
}); */

// 导入用户数据API
//const upload = multer({ dest: 'uploads/' });




//==============================================================================

//微信验证
app.get('/tencent2693888209070690156.txt', (req, res) => {
    res.sendFile(path.join(__dirname, 'tencent2693888209070690156.txt'));
  });


// 处理前端路由
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});



//========================================================================

//========================================================================

// 错误处理
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: '服务器错误' });
});




