import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Eye, Heart, ArrowLeft, Send, User } from 'lucide-react';
import axios from 'axios';

const BlogPost = () => {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    fetchPost();
  }, [id]);

  useEffect(() => {
    if (post && post.wechat_url) {
      const url = post.wechat_url.trim();
      if (url) {
        window.location.href = url;
      }
    }
  }, [post]);

  const fetchPost = async () => {

    try {
      const response = await axios.get(`/api/posts/${id}`);
      setPost(response.data);
    } catch (error) {
      console.error('获取文章失败:', error);
    } finally {
      setLoading(false);
    }
  };



  const handleLike = async () => {
    if (liked) return;
    try {
      const response = await axios.post(`/api/posts/${id}/like`);
      setPost({ ...post, likes: response.data.likes });
      setLiked(true);
    } catch (error) {
      console.error('点赞失败:', error);
    }
  };

  const handleOpenWechat = () => {
    const url = post?.wechat_url && post.wechat_url.trim();
    if (!url) {
      alert('该文章暂未配置微信公众号评论链接，请稍后再试。');
      return;
    }

    try {
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('打开微信公众号文章失败:', error);
      alert('打开微信公众号文章失败，请检查浏览器拦截设置后重试。');
    }
  };


  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderContent = () => {
    const content = post?.content || '';
    const trimmed = content.trim();

    if (!trimmed) return null;

    // 微信公众号导入的 HTML 内容
    if (trimmed.startsWith('<')) {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(trimmed, 'text/html');
        const bodyHtml = doc.body.innerHTML || trimmed;

        return (
          <div
            className="prose prose-lg max-w-none mt-8 wechat-content"
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
        );
      } catch (error) {
        // 解析失败时降级为纯文本段落
        return trimmed.split('\n').map((paragraph, index) =>
          paragraph.trim() ? (
            <p key={index} className="mb-4 leading-relaxed text-gray-700">
              {paragraph}
            </p>
          ) : null
        );
      }
    }

    // 默认：按 Markdown 风格渲染文本
    return (
      <div className="prose prose-lg max-w-none mt-8">
        {content.split('\n').map((paragraph, index) => {
          if (paragraph.startsWith('# ')) {
            return (
              <h1 key={index} className="text-3xl font-bold mt-8 mb-4">
                {paragraph.substring(2)}
              </h1>
            );
          } else if (paragraph.startsWith('## ')) {
            return (
              <h2 key={index} className="text-2xl font-bold mt-6 mb-3">
                {paragraph.substring(3)}
              </h2>
            );
          } else if (paragraph.startsWith('### ')) {
            return (
              <h3 key={index} className="text-xl font-bold mt-4 mb-2">
                {paragraph.substring(4)}
              </h3>
            );
          } else if (paragraph.trim().startsWith('-')) {
            return (
              <li key={index} className="ml-6">
                {paragraph.substring(1).trim()}
              </li>
            );
          } else if (paragraph.trim()) {
            return (
              <p key={index} className="mb-4 leading-relaxed text-gray-700">
                {paragraph}
              </p>
            );
          }
          return null;
        })}
      </div>
    );
  };


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">文章不存在</h2>
          <Link to="/blog" className="text-primary hover:underline">
            返回博客列表
              </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <article className="container mx-auto px-4 max-w-4xl">
        {/* Back Button */}
        <Link to="/blog" className="inline-flex items-center gap-2 text-gray-600 hover:text-primary mb-8 transition-colors">
          <ArrowLeft className="w-5 h-5" />
          返回博客列表
        </Link>

        {/* Post Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-8 md:p-12 mb-8"
        >
          {post.cover_image && (
            <img
              src={post.cover_image}
              alt={post.title}
              className="w-full h-96 object-cover rounded-xl mb-8"
            />
          )}
          
          <div className="flex items-center gap-3 mb-6">
            <span className="px-4 py-2 bg-primary/10 text-primary rounded-full font-medium">
              {post.category}
            </span>
          </div>

          <h1 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">
            {post.title}
          </h1>

          <div className="flex flex-wrap items-center gap-6 text-gray-600 pb-6 border-b border-gray-200">
            <span className="flex items-center gap-2">
              <User className="w-5 h-5" />
              {post.author}
            </span>
            <span className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              {formatDate(post.created_at)}
            </span>
            <span className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              {post.views} 阅读
            </span>
            <button
              onClick={handleLike}
              className={`flex items-center gap-2 transition-colors ${
                liked ? 'text-red-500' : 'hover:text-red-500'
              }`}
              disabled={liked}
            >
              <Heart className={`w-5 h-5 ${liked ? 'fill-current' : ''}`} />
              {post.likes} 点赞
            </button>
          </div>

          {/* Post Content */}
          {renderContent()}

        </motion.div>

        {/* 评论入口：跳转到微信公众号文章 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card p-8 mt-6"
        >
          <h2 className="text-2xl font-bold mb-4">评论与讨论</h2>
          <p className="text-gray-600 mb-6">
            当前站点的评论功能托管在微信公众号文章下，你可以在公众号中查看全部评论并参与讨论。
          </p>
          <button
            type="button"
            onClick={handleOpenWechat}
            className="btn-primary flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={!post.wechat_url}
          >
            <Send className="w-4 h-4" />
            {post.wechat_url ? '前往公众号查看评论' : '管理员暂未配置评论链接'}
          </button>
        </motion.div>

      </article>
    </div>
  );
};

export default BlogPost;
