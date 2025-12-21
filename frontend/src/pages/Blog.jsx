import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Eye, Heart, ArrowRight } from 'lucide-react';
import axios from 'axios';

const Blog = () => {
  const [posts, setPosts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);

  const categories = ['all', '教程', '趋势', '技巧', '评测'];

  useEffect(() => {
    fetchPosts();
  }, [selectedCategory]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const url = selectedCategory === 'all'
        ? '/api/posts'
        : `/api/posts?category=${selectedCategory}`;
      const response = await axios.get(url);
      setPosts(response.data);
    } catch (error) {
      console.error('获取文章失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            技术博客
          </h1>
          <p className="text-gray-600 text-lg">
            分享AI创作心得与技术探索
          </p>
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

        {/* Blog Posts */}
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-8">
            {posts.map((post, index) => (
              <motion.article
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="card overflow-hidden hover:scale-[1.02] transition-transform"
              >
                <div className="md:flex">
                  {post.cover_image && (
                    <div className="md:w-1/3">
                      <img
                        src={post.cover_image}
                        alt={post.title}
                        className="w-full h-64 md:h-full object-cover"
                      />
                    </div>
                  )}
                  <div className={`p-8 ${post.cover_image ? 'md:w-2/3' : 'w-full'}`}>
                    <div className="flex items-center gap-3 mb-4">
                      <span className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full">
                        {post.category}
                      </span>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(post.created_at)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          {post.views}
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart className="w-4 h-4" />
                          {post.likes}
                        </span>
                      </div>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold mb-4 hover:text-primary transition-colors">
                      <Link to={`/blog/${post.id}`}>{post.title}</Link>
                    </h2>
                    <p className="text-gray-600 mb-6 line-clamp-3 leading-relaxed">
                      {post.content.substring(0, 200)}...
                    </p>
                    <Link
                      to={`/blog/${post.id}`}
                      className="inline-flex items-center gap-2 text-primary font-medium hover:gap-3 transition-all"
                    >
                      阅读全文
                      <ArrowRight className="w-5 h-5" />
                    </Link>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        )}

        {posts.length === 0 && !loading && (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg">暂无文章</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Blog;
