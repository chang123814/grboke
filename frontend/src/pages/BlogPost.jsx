import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Eye, Heart, ArrowLeft, Send, User } from 'lucide-react';
import axios from 'axios';

const BlogPost = () => {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState({ author_name: '', content: '' });
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    fetchPost();
    fetchComments();
  }, [id]);

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

  const fetchComments = async () => {
    try {
      const response = await axios.get(`/api/posts/${id}/comments`);
      setComments(response.data);
    } catch (error) {
      console.error('获取评论失败:', error);
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

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.author_name || !newComment.content) {
      alert('请填写姓名和评论内容');
      return;
    }
    try {
      await axios.post(`/api/posts/${id}/comments`, newComment);
      setNewComment({ author_name: '', content: '' });
      fetchComments();
      alert('评论发表成功！');
    } catch (error) {
      console.error('发表评论失败:', error);
      alert('评论发表失败，请重试');
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
          <div className="prose prose-lg max-w-none mt-8">
            {post.content.split('\n').map((paragraph, index) => {
              if (paragraph.startsWith('# ')) {
                return <h1 key={index} className="text-3xl font-bold mt-8 mb-4">{paragraph.substring(2)}</h1>;
              } else if (paragraph.startsWith('## ')) {
                return <h2 key={index} className="text-2xl font-bold mt-6 mb-3">{paragraph.substring(3)}</h2>;
              } else if (paragraph.startsWith('### ')) {
                return <h3 key={index} className="text-xl font-bold mt-4 mb-2">{paragraph.substring(4)}</h3>;
              } else if (paragraph.trim().startsWith('-')) {
                return <li key={index} className="ml-6">{paragraph.substring(1).trim()}</li>;
              } else if (paragraph.trim()) {
                return <p key={index} className="mb-4 leading-relaxed text-gray-700">{paragraph}</p>;
              }
              return null;
            })}
          </div>
        </motion.div>

        {/* Comments Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card p-8"
        >
          <h2 className="text-2xl font-bold mb-6">评论区 ({comments.length})</h2>

          {/* Comment Form */}
          <form onSubmit={handleCommentSubmit} className="mb-8">
            <div className="mb-4">
              <input
                type="text"
                value={newComment.author_name}
                onChange={(e) => setNewComment({ ...newComment, author_name: e.target.value })}
                placeholder="你的名字"
                className="input-field"
              />
            </div>
            <div className="mb-4">
              <textarea
                value={newComment.content}
                onChange={(e) => setNewComment({ ...newComment, content: e.target.value })}
                placeholder="写下你的评论..."
                className="textarea-field h-32"
              />
            </div>
            <button type="submit" className="btn-primary flex items-center gap-2">
              <Send className="w-4 h-4" />
              发表评论
            </button>
          </form>

          {/* Comments List */}
          <div className="space-y-6">
            {comments.length > 0 ? (
              comments.map((comment) => (
                <div key={comment.id} className="border-l-4 border-primary/20 pl-6 py-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-semibold">{comment.author_name}</div>
                      <div className="text-sm text-gray-500">
                        {formatDate(comment.created_at)}
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-700 leading-relaxed ml-13">
                    {comment.content}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 py-8">
                暂无评论，来发表第一条评论吧！
              </p>
            )}
          </div>
        </motion.div>
      </article>
    </div>
  );
};

export default BlogPost;
