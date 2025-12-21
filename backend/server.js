import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';


dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, 'uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const app = express();
const PORT = process.env.PORT || 5000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

// 中间件
app.use(cors());
app.use(bodyParser.json({ limit: '100mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '100mb' }));
app.use('/uploads', express.static(uploadsDir));




function requireAdmin(req, res, next) {
  if (!ADMIN_PASSWORD) {
    return res.status(500).json({
      error: '管理员密码未配置，请在 backend/.env 中设置 ADMIN_PASSWORD',
    });
  }

  const token = req.headers['x-admin-token'];

  if (!token || token !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: '未授权访问' });
  }

  return next();
}

// ===== 数据库连接（腾讯云 MySQL）=====
// 请在 backend 目录下配置 .env：
// DB_HOST=xxx
// DB_PORT=3306
// DB_USER=xxx
// DB_PASSWORD=xxx
// DB_NAME=xxx

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function initDb() {
  const connection = await pool.getConnection();

  try {
    // 确保使用 utf8mb4，支持中文和表情符号
    await connection.query('SET NAMES utf8mb4');

    const createTableStatements = [
      `CREATE TABLE IF NOT EXISTS portfolios (
        id INT PRIMARY KEY AUTO_INCREMENT,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        image_url TEXT,
        category VARCHAR(100),
        prompt TEXT,
        extra_images TEXT,
        is_featured TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

      `CREATE TABLE IF NOT EXISTS blog_posts (
        id INT PRIMARY KEY AUTO_INCREMENT,
        title VARCHAR(255) NOT NULL,
        content LONGTEXT NOT NULL,
        category VARCHAR(100),
        author VARCHAR(100) DEFAULT 'AI创作者',
        cover_image TEXT,
        likes INT DEFAULT 0,
        views INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

      `CREATE TABLE IF NOT EXISTS prompt_templates (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        template TEXT NOT NULL,
        category VARCHAR(100),
        tags VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

      `CREATE TABLE IF NOT EXISTS comments (
        id INT PRIMARY KEY AUTO_INCREMENT,
        post_id INT NOT NULL,
        author_name VARCHAR(100) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_comments_post FOREIGN KEY (post_id) REFERENCES blog_posts(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

      `CREATE TABLE IF NOT EXISTS site_profile (
        id INT PRIMARY KEY AUTO_INCREMENT,
        display_name VARCHAR(100) NOT NULL,
        subtitle VARCHAR(255),
        bio TEXT,
        email VARCHAR(255),
        github VARCHAR(255),
        twitter VARCHAR(255),
        wechat VARCHAR(255),
        phone VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

      `CREATE TABLE IF NOT EXISTS images (
        id INT PRIMARY KEY AUTO_INCREMENT,
        file_name VARCHAR(255),
        mime_type VARCHAR(100),
        size INT,
        original LONGBLOB,
        thumbnail MEDIUMBLOB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    ];


    for (const sql of createTableStatements) {
      await connection.query(sql);
    }

    // 确保旧表上也具备新字段（多图 + 首页封面）
    try {
      await connection.query('ALTER TABLE portfolios ADD COLUMN extra_images TEXT');
    } catch (error) {
      if (error.code !== 'ER_DUP_FIELDNAME') {
        throw error;
      }
    }

    try {
      await connection.query(
        'ALTER TABLE portfolios ADD COLUMN is_featured TINYINT(1) DEFAULT 0'
      );
    } catch (error) {
      if (error.code !== 'ER_DUP_FIELDNAME') {
        throw error;
      }
    }

    // 初始化作品集示例数据（只在表为空时插入），使用与你当前分类匹配的示例
    const [portfolioCountRows] = await connection.query(
      'SELECT COUNT(*) AS count FROM portfolios'
    );
    const portfolioCount = portfolioCountRows[0].count;

    if (portfolioCount === 0) {
      const samplePortfolios = [
        {
          title: '极简线性 Icon 组',
          description:
            '一组为产品界面设计的极简线性风格图标，强调统一的网格与笔触。',
          image_url:
            'https://images.unsplash.com/photo-1589571894960-20bbe2828d0a?w=800',
          category: 'Icon设计',
          prompt:
            'minimalist line icon set, 24px grid, monochrome, ui icons, flat, vector style',
          extra_images: null,
          is_featured: 1,
        },
        {
          title: '未来感 IP 角色',
          description:
            '面向品牌形象打造的科幻感角色设计，具备鲜明的轮廓与识别度。',
          image_url:
            'https://images.unsplash.com/photo-1526498460520-4c246339dccb?w=800',
          category: 'IP人物形象设计',
          prompt:
            'futuristic mascot character, cyber theme, strong silhouette, clean color palette, 8k',
          extra_images: null,
          is_featured: 1,
        },
        {
          title: '水滴微观世界',
          description:
            '利用微距视角呈现水滴中的折射世界，营造微观宇宙的氛围。',
          image_url:
            'https://images.unsplash.com/photo-1518131678677-bc1a4dca4ccb?w=800',
          category: '微观世界摄影',
          prompt:
            'macro photography, water drops, reflections, shallow depth of field, dreamy bokeh',
          extra_images: null,
          is_featured: 0,
        },
        {
          title: '新款耳机产品海报',
          description:
            '以暗色背景和金色点缀突出产品质感，适合电商与宣传物料。',
          image_url:
            'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800',
          category: '产品海报',
          prompt:
            'product poster, premium headphones, dark background, golden rim light, commercial photography',
          extra_images: null,
          is_featured: 0,
        },
        {
          title: '城市光影人像',
          description:
            '利用城市霓虹灯和反差光塑造人物气质，呈现情绪化人像。',
          image_url:
            'https://images.unsplash.com/photo-1524253482453-3fed8d2fe12b?w=800',
          category: '人像摄影',
          prompt:
            'portrait photography, neon city lights, cinematic grading, shallow depth of field',
          extra_images: null,
          is_featured: 0,
        },
        {
          title: '图生图风格迁移示例',
          description:
            '通过图生图的方式，将普通建筑照片转换为赛博朋克风格城市。',
          image_url:
            'https://images.unsplash.com/photo-1486304873000-235643847519?w=800',
          category: '图生图技术展示',
          prompt:
            'image to image, cyberpunk style transfer, glowing signs, rainy night, high detail',
          extra_images: null,
          is_featured: 0,
        },
        {
          title: '文生图场景生成示例',
          description:
            '仅通过文字描述生成的奇幻山谷与流光云海场景。',
          image_url:
            'https://images.unsplash.com/photo-1500534314211-0a24cd03f2c0?w=800',
          category: '文生图技术展示',
          prompt:
            'text to image, fantasy valley, floating clouds, epic landscape, volumetric light, 8k',
          extra_images: null,
          is_featured: 1,
        },
      ];

      const insertPortfolioSql = `
        INSERT INTO portfolios (title, description, image_url, category, prompt, extra_images, is_featured)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      for (const p of samplePortfolios) {
        await connection.query(insertPortfolioSql, [
          p.title,
          p.description,
          p.image_url,
          p.category,
          p.prompt,
          p.extra_images ?? null,
          p.is_featured ? 1 : 0,
        ]);
      }
    }

    const [postCountRows] = await connection.query(
      'SELECT COUNT(*) AS count FROM blog_posts'
    );
    const postCount = postCountRows[0].count;

    if (postCount === 0) {
      const samplePosts = [
        {
          title: 'AI绘画入门指南：从零开始创作惊艳作品',
          content: `# AI绘画入门指南

AI绘画技术正在revolutionize艺术创作领域。本文将带你了解如何使用AI工具创作出惊艳的艺术作品。

## 什么是AI绘画？

AI绘画是利用人工智能算法，通过文本描述（提示词）生成图像的技术。目前主流的AI绘画工具包括Midjourney、Stable Diffusion、DALL-E等。

## 核心要素

### 1. 提示词（Prompt）
提示词是AI绘画的关键。一个好的提示词应该包含：
- 主体描述
- 风格定义
- 细节补充
- 质量参数

### 2. 参数调整
- 分辨率设置
- 艺术风格
- 渲染质量

## 实践技巧

1. **从简单开始**：先用简单的提示词测试
2. **迭代优化**：根据结果不断调整提示词
3. **参考优秀作品**：学习他人的提示词写法
4. **保持创意**：大胆尝试不同的组合

开始你的AI艺术创作之旅吧！`,
          category: '教程',
          cover_image:
            'https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8?w=800',
          likes: 42,
          views: 158,
        },
        {
          title: '2024年AI艺术趋势分析',
          content: `# 2024年AI艺术趋势

随着技术的发展，AI艺术正在呈现出新的趋势和特点。

## 主要趋势

### 1. 更加精细的控制
新一代AI工具提供了更精确的控制选项，艺术家可以更好地实现自己的创意vision。

### 2. 实时生成
实时AI绘画技术的发展让创作过程更加流畅自然。

### 3. 多模态融合
文本、图像、音频等多种模态的融合创作成为可能。

## 未来展望

AI艺术将继续evolve，为创作者提供更多可能性。`,
          category: '趋势',
          cover_image:
            'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=800',
          likes: 28,
          views: 95,
        },
      ];

      const insertPostSql = `
        INSERT INTO blog_posts (title, content, category, cover_image, likes, views)
        VALUES (?, ?, ?, ?, ?, ?)
      `;

      for (const p of samplePosts) {
        await connection.query(insertPostSql, [
          p.title,
          p.content,
          p.category,
          p.cover_image,
          p.likes,
          p.views,
        ]);
      }
    }

    // 初始化个人资料（仅当表为空时）
    const [profileCountRows] = await connection.query(
      'SELECT COUNT(*) AS count FROM site_profile'
    );
    const profileCount = profileCountRows[0].count;

    if (profileCount === 0) {
      await connection.query(
        `INSERT INTO site_profile (display_name, subtitle, bio, email, github, twitter, wechat, phone)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)` ,
        [
          '清寒 · AI 创作者',
          'AI Art · Prompt Engineering · Creative Coding',
          '喜欢用算法与提示词构建叙事性的视觉世界，从赛博朋克城市到梦境森林，再到抽象情绪流，清寒居希望成为记录这些作品与灵感的安静角落。',
          'contact@example.com',
          'https://github.com',
          'https://twitter.com',
          '可根据需要添加微信，方便深入沟通',
          '',
        ]
      );
    }
  } finally {
    connection.release();
  }
}

// ===== 管理员登录 API =====
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;

  if (!ADMIN_PASSWORD) {
    return res.status(500).json({
      error: '管理员密码未配置，请在 backend/.env 中设置 ADMIN_PASSWORD',
    });
  }

  if (!password || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: '密码错误或未提供' });
  }

  return res.json({ ok: true });
});

// ===== 图片上传 API（原图入库 + 缩略图） =====
app.post('/api/upload-image', requireAdmin, async (req, res) => {
  const { fileName, data } = req.body;

  if (!fileName || !data) {
    return res.status(400).json({ error: '缺少文件信息' });
  }

  try {
    const match = typeof data === 'string' ? data.match(/^data:(.+);base64,(.+)$/) : null;
    const mimeType = match ? match[1] : 'image/jpeg';
    const base64 = match ? match[2] : data;
    const buffer = Buffer.from(base64, 'base64');

    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedMimeTypes.includes(mimeType)) {
      return res.status(400).json({ error: '不支持的图片格式，请上传 JPG/PNG/WebP/GIF 格式图片' });
    }

    // 生成缩略图，宽度最大 800 像素，保持比例
    const thumbnailBuffer = await sharp(buffer)
      .resize({ width: 800, withoutEnlargement: true })
      .jpeg({ quality: 75 })
      .toBuffer();

    const [result] = await pool.query(
      `INSERT INTO images (file_name, mime_type, size, original, thumbnail)
       VALUES (?, ?, ?, ?, ?)` ,
      [fileName, mimeType, buffer.length, buffer, thumbnailBuffer]
    );

    const id = result.insertId;

    res.json({
      id,
      thumbUrl: `/api/images/${id}/thumb`,
      fullUrl: `/api/images/${id}`,
      downloadUrl: `/api/images/${id}/download`,
    });
  } catch (error) {
    console.error('图片上传失败:', error);
    res.status(500).json({ error: '图片上传失败' });
  }
});

// ===== 图片读取 API =====
app.get('/api/images/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query('SELECT mime_type, original FROM images WHERE id = ?', [id]);
    if (!rows.length) {
      return res.status(404).json({ error: '图片不存在' });
    }

    const row = rows[0];
    res.setHeader('Content-Type', row.mime_type || 'application/octet-stream');
    res.send(row.original);
  } catch (error) {
    console.error('获取原图失败:', error);
    res.status(500).json({ error: '获取原图失败' });
  }
});

app.get('/api/images/:id/thumb', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query('SELECT thumbnail FROM images WHERE id = ?', [id]);
    if (!rows.length || !rows[0].thumbnail) {
      return res.status(404).json({ error: '缩略图不存在' });
    }

    res.setHeader('Content-Type', 'image/jpeg');
    res.send(rows[0].thumbnail);
  } catch (error) {
    console.error('获取缩略图失败:', error);
    res.status(500).json({ error: '获取缩略图失败' });
  }
});

app.get('/api/images/:id/download', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query(
      'SELECT file_name, mime_type, original FROM images WHERE id = ?',
      [id]
    );
    if (!rows.length) {
      return res.status(404).json({ error: '图片不存在' });
    }

    const row = rows[0];
    res.setHeader('Content-Type', row.mime_type || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(row.file_name || 'image')}"`
    );
    res.send(row.original);
  } catch (error) {
    console.error('下载原图失败:', error);
    res.status(500).json({ error: '下载原图失败' });
  }
});


// ===== 作品集 API =====

app.get('/api/portfolios', async (req, res) => {
  const { category, featured, limit } = req.query;

  let query = 'SELECT * FROM portfolios';
  const params = [];
  const conditions = [];

  if (category) {
    conditions.push('category = ?');
    params.push(category);
  }

  if (featured === 'true') {
    conditions.push('is_featured = 1');
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY created_at DESC';

  if (limit) {
    query += ' LIMIT ?';
    params.push(parseInt(limit, 10));
  }

  try {
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/portfolios', requireAdmin, async (req, res) => {
  const {
    title,
    description,
    image_url,
    category,
    prompt,
    extra_images,
    is_featured,
  } = req.body;

  const isFeaturedValue = is_featured ? 1 : 0;

  try {
    const [result] = await pool.query(
      `INSERT INTO portfolios (title, description, image_url, category, prompt, extra_images, is_featured)
       VALUES (?, ?, ?, ?, ?, ?, ?)` ,
      [
        title,
        description,
        image_url,
        category,
        prompt,
        extra_images ?? null,
        isFeaturedValue,
      ]
    );
    res.json({ id: result.insertId, message: '作品添加成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 管理端：更新作品
app.put('/api/portfolios/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const {
    title,
    description,
    image_url,
    category,
    prompt,
    extra_images,
    is_featured,
  } = req.body;

  const isFeaturedValue = is_featured ? 1 : 0;

  try {
    await pool.query(
      `UPDATE portfolios
       SET title = ?, description = ?, image_url = ?, category = ?, prompt = ?, extra_images = ?, is_featured = ?
       WHERE id = ?` ,
      [
        title,
        description,
        image_url,
        category,
        prompt,
        extra_images ?? null,
        isFeaturedValue,
        id,
      ]
    );
    res.json({ message: '作品更新成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 管理端：删除作品
app.delete('/api/portfolios/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query('DELETE FROM portfolios WHERE id = ?', [id]);
    res.json({ message: '作品已删除' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== 博客文章 API =====
app.get('/api/posts', async (req, res) => {
  const { category, limit = 10 } = req.query;
  let query = 'SELECT * FROM blog_posts';
  const params = [];

  if (category) {
    query += ' WHERE category = ?';
    params.push(category);
  }

  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(parseInt(limit, 10));

  try {
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/posts/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.query(
        'SELECT * FROM blog_posts WHERE id = ? LIMIT 1',
        [id]
      );
      const post = rows[0];
      if (!post) {
        return res.status(404).json({ error: '文章不存在' });
      }

      await connection.query('UPDATE blog_posts SET views = views + 1 WHERE id = ?', [
        id,
      ]);
      post.views += 1;

      res.json(post);
    } finally {
      connection.release();
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/posts', requireAdmin, async (req, res) => {
  const { title, content, category, cover_image } = req.body;

  try {
    const [result] = await pool.query(
      `INSERT INTO blog_posts (title, content, category, cover_image)
       VALUES (?, ?, ?, ?)` ,
      [title, content, category, cover_image]
    );
    res.json({ id: result.insertId, message: '文章发布成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/posts/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { title, content, category, cover_image } = req.body;

  try {
    await pool.query(
      `UPDATE blog_posts
       SET title = ?, content = ?, category = ?, cover_image = ?
       WHERE id = ?` ,
      [title, content, category, cover_image, id]
    );
    res.json({ message: '文章更新成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/posts/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query('DELETE FROM blog_posts WHERE id = ?', [id]);
    res.json({ message: '文章已删除' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/posts/:id/like', async (req, res) => {
  const { id } = req.params;

  try {
    const connection = await pool.getConnection();
    try {
      await connection.query('UPDATE blog_posts SET likes = likes + 1 WHERE id = ?', [
        id,
      ]);
      const [rows] = await connection.query(
        'SELECT likes FROM blog_posts WHERE id = ? LIMIT 1',
        [id]
      );
      res.json({ likes: rows[0].likes });
    } finally {
      connection.release();
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== 评论 API =====
app.get('/api/posts/:id/comments', async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await pool.query(
      'SELECT * FROM comments WHERE post_id = ? ORDER BY created_at DESC',
      [id]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/posts/:id/comments', async (req, res) => {
  const { id } = req.params;
  const { author_name, content } = req.body;

  try {
    const [result] = await pool.query(
      `INSERT INTO comments (post_id, author_name, content)
       VALUES (?, ?, ?)` ,
      [id, author_name, content]
    );
    res.json({ id: result.insertId, message: '评论发表成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== 提示词模板 API =====
app.get('/api/prompt-templates', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM prompt_templates ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/prompt-templates', async (req, res) => {
  const { name, template, category, tags } = req.body;

  try {
    const [result] = await pool.query(
      `INSERT INTO prompt_templates (name, template, category, tags)
       VALUES (?, ?, ?, ?)` ,
      [name, template, category, tags]
    );
    res.json({ id: result.insertId, message: '模板保存成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== 个人资料 API =====
app.get('/api/profile', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM site_profile ORDER BY id ASC LIMIT 1'
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: '个人资料未初始化' });
    }
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/profile', requireAdmin, async (req, res) => {
  const { display_name, subtitle, bio, email, github, twitter, wechat, phone } = req.body;

  try {
    const [rows] = await pool.query(
      'SELECT id FROM site_profile ORDER BY id ASC LIMIT 1'
    );

    if (rows.length === 0) {
      const [insertResult] = await pool.query(
        `INSERT INTO site_profile (display_name, subtitle, bio, email, github, twitter, wechat, phone)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)` ,
        [display_name, subtitle, bio, email, github, twitter, wechat, phone]
      );
      return res.json({ id: insertResult.insertId, message: '个人资料已创建' });
    }

    const profileId = rows[0].id;
    await pool.query(
      `UPDATE site_profile
       SET display_name = ?, subtitle = ?, bio = ?, email = ?, github = ?, twitter = ?, wechat = ?, phone = ?
       WHERE id = ?` ,
      [display_name, subtitle, bio, email, github, twitter, wechat, phone, profileId]
    );

    res.json({ id: profileId, message: '个人资料已更新' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 启动服务（先初始化数据库）
initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('数据库初始化失败:', error);
    process.exit(1);
  });
