import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Palette,
  Wand2,
  BookOpen,
  User,
  Mail,
  Github,
  Phone,
  Twitter,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';

const staticHighlightWorks = [
  {
    title: '赛博霓虹之城',
    description: '以赛博朋克美学重构夜色城市，强调光影对比与细节刻画。',
    imageUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=900',
    tag: '代表作品 · 科幻城市',
  },
  {
    title: '梦境森林之光',
    description: '以体积光与颗粒效果营造梦境般的奇幻森林空间。',
    imageUrl: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=900',
    tag: '代表作品 · 奇幻场景',
  },
  {
    title: '抽象情绪流',
    description: '以色块与流动线条表现情绪张力与节奏感。',
    imageUrl: 'https://images.unsplash.com/photo-1534237710431-e2fc698436d0?w=900',
    tag: '代表作品 · 抽象艺术',
  },
];

const Home = () => {
  const features = [
    {
      icon: <Palette className="w-12 h-12" />,
      title: 'AI作品集',
      description: '展示使用AI技术创作的精美艺术作品，探索无限创意可能',
      link: '/portfolio',
      color: 'from-emerald-700 to-emerald-500',
    },
    {
      icon: <Wand2 className="w-12 h-12" />,
      title: '提示词工具',
      description: '强大的AI提示词编辑器，帮助你优化和完善创作指令',
      link: '/prompt-editor',
      color: 'from-amber-500 to-yellow-400',
    },
    {
      icon: <BookOpen className="w-12 h-12" />,
      title: '技术博客',
      description: '分享AI创作心得、技术教程和行业趋势分析',
      link: '/blog',
      color: 'from-slate-800 to-emerald-900',
    },
  ];

  const [highlightWorks, setHighlightWorks] = useState(staticHighlightWorks);
  const [activeWorkIndex, setActiveWorkIndex] = useState(0);
  const [profile, setProfile] = useState({
    display_name: '清寒 · AI 创作者',
    subtitle: 'AI Art · Prompt Engineering · Creative Coding',
    bio: '喜欢用算法与提示词构建叙事性的视觉世界，从赛博朋克城市到梦境森林，再到抽象情绪流，清寒居希望成为记录这些作品与灵感的安静角落。',
    email: 'contact@example.com',
    github: 'https://github.com',
    twitter: 'https://twitter.com',
    wechat: '可根据需要添加微信，方便深入沟通',
    phone: '',
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveWorkIndex((prev) => (prev + 1) % highlightWorks.length);
    }, 6000);

    return () => clearInterval(interval);
  }, [highlightWorks.length]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get('/api/profile');
        if (res.data) {
          setProfile((prev) => ({ ...prev, ...res.data }));
        }
      } catch (error) {
        console.warn('获取个人资料失败，继续使用默认配置:', error?.message || error);
      }
    };

    const fetchFeaturedWorks = async () => {
      try {
        const res = await axios.get('/api/portfolios', {
          params: { featured: true, limit: 3 },
        });
        const data = Array.isArray(res.data) ? res.data : [];
        if (data.length > 0) {
          const mapped = data.map((item) => ({
            title: item.title,
            description: item.description,
            imageUrl: item.image_url,
            tag: `代表作品 · ${item.category || '作品'}`,
          }));
          setHighlightWorks(mapped);
          setActiveWorkIndex(0);
        }
      } catch (error) {
        console.warn('获取首页代表作品失败，将继续使用默认示例:', error?.message || error);
      }
    };

    fetchProfile();
    fetchFeaturedWorks();
  }, []);

  const goToPrevWork = () => {
    setActiveWorkIndex((prev) => (prev - 1 + highlightWorks.length) % highlightWorks.length);
  };

  const goToNextWork = () => {
    setActiveWorkIndex((prev) => (prev + 1) % highlightWorks.length);
  };

  const activeWork = highlightWorks[activeWorkIndex];

  const orbitPositions = [
    'top-0 left-1/2 -translate-x-1/2',
    'bottom-6 left-3',
    'bottom-6 right-3',
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-950 py-20 md:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto"
          >
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-secondary via-amber-300 to-secondary bg-clip-text text-transparent">
              AI艺术创作者的数字空间
            </h1>
            <p className="text-xl md:text-2xl text-emerald-50/80 mb-8 leading-relaxed">
              在墨绿与金色的世界里，让算法与想象力共同绘制你的视觉宇宙
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/portfolio" className="btn-primary inline-flex items-center justify-center gap-2">
                查看作品集
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link to="/prompt-editor" className="btn-secondary inline-flex items-center justify-center gap-2">
                尝试提示词工具
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Personal & Highlight Works Section */}
      <section className="py-16 bg-emerald-950/95">
        <div className="container mx-auto px-4 max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10"
          >
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-3 text-emerald-50">关于清寒居</h2>
              <p className="text-emerald-100/80 max-w-2xl">
                {profile.bio}
              </p>
            </div>
            <p className="text-sm text-emerald-200/80">
              个人简介 · 联系方式 · 代表作品圆环展播
            </p>
          </motion.div>

          <div className="grid gap-8 lg:grid-cols-2 items-stretch">
            {/* 左侧：个人简介 + 联系方式合并区域 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.05 }}
              className="card p-6 md:p-8 flex flex-col bg-emerald-900/60 border border-emerald-700/60"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-2xl font-semibold">
                  寒
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <User className="w-5 h-5 text-secondary" />
                    <h3 className="text-xl font-semibold text-emerald-50">{profile.display_name}</h3>
                  </div>
                  <p className="text-xs text-emerald-200/80">{profile.subtitle}</p>
                </div>
              </div>

              <p className="text-emerald-100/90 text-sm leading-relaxed mb-6">
                {profile.bio}
              </p>

              <div className="mt-auto">
                <h4 className="text-sm font-semibold text-emerald-50 mb-3">联系方式</h4>
                <div className="space-y-3 text-sm">
                  {profile.email && (
                    <a
                      href={`mailto:${profile.email}`}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-emerald-800/80 transition-colors"
                    >
                      <span className="w-9 h-9 rounded-full bg-emerald-800 flex items-center justify-center">
                        <Mail className="w-4 h-4 text-amber-300" />
                      </span>
                      <div>
                        <div className="font-medium text-emerald-50">邮箱</div>
                        <div className="text-emerald-200/80 text-xs">{profile.email}</div>
                      </div>
                    </a>
                  )}

                  {profile.github && (
                    <a
                      href={profile.github}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-emerald-800/80 transition-colors"
                    >
                      <span className="w-9 h-9 rounded-full bg-slate-900 flex items-center justify-center">
                        <Github className="w-4 h-4 text-amber-300" />
                      </span>
                      <div>
                        <div className="font-medium text-emerald-50">GitHub</div>
                        <div className="text-emerald-200/80 text-xs">开源项目与实验作品</div>
                      </div>
                    </a>
                  )}

                  {profile.twitter && (
                    <a
                      href={profile.twitter}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-emerald-800/80 transition-colors"
                    >
                      <span className="w-9 h-9 rounded-full bg-sky-900/80 flex items-center justify-center">
                        <Twitter className="w-4 h-4 text-sky-300" />
                      </span>
                      <div>
                        <div className="font-medium text-emerald-50">Twitter / X</div>
                        <div className="text-emerald-200/80 text-xs">分享创作过程与灵感片段</div>
                      </div>
                    </a>
                  )}

                  <div className="flex items-center gap-3 p-2 rounded-lg">
                    <span className="w-9 h-9 rounded-full bg-emerald-800 flex items-center justify-center">
                      <Phone className="w-4 h-4 text-emerald-200" />
                    </span>
                    <div>
                      <div className="font-medium text-emerald-50">微信 / 即时沟通</div>
                      <div className="text-emerald-200/80 text-xs">
                        {profile.wechat || '可根据需要添加微信，方便深入沟通'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* 右侧：代表作品圆环转动展播区 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.12 }}
              className="card p-6 md:p-8 overflow-hidden flex flex-col bg-slate-950/80 border border-emerald-700/60"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-emerald-50">代表作品 · 圆环展播</h3>
                  <p className="text-xs text-emerald-200/80 mt-1">自动轮播 · 支持手动切换 · 点击圆环节点查看</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={goToPrevWork}
                    className="w-8 h-8 rounded-full border border-emerald-700 flex items-center justify-center hover:bg-emerald-800/80 text-emerald-100"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={goToNextWork}
                    className="w-8 h-8 rounded-full border border-emerald-700 flex items-center justify-center hover:bg-emerald-800/80 text-emerald-100"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex flex-col lg:flex-row gap-6 items-center lg:items-stretch">
                {/* 圆环轨道 */}
                <div className="flex-1 flex items-center justify-center">
                  <div className="relative w-64 h-64 md:w-80 md:h-80">
                    <div className="absolute inset-6 rounded-full border border-emerald-700/60" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-primary to-secondary opacity-20 blur-xl" />
                    </div>
                    {/* 外圈绕圈运动 */}
                    <div className="absolute inset-0 animate-[spin_24s_linear_infinite]">
                      {highlightWorks.map((work, index) => (
                        <button
                          key={work.title}
                          type="button"
                          onClick={() => setActiveWorkIndex(index)}
                          className={`absolute ${orbitPositions[index]} w-14 h-14 md:w-16 md:h-16 rounded-full overflow-hidden border-2 transition-all duration-300 ${
                            index === activeWorkIndex
                              ? 'border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.6)] scale-110'
                              : 'border-emerald-700/70 opacity-80 hover:opacity-100'
                          }`}
                        >
                          {/* 图片做反向旋转，抵消外圈旋转，保证始终正向 */}
                          <img
                            src={work.imageUrl}
                            alt={work.title}
                            className="w-full h-full object-cover"
                            style={{ animation: 'spin 24s linear infinite reverse' }}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 中心大图与文字介绍 */}
                <div className="flex-1 space-y-3 max-w-md">
                  <div className="rounded-xl overflow-hidden border border-emerald-700/60">
                    <img
                      src={activeWork.imageUrl}
                      alt={activeWork.title}
                      className="w-full h-40 md:h-52 object-cover"
                    />
                  </div>
                  <div>
                    <div className="text-xs text-amber-300 mb-1">{activeWork.tag}</div>
                    <h4 className="text-xl font-semibold text-emerald-50 mb-2">
                      {activeWork.title}
                    </h4>
                    <p className="text-sm text-emerald-100/90 leading-relaxed">
                      {activeWork.description}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-slate-950">
        <div className="container mx-auto px-4">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-bold text-center mb-16 text-emerald-50"
          >
            核心功能
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Link to={feature.link} className="block group">
                  <div className="card p-8 h-full bg-emerald-900/60 border border-emerald-700/60 hover:scale-105 transition-transform">
                    <div
                      className={`inline-block p-4 rounded-2xl bg-gradient-to-br ${feature.color} text-white mb-6 group-hover:scale-110 transition-transform`}
                    >
                      {feature.icon}
                    </div>
                    <h3 className="text-2xl font-semibold mb-4 text-emerald-50">{feature.title}</h3>
                    <p className="text-emerald-100/80 mb-6 leading-relaxed">{feature.description}</p>
                    <div className="flex items-center text-amber-300 font-medium group-hover:gap-3 gap-2 transition-all">
                      了解更多
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary to-secondary text-slate-950">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6">开始你的AI创作之旅</h2>
            <p className="text-xl mb-8 opacity-90">让墨绿色调的创作空间，成为你灵感落地的起点</p>
            <Link
              to="/prompt-editor"
              className="inline-block bg-slate-950 text-amber-300 px-8 py-4 rounded-lg font-semibold hover:bg-slate-900 transition-colors shadow-lg"
            >
              立即开始创作
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Home;
