import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import axios from 'axios';
import cron from 'node-cron';
import * as cheerio from 'cheerio';


dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, 'uploads');
const logosDir = path.join(__dirname, '..', 'frontend', 'public', 'logos');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const app = express();

const PORT = process.env.PORT || 5000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const ZHIPU_API_KEY = process.env.ZHIPU_API_KEY || '';

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
        wechat_url TEXT,
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

    try {
      await connection.query(
        'ALTER TABLE portfolios ADD COLUMN likes INT DEFAULT 0'
      );
    } catch (error) {
      if (error.code !== 'ER_DUP_FIELDNAME') {
        throw error;
      }
    }

    // 为博客文章增加 wechat_url 字段（用于跳转到公众号文章）
    try {
      await connection.query('ALTER TABLE blog_posts ADD COLUMN wechat_url TEXT');
    } catch (error) {

      if (error.code !== 'ER_DUP_FIELDNAME') {
        throw error;
      }
    }

    // 快速提示词元素配置表：用于管理前台“快速添加元素”内容
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS prompt_elements_config (
          id INT PRIMARY KEY AUTO_INCREMENT,
          styles TEXT,
          moods TEXT,
          lighting TEXT,
          quality TEXT,
          artists TEXT,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

      // 兼容旧表结构，若缺少 artists 字段则补充
      try {
        await connection.query('ALTER TABLE prompt_elements_config ADD COLUMN artists TEXT');
      } catch (error2) {
        if (error2.code !== 'ER_DUP_FIELDNAME') {
          throw error2;
        }
      }
    } catch (error) {
      throw error;
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

// ===== 微信公众号文章同步（自动 & 手动） =====
const WECHAT_APPID = process.env.WECHAT_APPID || '';
const WECHAT_APPSECRET = process.env.WECHAT_APPSECRET || '';
const WECHAT_SYNC_INTERVAL = parseInt(process.env.WECHAT_SYNC_INTERVAL || '6', 10);

let cachedAccessToken = null;
let tokenExpireTime = 0;

// 获取微信 Access Token
async function getWechatAccessToken() {
  const now = Date.now();
  if (cachedAccessToken && now < tokenExpireTime) {
    return cachedAccessToken;
  }

  try {
    const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${WECHAT_APPID}&secret=${WECHAT_APPSECRET}`;
    const response = await axios.get(url);
    const { access_token, expires_in } = response.data || {};

    if (!access_token) {
      throw new Error('获取 Access Token 失败: ' + JSON.stringify(response.data));
    }

    cachedAccessToken = access_token;
    tokenExpireTime = now + (expires_in - 300) * 1000; // 提前 5 分钟刷新
    console.log('✅ 微信 Access Token 获取成功');
    return access_token;
  } catch (error) {
    console.error('❌ 获取微信 Access Token 失败:', error?.message || error);
    throw error;
  }
}

// 获取公众号图文素材列表（永久素材）
async function fetchWechatMaterials(offset = 0, count = 20) {
  try {
    const token = await getWechatAccessToken();
    const url = `https://api.weixin.qq.com/cgi-bin/material/batchget_material?access_token=${token}`;

    const response = await axios.post(url, {
      type: 'news',
      offset,
      count,
    });

    if (response.data.errcode) {
      throw new Error(`微信API错误: ${response.data.errmsg}`);
    }

    return response.data.item || [];
  } catch (error) {
    console.error('❌ 获取微信素材失败:', error?.message || error);
    return [];
  }
}

// 获取“已发布文章”列表（更接近你在公众号看到的文章）
async function fetchWechatPublishedItems(offset = 0, count = 20) {
  try {
    const token = await getWechatAccessToken();
    const url = `https://api.weixin.qq.com/cgi-bin/freepublish/batchget?access_token=${token}`;

    const response = await axios.post(url, {
      offset,
      count,
      no_content: 0, // 返回完整正文内容
    });

    if (response.data.errcode) {
      throw new Error(`微信已发布文章API错误: ${response.data.errmsg}`);
    }

    const items = response.data.item || [];
    console.log(`ℹ️ 从已发布文章接口获取到 ${items.length} 条记录`);
    return items;
  } catch (error) {
    console.error('❌ 获取已发布文章失败:', error?.message || error);
    return [];
  }
}


// 下载微信图片并存入数据库 images 表，返回缩略图访问地址
async function downloadWechatImage(imageUrl) {
  try {
    if (!imageUrl) return '';

    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 10000,
    });

    const buffer = Buffer.from(response.data);
    const contentType = response.headers['content-type'] || 'image/jpeg';
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const mimeType = allowedMimeTypes.includes(contentType) ? contentType : 'image/jpeg';

    // 生成缩略图（与 /api/upload-image 逻辑保持一致）
    const thumbnailBuffer = await sharp(buffer)
      .resize({ width: 800, withoutEnlargement: true })
      .jpeg({ quality: 75 })
      .toBuffer();

    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;

    const [result] = await pool.query(
      `INSERT INTO images (file_name, mime_type, size, original, thumbnail)
       VALUES (?, ?, ?, ?, ?)` ,
      [fileName, mimeType, buffer.length, buffer, thumbnailBuffer]
    );

    const id = result.insertId;
    // 统一使用缩略图地址作为封面图，节省流量与前端渲染开销
    return `/api/images/${id}/thumb`;
  } catch (error) {
    console.error('❌ 下载图片失败:', imageUrl, error?.message || error);
    return '';
  }
}

// 简单清理微信文章 HTML（保留大部分样式，只做安全过滤）
function cleanWechatHtml(html) {
  if (!html) return '';

  const $ = cheerio.load(html, { decodeEntities: false });

  // 移除脚本和外链标签，避免安全与兼容问题
  $('script, iframe, link, meta, noscript').remove();

  // 规范图片：优先使用 data-src，并限制宽度自适应
  $('img').each((_, el) => {
    const src =
      $(el).attr('data-src') ||
      $(el).attr('data-original') ||
      $(el).attr('src');

    if (src) {
      $(el).attr('src', src);
    }

    const existingStyle = $(el).attr('style') || '';
    const extraStyle = 'max-width:100%;height:auto;';

    if (!existingStyle.includes('max-width')) {
      $(el).attr('style', `${existingStyle} ${extraStyle}`.trim());
    }
  });

  return $.html();
}


// 将一篇微信文章同步到 blog_posts
async function syncArticleToDb(article) {
  try {
    const { title, author, content, digest, thumb_url, url } = article;

    if (!title || !url) {
      console.warn('⚠️ 微信文章缺少标题或链接，跳过');
      return;
    }

    // 根据 wechat_url 去重
    const [existing] = await pool.query(
      'SELECT id FROM blog_posts WHERE wechat_url = ? LIMIT 1',
      [url]
    );

    if (existing.length > 0) {
      console.log(`⏭️  文章已存在，跳过: ${title}`);
      return;
    }

    const localCoverImage = await downloadWechatImage(thumb_url);
    const cleanContent = cleanWechatHtml(content || '');

    await pool.query(
      `INSERT INTO blog_posts (title, content, category, author, cover_image, wechat_url)
       VALUES (?, ?, ?, ?, ?, ?)` ,
      [
        title,
        cleanContent || digest || '内容同步中...',
        '公众号同步',
        author || 'AI创作者',
        localCoverImage || null,
        url,
      ]
    );

    console.log(`✅ 文章同步成功: ${title}`);
  } catch (error) {
    console.error('❌ 同步文章失败:', error?.message || error);
  }
}

// 执行一次完整的同步任务
async function syncWechatArticles() {
  if (!WECHAT_APPID || !WECHAT_APPSECRET) {
    console.log('⚠️ 未配置 WECHAT_APPID/WECHAT_APPSECRET，跳过同步');
    return;
  }

  console.log('🔄 开始同步微信公众号文章...');

  try {
    // 1）优先从“已发布文章”接口获取
    const publishedItems = await fetchWechatPublishedItems(0, 20);

    if (publishedItems.length > 0) {
      console.log(`ℹ️ 从「已发布文章」接口拿到 ${publishedItems.length} 条记录`);
      for (const item of publishedItems) {
        const { content } = item;
        if (!content || !content.news_item) continue;

        for (const article of content.news_item) {
          await syncArticleToDb(article);
        }
      }
    } else {
      console.log('ℹ️ 已发布文章接口未返回任何记录（可能是无权限或暂无已发布文章）。');

      // 2）回退到“永久素材”接口
      const materials = await fetchWechatMaterials(0, 20);
      if (materials.length > 0) {
        console.log(`ℹ️ 从「永久素材」接口拿到 ${materials.length} 条记录`);
      } else {
        console.log('ℹ️ 永久图文素材接口也未返回任何记录，请在公众号后台「素材管理 → 图文素材」确认是否有图文素材。');
      }

      for (const material of materials) {
        const { content } = material;
        if (!content || !content.news_item) continue;

        for (const article of content.news_item) {
          await syncArticleToDb(article);
        }
      }
    }

    console.log('✅ 微信文章同步任务完成');
  } catch (error) {
    console.error('❌ 同步任务失败:', error?.message || error);
  }
}



// 启动定时同步任务
function startWechatSyncSchedule() {
  if (!WECHAT_APPID || !WECHAT_APPSECRET) {
    console.log('⚠️ 微信公众号同步未启用（缺少配置）');
    return;
  }

  // 启动后延迟几秒执行一次，便于本地调试
  setTimeout(() => {
    syncWechatArticles();
  }, 5000);

  const interval = WECHAT_SYNC_INTERVAL > 0 ? WECHAT_SYNC_INTERVAL : 6;
  const cronExpression = `0 */${interval} * * *`;

  cron.schedule(cronExpression, () => {
    syncWechatArticles();
  });

  console.log(`⏰ 微信文章定时同步已启动，间隔: ${interval} 小时`);
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


// 公共：获取 logos 列表
app.get('/api/logos', async (req, res) => {
  try {
    const exists = fs.existsSync(logosDir);
    const files = exists ? await fs.promises.readdir(logosDir) : [];
    const allowedExtensions = /\.(png|jpe?g|gif|svg|webp)$/i;
    const logos = files
      .filter((fileName) => allowedExtensions.test(fileName))
      .map((fileName) => `/logos/${fileName}`);
    res.json(logos);
  } catch (error) {
    console.error('获取 logo 列表失败:', error);
    res.status(500).json({ error: '获取 logo 列表失败' });
  }
});

// 公共：智谱翻译 API 代理（基于对话模型实现中英互译）
app.post('/api/translate', async (req, res) => {
  try {
    if (!ZHIPU_API_KEY) {
      return res.status(500).json({ error: '未配置 ZHIPU_API_KEY，请在 backend/.env 中设置' });
    }

    const { text, direction } = req.body || {};
    if (!text || !String(text).trim()) {
      return res.status(400).json({ error: '请提供要翻译的文本' });
    }

    let sourceLang = 'zh';
    let targetLang = 'en';
    let directionHint = '把下面的中文翻译成自然、地道的英文，只返回译文本身，不要解释。';

    // 后端也兼容 direction = 'auto'：有中文视为中→英，否则视为英→中
    const hasChinese = /[\u4e00-\u9fff]/.test(text);
    const finalDirection = direction === 'auto' || !direction ? (hasChinese ? 'zh2en' : 'en2zh') : direction;

    if (finalDirection === 'en2zh') {
      sourceLang = 'en';
      targetLang = 'zh';
      directionHint = '把下面的英文翻译成自然、准确的中文，只返回译文本身，不要解释。';
    }


    const userContent = `${directionHint}\n\n原文（${sourceLang}）：\n${text}\n\n译文（${targetLang}）：`;

    const response = await axios.post(
      'https://open.bigmodel.cn/api/paas/v4/chat/completions',
      {
        model: 'glm-4-flash',
        messages: [
          {
            role: 'system',
            content: '你是一个高质量的中英文翻译助手。无论用户说什么，你都只返回翻译后的文本本身，不要添加解释或额外说明。',
          },
          {
            role: 'user',
            content: userContent,
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${ZHIPU_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 20000,
      }
    );

    const data = response.data || {};
    let translatedText = '';

    if (Array.isArray(data.choices) && data.choices.length > 0) {
      const msg = data.choices[0].message || {};
      const content = msg.content;

      if (typeof content === 'string') {
        translatedText = content.trim();
      } else if (Array.isArray(content)) {
        translatedText = content
          .map((part) => {
            if (!part) return '';
            if (typeof part === 'string') return part;
            if (typeof part.text === 'string') return part.text;
            if (typeof part.content === 'string') return part.content;
            return '';
          })
          .join('')
          .trim();
      }
    }

    if (!translatedText) {
      return res.status(500).json({ error: '翻译结果为空，请稍后重试' });
    }

    res.json({ translatedText });
  } catch (error) {
    console.error('调用智谱翻译失败:', error?.response?.data || error?.message || error);
    const status = error?.response?.status || 500;
    const msg =
      error?.response?.data?.error?.message ||
      error?.response?.data?.msg ||
      error?.response?.data?.error ||
      '调用智谱翻译失败，请稍后重试';
    res.status(status).json({ error: msg });
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

// 前台：作品点赞
app.post('/api/portfolios/:id/like', async (req, res) => {
  const { id } = req.params;

  try {
    const connection = await pool.getConnection();
    try {
      await connection.query('UPDATE portfolios SET likes = likes + 1 WHERE id = ?', [id]);
      const [rows] = await connection.query(
        'SELECT likes FROM portfolios WHERE id = ? LIMIT 1',
        [id]
      );
      if (!rows.length) {
        return res.status(404).json({ error: '作品不存在' });
      }
      res.json({ likes: rows[0].likes });
    } finally {
      connection.release();
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== 从微信公众号导入单篇文章（粘贴链接或HTML） =====

app.post('/api/admin/import-wechat', requireAdmin, async (req, res) => {
  try {
    const { url, html } = req.body || {};

    if (!url && !html) {
      return res.status(400).json({ error: '请提供公众号文章链接或HTML内容' });
    }

    let htmlSource = html || '';

    if (!htmlSource && url) {
      try {
        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
            Referer: 'https://mp.weixin.qq.com/',
          },
          timeout: 15000,
        });
        htmlSource = response.data;
      } catch (error) {
        console.error('获取公众号文章HTML失败:', error?.message || error);
        return res.status(500).json({ error: '无法拉取公众号文章内容，请检查链接是否可访问' });
      }
    }

    if (!htmlSource) {
      return res.status(400).json({ error: '未能获取到文章HTML内容' });
    }

    const $ = cheerio.load(htmlSource);

    // 标题
    const title = ($('#activity-name').text() || $('meta[property="og:title"]').attr('content') || $('h1').first().text() || '').trim();

    // 正文 HTML（微信主体一般在 #js_content 或 .rich_media_content 内）
    const rawContentHtml = $('#js_content').html() || $('.rich_media_content').html() || '';
    const cleanedContentHtml = cleanWechatHtml(rawContentHtml || '');

    // 封面图（优先 og:image 其后首图）
    const coverFromMeta = $('meta[property="og:image"]').attr('content');
    const firstImg = $('#js_content img').first();
    const coverFromImg = firstImg.attr('data-src') || firstImg.attr('src');
    const coverRemote = coverFromMeta || coverFromImg || '';

    // 下载封面到本地
    const localCoverImage = coverRemote ? await downloadWechatImage(coverRemote) : '';

    // 原文链接
    const originalUrl = url || $('meta[property="og:url"]').attr('content') || '';

    // 去重：同一 wechat_url 不重复导入
    if (originalUrl) {
      const [existing] = await pool.query(
        'SELECT id FROM blog_posts WHERE wechat_url = ? LIMIT 1',
        [originalUrl]
      );
      if (existing.length > 0) {
        console.log(`⏭️  该文章已存在，直接返回数据库中的记录: ${title}`);
        const [rows] = await pool.query('SELECT * FROM blog_posts WHERE id = ? LIMIT 1', [existing[0].id]);
        return res.json(rows[0]);
      }
    }

    // 插入数据库
    const [result] = await pool.query(
      `INSERT INTO blog_posts (title, content, category, author, cover_image, wechat_url)
       VALUES (?, ?, ?, ?, ?, ?)` ,
      [
        title || '未命名公众号文章',
        cleanedContentHtml || rawContentHtml || '内容同步中...',
        '公众号导入',
        '微信公众号',
        localCoverImage || null,
        originalUrl || null,
      ]
    );

    const insertedId = result.insertId;
    const [rows] = await pool.query('SELECT * FROM blog_posts WHERE id = ? LIMIT 1', [insertedId]);
    const post = rows[0];

    console.log(`✅ 从公众号导入文章成功: ${post.title}`);

    return res.json(post);
  } catch (error) {
    console.error('❌ 从公众号导入文章失败:', error?.message || error);
    return res.status(500).json({ error: '导入失败，请稍后重试' });
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
  const { title, content, category, cover_image, wechat_url } = req.body;

  try {
    const [result] = await pool.query(
      `INSERT INTO blog_posts (title, content, category, cover_image, wechat_url)
       VALUES (?, ?, ?, ?, ?)` ,
      [title, content, category, cover_image, wechat_url || null]
    );
    res.json({ id: result.insertId, message: '文章发布成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


app.put('/api/posts/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { title, content, category, cover_image, wechat_url } = req.body;

  try {
    await pool.query(
      `UPDATE blog_posts
       SET title = ?, content = ?, category = ?, cover_image = ?, wechat_url = ?
       WHERE id = ?` ,
      [title, content, category, cover_image, wechat_url || null, id]
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

// ===== 快速提示词元素配置 API =====

const defaultPromptElements = {
  styles: [
    '写实主义',
    '印象派',
    '赛博朋克',
    '蒸汽朋克',
    '极简主义',
    '超现实主义',
    '复古风',
    '国风（中式美学）',
    '二次元（动漫风）',
    '哥特风',
    '波普艺术',
    '洛可可风格',
  ],
  moods: ['宁静', '神秘', '欢快', '忧郁', '史诗', '梦幻', '治愈', '紧张', '复古', '温馨', '诡异', '热血'],
  lighting: [
    '柔和光线',
    '戏剧性光线',
    '霓虹灯',
    '自然光',
    '逆光',
    '黄金时刻',
    '侧光',
    '顶光',
    '暖光',
    '冷光',
    '柔光箱光',
    '轮廓光',
  ],
  quality: [
    '8K',
    '超高清',
    '精细细节',
    '电影级',
    '专业摄影',
    '杰作',
    '高清（1080P）',
    '4K',
    '商业级',
    '艺术级',
    '高质感',
    '细腻画质',
  ],
  artists: [
    '梵高',
    '莫奈',
    '毕加索',
    '达·芬奇',
    '克林姆特',
    '霍珀',
    '吉卜力风',
    '宫崎骏',
    '新海诚',
    '安塞尔·亚当斯',
    '班克斯（街头涂鸦）',
  ],
};

function parsePromptElementsRow(row) {
  const parse = (text, fallback) => {
    if (!text) return fallback;
    const s = String(text);

    // 优先按换行分隔（新格式），若没有换行则按逗号分隔（兼容旧数据）
    if (s.includes('\n')) {
      return s
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean);
    }

    return s
      .split(/[,，]/)
      .map((item) => item.trim())
      .filter(Boolean);
  };

  return {
    styles: parse(row.styles, defaultPromptElements.styles),
    moods: parse(row.moods, defaultPromptElements.moods),
    lighting: parse(row.lighting, defaultPromptElements.lighting),
    quality: parse(row.quality, defaultPromptElements.quality),
    artists: parse(row.artists, defaultPromptElements.artists),
  };
}

app.get('/api/prompt-elements', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM prompt_elements_config ORDER BY id ASC LIMIT 1'
    );

    if (!rows.length) {
      return res.json(defaultPromptElements);
    }

    const row = rows[0];
    return res.json(parsePromptElementsRow(row));
  } catch (error) {
    console.error('获取快速元素配置失败:', error);
    res.status(500).json({ error: '获取快速元素配置失败' });
  }
});

app.put('/api/prompt-elements', requireAdmin, async (req, res) => {
  try {
    const { styles, moods, lighting, quality, artists } = req.body || {};

    const toText = (value) => {
      if (Array.isArray(value)) {
        // 存库时使用换行分隔，标签内部可以包含逗号等标点
        return value.join('\n');
      }
      if (typeof value === 'string') {
        return value;
      }
      return '';
    };

    const stylesText = toText(styles);
    const moodsText = toText(moods);
    const lightingText = toText(lighting);
    const qualityText = toText(quality);
    const artistsText = toText(artists);

    const [rows] = await pool.query(
      'SELECT id FROM prompt_elements_config ORDER BY id ASC LIMIT 1'
    );

    if (!rows.length) {
      const [result] = await pool.query(
        `INSERT INTO prompt_elements_config (styles, moods, lighting, quality, artists)
         VALUES (?, ?, ?, ?, ?)` ,
        [stylesText, moodsText, lightingText, qualityText, artistsText]
      );
      return res.json({ id: result.insertId, message: '快速元素配置已创建' });
    }

    const id = rows[0].id;

    await pool.query(
      `UPDATE prompt_elements_config
       SET styles = ?, moods = ?, lighting = ?, quality = ?, artists = ?
       WHERE id = ?` ,
      [stylesText, moodsText, lightingText, qualityText, artistsText, id]
    );

    res.json({ id, message: '快速元素配置已更新' });
  } catch (error) {
    console.error('保存快速元素配置失败:', error);
    res.status(500).json({ error: '保存快速元素配置失败' });
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
      // 已关闭自动定时同步，如需开启请调用 startWechatSyncSchedule();
    });
  })
  .catch((error) => {
    console.error('数据库初始化失败:', error);
    process.exit(1);
  });

