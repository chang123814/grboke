import { useEffect, useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Plus, Edit2, Trash2, Save, LogOut, Lock } from 'lucide-react';

const portfolioCategories = [
  'Icon设计',
  'IP人物形象设计',
  '微观世界摄影',
  '产品海报',
  '人像摄影',
  '图生图技术展示',
  '文生图技术展示',
];

const defaultProfile = {
  display_name: '清寒 · AI 创作者',
  subtitle: 'AI Art · Prompt Engineering · Creative Coding',
  bio: '喜欢用算法与提示词构建叙事性的视觉世界，从赛博朋克城市到梦境森林，再到抽象情绪流，清寒居希望成为记录这些作品与灵感的安静角落。',
  email: 'contact@example.com',
  github: 'https://github.com',
  twitter: 'https://twitter.com',
  wechat: '可根据需要添加微信，方便深入沟通',
  phone: '',
};

const defaultPromptElements = {
  styles: [
    '写实主义',
    '印象派',
    '赛博朋克',
    '蒸汽朋克',
    '极简主义',
    '超 surrealism',
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

const ADMIN_TOKEN_KEY = 'admin_token';

const Admin = () => {
  const [authed, setAuthed] = useState(false);
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  const [tab, setTab] = useState('portfolio');
  const [portfolioView, setPortfolioView] = useState('list'); // list | form

  // 作品管理
  const [works, setWorks] = useState([]);

  const [editingWorkId, setEditingWorkId] = useState(null);
  const [workForm, setWorkForm] = useState({
    title: '',
    description: '',
    image_url: '',
    category: portfolioCategories[0],
    prompt: '',
    extra_images: '',
    is_featured: false,
  });
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingExtras, setUploadingExtras] = useState(false);

  // 博客管理

  const [posts, setPosts] = useState([]);
  const [editingPostId, setEditingPostId] = useState(null);
  const [postForm, setPostForm] = useState({
    title: '',
    category: '',
    cover_image: '',
    content: '',
    wechat_url: '',
  });
  const [importSource, setImportSource] = useState('');
  const [importing, setImporting] = useState(false);


  // 个人资料管理
  const [profile, setProfile] = useState(defaultProfile);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');

  const [promptElementsConfig, setPromptElementsConfig] = useState(defaultPromptElements);
  const [savingPromptElements, setSavingPromptElements] = useState(false);
  const [promptElementsMessage, setPromptElementsMessage] = useState('');


  useEffect(() => {
    const token = window.localStorage.getItem(ADMIN_TOKEN_KEY);
    if (token) {
      axios.defaults.headers.common['x-admin-token'] = token;
      setAuthed(true);
    }
  }, []);

  useEffect(() => {
    if (!authed) return;
    fetchWorks();
    fetchProfile();
    fetchPosts();
    fetchPromptElementsConfig();
  }, [authed]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoggingIn(true);
    try {
      const res = await axios.post('/api/admin/login', { password: loginPassword });
      if (res.data && res.data.ok) {
        axios.defaults.headers.common['x-admin-token'] = loginPassword;
        window.localStorage.setItem(ADMIN_TOKEN_KEY, loginPassword);
        setAuthed(true);
        setLoginPassword('');
      }
    } catch (error) {
      setLoginError(error?.response?.data?.error || '登录失败，请检查密码');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = () => {
    delete axios.defaults.headers.common['x-admin-token'];
    window.localStorage.removeItem(ADMIN_TOKEN_KEY);
    setAuthed(false);
    setWorks([]);
    setPosts([]);
    setPromptElementsConfig(defaultPromptElements);
  };

  const fetchWorks = async () => {
    try {
      const res = await axios.get('/api/portfolios');
      setWorks(res.data || []);
    } catch (error) {
      console.error('获取作品失败:', error);
    }
  };

  const fetchPosts = async () => {
    try {
      const res = await axios.get('/api/posts', { params: { limit: 100 } });
      setPosts(res.data || []);
    } catch (error) {
      console.error('获取文章失败:', error);
    }
  };

  const handleSyncWechat = async () => {
    try {
      await axios.post('/api/admin/sync-wechat');
      alert('已触发同步公众号文章任务，请稍后刷新文章列表');
      fetchPosts();
    } catch (error) {
      alert('同步失败：' + (error?.response?.data?.error || error.message));
    }
  };

  const fetchPromptElementsConfig = async () => {
    try {
      const res = await axios.get('/api/prompt-elements');
      if (res.data) {
        setPromptElementsConfig(res.data);
      }
    } catch (error) {
      console.warn('获取快速元素配置失败，使用默认值:', error?.message || error);
      setPromptElementsConfig(defaultPromptElements);
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await axios.get('/api/profile');
      if (res.data) {
        setProfile({ ...defaultProfile, ...res.data });
      }
    } catch (error) {
      console.warn('获取个人资料失败，使用默认值:', error?.message || error);
      setProfile(defaultProfile);
    }
  };

  const resetWorkForm = () => {
    setEditingWorkId(null);
    setWorkForm({
      title: '',
      description: '',
      image_url: '',
      category: portfolioCategories[0],
      prompt: '',
      extra_images: '',
      is_featured: false,
    });
  };

  const handleCreateNewWork = () => {
    resetWorkForm();
    setPortfolioView('form');
  };

  const uploadImageFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const res = await axios.post('/api/upload-image', {
            fileName: file.name,
            data: reader.result,
          });
          const { thumbUrl, fullUrl, downloadUrl, url } = res.data || {};
          // 为兼容旧接口，优先使用缩略图地址
          resolve(thumbUrl || url || fullUrl || '');

        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleCoverFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    try {
      const url = await uploadImageFile(file);
      if (url) {
        setWorkForm((prev) => ({ ...prev, image_url: url }));
      }
    } catch (error) {
      console.error('上传封面失败:', error);
    } finally {
      setUploadingCover(false);
      e.target.value = '';
    }
  };

  const handleExtraFilesChange = async (e) => {
    const { files } = e.target;
    if (!files || files.length === 0) return;
    setUploadingExtras(true);
    try {
      const urls = [];
      for (const file of Array.from(files)) {
        const url = await uploadImageFile(file);
        if (url) urls.push(url);
      }
      if (urls.length > 0) {
        setWorkForm((prev) => ({
          ...prev,
          extra_images: [prev.extra_images, urls.join('\n')]
            .filter(Boolean)
            .join('\n'),
        }));
      }
    } catch (error) {
      console.error('上传更多图片失败:', error);
    } finally {
      setUploadingExtras(false);
      e.target.value = '';
    }
  };


  const handleWorkSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...workForm,
        is_featured: !!workForm.is_featured,
        extra_images: workForm.extra_images || null,
      };

      if (editingWorkId) {
        await axios.put(`/api/portfolios/${editingWorkId}`, payload);
      } else {
        await axios.post('/api/portfolios', payload);
      }
      await fetchWorks();
      resetWorkForm();
      setPortfolioView('list');

    } catch (error) {
      console.error('保存作品失败:', error);
    }
  };

  const handleEditWork = (work) => {
    setEditingWorkId(work.id);
    setWorkForm({
      title: work.title || '',
      description: work.description || '',
      image_url: work.image_url || '',
      category: work.category || portfolioCategories[0],
      prompt: work.prompt || '',
      extra_images: work.extra_images || '',
      is_featured: Boolean(work.is_featured),
    });
    setPortfolioView('form');
  };

  const handleRemoveCover = () => {
    setWorkForm((prev) => ({ ...prev, image_url: '' }));
  };

  const handleRemoveExtraImage = (index) => {
    const urls = workForm.extra_images.split('\n').filter(Boolean);
    urls.splice(index, 1);
    setWorkForm((prev) => ({ ...prev, extra_images: urls.join('\n') }));
  };

  const handleDeleteWork = async (id) => {

    if (!window.confirm('确定要删除这条作品吗？')) return;
    try {
      await axios.delete(`/api/portfolios/${id}`);
      await fetchWorks();
    } catch (error) {
      console.error('删除作品失败:', error);
    }
  };

  const resetPostForm = () => {
    setEditingPostId(null);
    setPostForm({
      title: '',
      category: '',
      cover_image: '',
      content: '',
      wechat_url: '',
    });
  };


  const handleImportWechat = async () => {
    const value = importSource.trim();
    if (!value) {
      alert('请先粘贴公众号文章链接或HTML内容');
      return;
    }

    const isUrl = /^https?:\/\//i.test(value);
    setImporting(true);
    try {
      const res = await axios.post('/api/admin/import-wechat', {
        url: isUrl ? value : '',
        html: isUrl ? '' : value,
      });
      const data = res.data || {};

      setEditingPostId(null);
      setPostForm({
        title: data.title || '',
        category: data.category || '公众号导入',
        cover_image: data.cover_image || '',
        content: data.content || '',
        wechat_url: data.wechat_url || (isUrl ? value : ''),
      });

      alert('已从公众号导入内容，请在右侧表单中确认后再发布');
    } catch (error) {
      alert('导入失败：' + (error?.response?.data?.error || error.message));
    } finally {
      setImporting(false);
    }
  };


  const handlePostSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingPostId) {
        await axios.put(`/api/posts/${editingPostId}`, postForm);
      } else {
        await axios.post('/api/posts', postForm);
      }
      await fetchPosts();
      resetPostForm();
    } catch (error) {
      console.error('保存文章失败:', error);
    }
  };

  const handleEditPost = (post) => {
    setEditingPostId(post.id);
    setPostForm({
      title: post.title || '',
      category: post.category || '',
      cover_image: post.cover_image || '',
      content: post.content || '',
      wechat_url: post.wechat_url || '',
    });
  };


  const handleDeletePost = async (id) => {
    if (!window.confirm('确定要删除这篇文章吗？')) return;
    try {
      await axios.delete(`/api/posts/${id}`);
      await fetchPosts();
    } catch (error) {
      console.error('删除文章失败:', error);
    }
  };

  const handleProfileChange = (field, value) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const handleSavePromptElements = async (e) => {
    e.preventDefault();
    setSavingPromptElements(true);
    setPromptElementsMessage('');
    try {
      await axios.put('/api/prompt-elements', promptElementsConfig);
      setPromptElementsMessage('保存成功');
      setTimeout(() => setPromptElementsMessage(''), 2000);
    } catch (error) {
      console.error('保存快速元素配置失败:', error);
      setPromptElementsMessage('保存失败，请稍后重试');
    } finally {
      setSavingPromptElements(false);
    }
  };

  const handlePromptElementsChange = (field, value) => {
    const items = value
      .split(/[,，\r?\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
    setPromptElementsConfig((prev) => ({ ...prev, [field]: items }));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMessage('');
    try {
      await axios.put('/api/profile', profile);
      setProfileMessage('保存成功');
      setTimeout(() => {
        setProfileMessage('');
      }, 2000);
    } catch (error) {
      console.error('保存个人资料失败:', error);
      setProfileMessage('保存失败，请稍后重试');
    } finally {
      setSavingProfile(false);
    }
  };


  if (!authed) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card bg-slate-900/90 border border-emerald-700/70 p-6 md:p-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-emerald-50">进入后台管理</h1>
                <p className="text-xs text-emerald-200/80">
                  请输入管理员密码（配置于 backend/.env 的 ADMIN_PASSWORD）。
                </p>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4 text-sm">
              <div>
                <label className="block text-emerald-100 mb-1">管理员密码</label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-emerald-50 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="请输入 ADMIN_PASSWORD"
                  required
                />
              </div>

              {loginError && (
                <div className="text-xs text-red-300 bg-red-900/40 border border-red-700/60 rounded-md px-3 py-2">
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                disabled={loggingIn}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg py-2.5 disabled:opacity-60"
              >
                {loggingIn ? '登录中…' : '登录后台'}
              </button>
            </form>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 py-10">
      <div className="container mx-auto px-4 max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-emerald-50 mb-2">
              清寒居 · 后台管理
            </h1>
            <p className="text-sm text-emerald-200/80">
              用于管理作品集、博客文章以及个人简介，仅站长本人使用。
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-2 self-start md:self-auto px-3 py-1.5 rounded-lg border border-emerald-700 text-emerald-100 text-xs hover:bg-emerald-900/60"
          >
            <LogOut className="w-4 h-4" /> 退出登录
          </button>
        </motion.div>

        <div className="inline-flex items-center rounded-xl bg-slate-900 p-1 mb-8">
          {[{
            value: 'portfolio',
            label: '作品管理',
          }, {
            value: 'blog',
            label: '博客管理',
          }, {
            value: 'promptElements',
            label: '快速元素配置',
          }, {
            value: 'profile',
            label: '个人资料',
          }].map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setTab(item.value)}
              className={`px-4 py-2 text-sm rounded-lg font-medium cursor-pointer transition-colors ${
                tab === item.value
                  ? 'bg-emerald-700 text-white'
                  : 'text-emerald-200 hover:bg-slate-800'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {tab === 'portfolio' && (
          <div className="grid gap-8 lg:grid-cols-2">
            {/* 作品列表 */}
            <div
              className={`card bg-slate-900/80 border border-emerald-800/60 p-4 md:p-6 ${
                portfolioView !== 'list' ? 'hidden' : ''
              }`}
            >

              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-emerald-50 flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-700/80 text-xs">
                    列表
                  </span>
                  已有作品
                </h2>
                  <button
                    type="button"
                    onClick={handleCreateNewWork}
                    className="inline-flex items-center gap-1 text-xs px-3 py-1 rounded-lg bg-slate-800 text-emerald-100 hover:bg-slate-700"
                  >

                  <Plus className="w-3 h-3" /> 新建
                </button>
              </div>

              <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                {works.length === 0 && (
                  <div className="text-xs text-emerald-300/70 py-6 text-center">
                    目前还没有作品数据，可以在右侧表单中新增。
                  </div>
                )}
                {works.map((work) => (
                  <div
                    key={work.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-slate-900/80 border border-slate-800"
                  >
                    <div className="w-16 h-16 rounded-md overflow-hidden bg-slate-800 flex-shrink-0">
                      {work.image_url && (
                        <img
                          src={work.image_url}
                          alt={work.title}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h3 className="text-sm font-semibold text-emerald-50 truncate">
                          {work.title}
                        </h3>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-800/80 text-emerald-100 whitespace-nowrap">
                          {work.category}
                        </span>
                      </div>
                      <p className="text-xs text-emerald-200/70 line-clamp-2 mb-1">
                        {work.description}
                      </p>
                      {work.is_featured ? (
                        <div className="text-[10px] text-amber-300 mb-1">首页封面作品</div>
                      ) : null}
                      <div className="flex items-center gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => handleEditWork(work)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 text-emerald-100 hover:bg-slate-700"
                        >
                          <Edit2 className="w-3 h-3" /> 编辑
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteWork(work.id)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-900/80 text-red-100 hover:bg-red-800"
                        >
                          <Trash2 className="w-3 h-3" /> 删除
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 作品表单 */}
            <div
              className={`card bg-slate-900/80 border border-emerald-800/60 p-4 md:p-6 ${
                portfolioView !== 'form' ? 'hidden' : ''
              }`}
            >

              <h2 className="text-lg font-semibold text-emerald-50 mb-4 flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-700/80 text-xs">
                  {editingWorkId ? '编辑' : '新建'}
                </span>
                {editingWorkId ? '编辑作品' : '新建作品'}
              </h2>
              <button
                type="button"
                onClick={() => setPortfolioView('list')}
                className="ml-auto text-xs text-emerald-200 hover:text-emerald-100"
              >
                返回列表
              </button>

              <form onSubmit={handleWorkSubmit} className="space-y-3 text-sm">
                <div>
                  <label className="block text-emerald-100 mb-1">标题</label>
                  <input
                    type="text"
                    value={workForm.title}
                    onChange={(e) => setWorkForm({ ...workForm, title: e.target.value })}
                    className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-emerald-50 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-emerald-100 mb-1">分类</label>
                    <select
                      value={workForm.category}
                      onChange={(e) => setWorkForm({ ...workForm, category: e.target.value })}
                      className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-emerald-50 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      {portfolioCategories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2 pt-5">
                    <input
                      id="is_featured"
                      type="checkbox"
                      checked={workForm.is_featured}
                      onChange={(e) => setWorkForm({ ...workForm, is_featured: e.target.checked })}
                      className="w-4 h-4 rounded border-slate-600 bg-slate-950 text-emerald-500"
                    />
                    <label htmlFor="is_featured" className="text-emerald-100 text-xs">
                      用作首页代表作品（圆环展示）
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-emerald-100 mb-1">封面图片</label>
                  <div className="flex items-center gap-3 mb-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCoverFileChange}
                      className="text-xs text-emerald-100"
                    />
                    {uploadingCover && (
                      <span className="text-xs text-emerald-300">上传中…</span>
                    )}
                  </div>
                  {workForm.image_url && (
                    <div className="relative w-32 h-20 rounded-md overflow-hidden border border-slate-700 mb-2 group">
                      <img
                        src={workForm.image_url}
                        alt="封面预览"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveCover}
                        className="absolute top-1 right-1 p-1 bg-red-600/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        title="删除封面"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                </div>

                <div>
                  <label className="block text-emerald-100 mb-1">更多图片（可选，多张可一次选择）</label>
                  <div className="flex items-center gap-3 mb-2">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleExtraFilesChange}
                      className="text-xs text-emerald-100"
                    />
                    {uploadingExtras && (
                      <span className="text-xs text-emerald-300">上传中…</span>
                    )}
                  </div>
                  {workForm.extra_images && (
                    <div className="space-y-2">
                      <p className="text-xs text-emerald-300">
                        已上传 {workForm.extra_images.split('\n').filter(Boolean).length} 张图片
                      </p>
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
                        {workForm.extra_images
                          .split('\n')
                          .filter(Boolean)
                          .map((url, index) => (
                            <div
                              key={index}
                              className="relative w-20 h-20 rounded-md overflow-hidden border border-slate-700 bg-slate-800 group"
                            >
                              <img
                                src={url}
                                alt={`附图${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveExtraImage(index)}
                                className="absolute top-1 right-1 p-1 bg-red-600/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                title="删除此图"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                      </div>

                    </div>
                  )}
                </div>



                <div>
                  <label className="block text-emerald-100 mb-1">作品简介</label>
                  <textarea
                    rows={3}
                    value={workForm.description}
                    onChange={(e) => setWorkForm({ ...workForm, description: e.target.value })}
                    className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-emerald-50 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-emerald-100 mb-1">模型参数（可选）</label>

                  <textarea
                    rows={4}
                    value={workForm.prompt}
                    onChange={(e) => setWorkForm({ ...workForm, prompt: e.target.value })}
                    className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-emerald-50 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={resetWorkForm}
                    className="text-xs text-emerald-200 hover:text-emerald-100"
                  >
                    清空表单
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500"
                  >
                    <Save className="w-4 h-4" />
                    {editingWorkId ? '保存修改' : '保存作品'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {tab === 'blog' && (
          <div className="grid gap-8 lg:grid-cols-2">
            {/* 文章列表 */}
            <div className="card bg-slate-900/80 border border-emerald-800/60 p-4 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-emerald-50 flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-700/80 text-xs">
                    列表
                  </span>
                  已有文章
                </h2>
                <button
                  type="button"
                  onClick={resetPostForm}
                  className="inline-flex items-center gap-1 text-xs px-3 py-1 rounded-lg bg-slate-800 text-emerald-100 hover:bg-slate-700"
                >
                  <Plus className="w-3 h-3" /> 新建
                </button>
              </div>


              <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                {posts.length === 0 && (
                  <div className="text-xs text-emerald-300/70 py-6 text-center">
                    目前还没有文章数据，可以在右侧表单中新增。
                  </div>
                )}
                {posts.map((post) => (
                  <div
                    key={post.id}
                    className="p-3 rounded-lg bg-slate-900/80 border border-slate-800"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-emerald-50 line-clamp-1">
                        {post.title}
                      </h3>
                      {post.category && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-800/80 text-emerald-100 whitespace-nowrap">
                          {post.category}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-emerald-200/70 line-clamp-2 mb-2">
                      {post.content}
                    </p>
                    {post.wechat_url && (
                      <div className="text-[10px] text-emerald-300 mb-1">
                        已配置评论跳转链接
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs">

                      <button
                        type="button"
                        onClick={() => handleEditPost(post)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 text-emerald-100 hover:bg-slate-700"
                      >
                        <Edit2 className="w-3 h-3" /> 编辑
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePost(post.id)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-900/80 text-red-100 hover:bg-red-800"
                      >
                        <Trash2 className="w-3 h-3" /> 删除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 文章表单 */}
            <div className="card bg-slate-900/80 border border-emerald-800/60 p-4 md:p-6">
              <h2 className="text-lg font-semibold text-emerald-50 mb-4 flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-700/80 text-xs">
                  {editingPostId ? '编辑' : '新建'}
                </span>
                {editingPostId ? '编辑文章' : '新建文章'}
              </h2>
              <form onSubmit={handlePostSubmit} className="space-y-3 text-sm">
                <div className="p-3 rounded-lg bg-slate-800/70 border border-slate-700 mb-2">
                  <label className="block text-emerald-100 mb-1 text-xs">从微信公众号导入</label>
                  <textarea
                    rows={3}
                    value={importSource}
                    onChange={(e) => setImportSource(e.target.value)}
                    className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-emerald-50 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                    placeholder="粘贴公众号文章链接（https://mp.weixin.qq.com/ 开头），或整篇文章HTML源码"
                  />
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-[11px] text-emerald-300/80 pr-2">
                      仅支持你本人公众号的公开文章，导入后可在下方编辑再发布。
                    </p>
                    <button
                      type="button"
                      onClick={handleImportWechat}
                      disabled={importing}
                      className="inline-flex items-center gap-1 text-xs px-3 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-60"
                    >
                      {importing ? '导入中…' : '从公众号导入'}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-emerald-100 mb-1">标题</label>
                  <input
                    type="text"
                    value={postForm.title}
                    onChange={(e) => setPostForm({ ...postForm, title: e.target.value })}
                    className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-emerald-50 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-emerald-100 mb-1">分类</label>
                    <input
                      type="text"
                      value={postForm.category}
                      onChange={(e) => setPostForm({ ...postForm, category: e.target.value })}
                      className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-emerald-50 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      placeholder="例如：教程 / 趋势 / 随笔"
                    />
                  </div>
                  <div>
                    <label className="block text-emerald-100 mb-1">封面图片地址（可选）</label>
                    <input
                      type="text"
                      value={postForm.cover_image}
                      onChange={(e) => setPostForm({ ...postForm, cover_image: e.target.value })}
                      className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-emerald-50 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      placeholder="文章列表与详情页封面图"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-emerald-100 mb-1">评论跳转链接（微信公众号文章）</label>
                  <input
                    type="url"
                    value={postForm.wechat_url}
                    onChange={(e) => setPostForm({ ...postForm, wechat_url: e.target.value })}
                    className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-emerald-50 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    placeholder="例如：https://mp.weixin.qq.com/ 开头的文章链接"
                  />
                  <p className="mt-1 text-xs text-emerald-300/80">
                    若留空，前台评论按钮会提示“暂未配置评论链接”，不会发起跳转。
                  </p>
                </div>

                <div>
                  <label className="block text-emerald-100 mb-1">正文内容（支持 Markdown）</label>
                  <textarea
                    rows={8}
                    value={postForm.content}
                    onChange={(e) => setPostForm({ ...postForm, content: e.target.value })}
                    className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-emerald-50 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                    placeholder="直接写正文，支持 Markdown 标题、列表、加粗等标记。"
                  />
                </div>


                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={resetPostForm}
                    className="text-xs text-emerald-200 hover:text-emerald-100"
                  >
                    清空表单
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500"
                  >
                    <Save className="w-4 h-4" />
                    {editingPostId ? '保存修改' : '发布文章'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {tab === 'promptElements' && (
          <div className="card bg-slate-900/80 border border-emerald-800/60 p-4 md:p-6 max-w-3xl mb-8">
            <h2 className="text-lg font-semibold text-emerald-50 mb-4 flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-700/80 text-xs">
                提示词
              </span>
              快速添加元素配置
            </h2>
            <form onSubmit={handleSavePromptElements} className="space-y-4 text-sm">
              <p className="text-xs text-emerald-300/80">
                推荐使用中文逗号分隔标签（也兼容换行），保存后会应用到前台“AI提示词工具 → 快速添加元素”区域。
              </p>
              <div>
                <label className="block text-emerald-100 mb-1">风格（styles）</label>
                <textarea
                  rows={3}
                  value={promptElementsConfig.styles.join('， ')}
                  onChange={(e) => handlePromptElementsChange('styles', e.target.value)}
                  className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-emerald-50 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-emerald-100 mb-1">氛围（moods）</label>
                <textarea
                  rows={3}
                  value={promptElementsConfig.moods.join('， ')}
                  onChange={(e) => handlePromptElementsChange('moods', e.target.value)}
                  className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-emerald-50 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-emerald-100 mb-1">艺术家名字（artists）</label>
                <textarea
                  rows={3}
                  value={(promptElementsConfig.artists || []).join('， ')}
                  onChange={(e) => handlePromptElementsChange('artists', e.target.value)}
                  className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-emerald-50 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-emerald-100 mb-1">光线（lighting）</label>
                <textarea
                  rows={3}
                  value={promptElementsConfig.lighting.join('， ')}
                  onChange={(e) => handlePromptElementsChange('lighting', e.target.value)}
                  className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-emerald-50 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-emerald-100 mb-1">质量（quality）</label>
                <textarea
                  rows={3}
                  value={promptElementsConfig.quality.join('， ')}
                  onChange={(e) => handlePromptElementsChange('quality', e.target.value)}
                  className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-emerald-50 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                />
              </div>
              <div className="flex items-center justify-end pt-2">
                {promptElementsMessage && (
                  <span
                    className={`text-xs mr-3 ${
                      promptElementsMessage === '保存成功' ? 'text-emerald-300' : 'text-red-300'
                    }`}
                  >
                    {promptElementsMessage}
                  </span>
                )}
                <button
                  type="submit"
                  disabled={savingPromptElements}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500 disabled:opacity-60"
                >
                  <Save className="w-4 h-4" /> {savingPromptElements ? '保存中...' : '保存元素配置'}
                </button>
              </div>
            </form>
          </div>
        )}

        {tab === 'profile' && (
          <div className="card bg-slate-900/80 border border-emerald-800/60 p-4 md:p-6 max-w-3xl">
            <h2 className="text-lg font-semibold text-emerald-50 mb-4 flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-700/80 text-xs">
                资料
              </span>
              个人简介与联系方式
            </h2>
            <form onSubmit={handleSaveProfile} className="space-y-3 text-sm">
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-emerald-100 mb-1">展示名称</label>
                  <input
                    type="text"
                    value={profile.display_name}
                    onChange={(e) => handleProfileChange('display_name', e.target.value)}
                    className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-emerald-50 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-emerald-100 mb-1">副标题 / 标签</label>
                  <input
                    type="text"
                    value={profile.subtitle}
                    onChange={(e) => handleProfileChange('subtitle', e.target.value)}
                    className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-emerald-50 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-emerald-100 mb-1">个人简介</label>
                <textarea
                  rows={4}
                  value={profile.bio}
                  onChange={(e) => handleProfileChange('bio', e.target.value)}
                  className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-emerald-50 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-emerald-100 mb-1">邮箱</label>
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(e) => handleProfileChange('email', e.target.value)}
                    className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-emerald-50 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-emerald-100 mb-1">GitHub 链接</label>
                  <input
                    type="text"
                    value={profile.github}
                    onChange={(e) => handleProfileChange('github', e.target.value)}
                    className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-emerald-50 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-emerald-100 mb-1">Twitter / X 链接</label>
                  <input
                    type="text"
                    value={profile.twitter}
                    onChange={(e) => handleProfileChange('twitter', e.target.value)}
                    className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-emerald-50 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-emerald-100 mb-1">手机号（可选）</label>
                  <input
                    type="text"
                    value={profile.phone || ''}
                    onChange={(e) => handleProfileChange('phone', e.target.value)}
                    className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-emerald-50 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-emerald-100 mb-1">微信 / 其他说明</label>
                <input
                  type="text"
                  value={profile.wechat}
                  onChange={(e) => handleProfileChange('wechat', e.target.value)}
                  className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-emerald-50 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end pt-2">
                {profileMessage && (
                  <span
                    className={`text-xs mr-3 ${
                      profileMessage === '保存成功' ? 'text-emerald-300' : 'text-red-300'
                    }`}
                  >
                    {profileMessage}
                  </span>
                )}
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500 disabled:opacity-60"
                >
                  <Save className="w-4 h-4" /> {savingProfile ? '保存中...' : '保存资料'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
