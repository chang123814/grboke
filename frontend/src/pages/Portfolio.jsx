import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Eye, Sparkles } from 'lucide-react';
import axios from 'axios';

const Portfolio = () => {
  const [portfolios, setPortfolios] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedWork, setSelectedWork] = useState(null);
  const [loading, setLoading] = useState(true);

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
                onClick={() => setSelectedWork(work)}
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
                const urls = getImageUrls(selectedWork.image_url);
                return (
                  <img
                    src={urls.full}
                    alt={selectedWork.title}
                    className="w-full h-96 object-cover rounded-t-2xl"
                  />
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
                      <h3 className="font-semibold">AI提示词</h3>
                    </div>
                    <p className="text-sm text-gray-700 font-mono bg-white p-4 rounded border border-gray-200">
                      {selectedWork.prompt}
                    </p>
                  </div>
                )}
                {(() => {
                  const urls = getImageUrls(selectedWork.image_url);
                  return (
                    <a
                      href={urls.download}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-flex w-full items-center justify-center rounded-lg border border-primary text-primary py-2 text-sm font-medium hover:bg-primary/5"
                    >
                      下载原图
                    </a>
                  );
                })()}
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
