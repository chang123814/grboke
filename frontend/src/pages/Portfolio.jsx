import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Eye, Sparkles, Heart, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';


const Portfolio = () => {

  const [portfolios, setPortfolios] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedWork, setSelectedWork] = useState(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [liking, setLiking] = useState(false);
  const [likedWorkIds, setLikedWorkIds] = useState(() => new Set());
  const location = useLocation();


  const getImageUrls = (thumbUrl) => {


    if (!thumbUrl) return { thumb: '', full: '', download: '' };
    const match = thumbUrl.match(/\/api\/images\/(\d+)\/thumb/);
    if (!match) {
      return { thumb: thumbUrl, full: thumbUrl, download: thumbUrl };
    }
    const id = match[1];
    return {
      thumb: thumbUrl,
      full: `/api/images/${id}`,
      download: `/api/images/${id}/download`,
    };
  };


  const categories = [
    'all',
    'Icon设计',
    'IP人物形象设计',
    '微观世界摄影',
    '产品海报',
    '人像摄影',
    '图生图技术展示',
    '文生图技术展示',
  ];

  useEffect(() => {
    fetchPortfolios();
  }, [selectedCategory]);

  useEffect(() => {
    if (!portfolios.length) return;
    const searchParams = new URLSearchParams(location.search);
    const focusId = searchParams.get('focus');
    if (!focusId) return;
    const target = portfolios.find((p) => String(p.id) === String(focusId));
    if (target) {
      setSelectedWork(target);
      setSelectedImageIndex(0);
    }
  }, [portfolios, location.search]);


  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!selectedWork) return;
      
      const baseUrls = [];
      if (selectedWork.image_url) baseUrls.push(selectedWork.image_url);
      if (selectedWork.extra_images) {
        baseUrls.push(...selectedWork.extra_images.split('\n').filter(u => !!u.trim()));
      }
      const total = baseUrls.length;
      if (total <= 1) return;

      if (e.key === 'ArrowLeft') {
        setSelectedImageIndex((prev) => (prev - 1 + total) % total);
      } else if (e.key === 'ArrowRight') {
        setSelectedImageIndex((prev) => (prev + 1) % total);
      } else if (e.key === 'Escape') {
        setSelectedWork(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedWork]);

  const fetchPortfolios = async () => {

    setLoading(true);
    try {
      const url = selectedCategory === 'all'
        ? '/api/portfolios'
        : `/api/portfolios?category=${selectedCategory}`;
      const response = await axios.get(url);
      setPortfolios(response.data);
    } catch (error) {
      console.error('获取作品集失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLikeWork = async () => {
    if (!selectedWork || liking || likedWorkIds.has(selectedWork.id)) return;
    setLiking(true);
    try {
      const response = await axios.post(`/api/portfolios/${selectedWork.id}/like`);
      const newLikes = response.data?.likes ?? ((selectedWork.likes || 0) + 1);

      setSelectedWork((prev) => (prev ? { ...prev, likes: newLikes } : prev));
      setPortfolios((prev) =>
        prev.map((work) =>
          work.id === selectedWork.id ? { ...work, likes: newLikes } : work
        )
      );
      setLikedWorkIds((prev) => {
        const next = new Set(prev);
        next.add(selectedWork.id);
        return next;
      });
    } catch (error) {
      console.error('点赞作品失败:', error);
    } finally {
      setLiking(false);
    }
  };

  const hasLikedCurrent = selectedWork ? likedWorkIds.has(selectedWork.id) : false;
  const currentLikes = selectedWork?.likes ?? 0;

  return (

    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            AI作品集
          </h1>
          <p className="text-gray-600 text-lg">探索AI艺术的无限可能</p>
        </motion.div>

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-6 py-2 rounded-full font-medium transition-all ${
                selectedCategory === category
                  ? 'bg-primary text-white shadow-lg scale-105'
                  : 'bg-white text-gray-700 hover:bg-gray-100 shadow-md'
              }`}
            >
              {category === 'all' ? '全部' : category}
            </button>
          ))}
        </div>

        {/* Portfolio Grid */}
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {portfolios.map((work, index) => (
              <motion.div
                key={work.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="card group cursor-pointer"
                onClick={() => {
                  setSelectedWork(work);
                  setSelectedImageIndex(0);
                }}
              >

                <div className="relative overflow-hidden aspect-square">
                  {(() => {
                    const urls = getImageUrls(work.image_url);
                    return (
                      <img
                        src={urls.thumb}
                        alt={work.title}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    );
                  })()}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                      <div className="flex items-center gap-2 mb-2">
                        <Eye className="w-4 h-4" />
                        <span className="text-sm">查看详情</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full">
                      {work.category}
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
                    {work.title}
                  </h3>
                  <p className="text-gray-600 line-clamp-2">{work.description}</p>
                  <div className="mt-4 flex items-center justify-end gap-1 text-sm text-gray-500">
                    <Heart className="w-4 h-4 text-primary/80" strokeWidth={1.6} />
                    <span>{work.likes ?? 0}</span>
                  </div>
                </div>

              </motion.div>
            ))}
          </div>
        )}

        {/* Modal */}
        {selectedWork && (
          <div
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-fade-in"
            onClick={() => setSelectedWork(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {(() => {
                const baseUrls = [];
                if (selectedWork.image_url) baseUrls.push(selectedWork.image_url);
                if (selectedWork.extra_images) {
                  baseUrls.push(
                    ...selectedWork.extra_images
                      .split('\n')
                      .filter((u) => !!u.trim())
                  );
                }
                if (baseUrls.length === 0) return null;

                const imageItems = baseUrls.map((u) => getImageUrls(u));
                const current = imageItems[selectedImageIndex] || imageItems[0];

                return (
                  <div className="relative bg-black rounded-t-2xl flex items-center justify-center min-h-[400px]">
                    <img
                      src={current.full}
                      alt={selectedWork.title}
                      className="max-h-[70vh] w-auto object-contain rounded-t-2xl"
                    />

                    {/* 左右切换按钮 */}
                    {imageItems.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedImageIndex((prev) => (prev - 1 + imageItems.length) % imageItems.length);
                          }}
                          className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors z-10 group"
                          title="上一张"
                        >
                          <ChevronLeft className="w-8 h-8 group-hover:scale-110 transition-transform" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedImageIndex((prev) => (prev + 1) % imageItems.length);
                          }}
                          className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors z-10 group"
                          title="下一张"
                        >
                          <ChevronRight className="w-8 h-8 group-hover:scale-110 transition-transform" />
                        </button>
                      </>
                    )}

                    {/* 水印 LOGO 条 */}

                    <div className="absolute right-4 bottom-4 select-none pointer-events-none">
                      <div className="flex items-center gap-1 rounded-full bg-gradient-to-r from-black/70 via-black/50 to-black/70 px-3 py-1 shadow-lg shadow-black/40 border border-white/10">
                        <span className="inline-block w-2 h-2 rounded-full bg-primary"></span>
                        <span className="text-[11px] tracking-wide text-white/90">清寒居</span>
                      </div>
                    </div>

                    {/* 缩略图选择 */}
                    {imageItems.length > 1 && (
                      <div className="absolute bottom-3 left-0 right-0 flex justify-center px-4">
                        <div className="inline-flex gap-2 px-3 py-2 rounded-lg bg-black/60 backdrop-blur-sm border border-white/20 shadow-md shadow-black/40">

                          {imageItems.map((img, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedImageIndex(idx);
                              }}
                              className={`rounded-md overflow-hidden w-14 h-14 ${
                                idx === selectedImageIndex
                                  ? 'ring-2 ring-primary shadow-inner'
                                  : 'opacity-75 hover:opacity-100'
                              }`}
                            >
                              <img
                                src={img.thumb}
                                alt={`缩略图${idx + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>
                );
              })()}

              {(() => {
                const baseUrls = [];
                if (selectedWork.image_url) baseUrls.push(selectedWork.image_url);
                if (selectedWork.extra_images) {
                  baseUrls.push(
                    ...selectedWork.extra_images
                      .split('\n')
                      .filter((u) => !!u.trim())
                  );
                }
                if (baseUrls.length === 0) return null;
                const imageItems = baseUrls.map((u) => getImageUrls(u));
                const current = imageItems[selectedImageIndex] || imageItems[0];

                return (
                  <div className="px-8 pt-3">
                    <div className="flex flex-col gap-3 md:flex-row">
                      <a
                        href={current.download}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex flex-1 items-center justify-center rounded-lg border border-primary text-primary py-2 text-sm font-medium hover:bg-primary/5 bg-white transition-colors"
                      >
                        下载原图
                      </a>
                      <button
                        type="button"
                        onClick={handleLikeWork}
                        disabled={liking || hasLikedCurrent}
                        className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg border py-2 text-sm font-medium transition-colors ${
                          liking || hasLikedCurrent
                            ? 'border-gray-300 text-gray-400 bg-gray-50'
                            : 'border-primary text-primary hover:bg-primary/5'
                        }`}
                      >
                        <Heart
                          className="w-4 h-4"
                          strokeWidth={1.8}
                          fill={hasLikedCurrent ? 'currentColor' : 'none'}
                        />
                        {hasLikedCurrent ? '已点赞' : '点赞'} ({currentLikes})
                      </button>
                    </div>
                  </div>
                );
              })()}


              <div className="p-8">

                <div className="flex items-center gap-2 mb-4">
                  <span className="px-3 py-1 bg-primary/10 text-primary rounded-full">
                    {selectedWork.category}
                  </span>
                </div>
                <h2 className="text-3xl font-bold mb-4">{selectedWork.title}</h2>
                <p className="text-gray-600 mb-6 leading-relaxed">{selectedWork.description}</p>
                {selectedWork.prompt && (
                  <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-5 h-5 text-primary" />
                      <h3 className="font-semibold">模型参数</h3>

                    </div>
                    <p className="text-sm text-gray-700 font-mono bg-white p-4 rounded border border-gray-200">
                      {selectedWork.prompt}
                    </p>
                  </div>
                )}
                <button
                  onClick={() => setSelectedWork(null)}
                  className="mt-3 btn-secondary w-full"
                >

                  关闭
                </button>

              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Portfolio;
