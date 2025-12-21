import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Wand2, Copy, Save, Download, Sparkles, RotateCcw, Lightbulb } from 'lucide-react';
import axios from 'axios';

const PromptEditor = () => {
  const [prompt, setPrompt] = useState('');
  const [optimizedPrompt, setOptimizedPrompt] = useState('');
  const [templates, setTemplates] = useState([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [templateName, setTemplateName] = useState('');

  const promptElements = {
    subjects: ['人物', '风景', '建筑', '动物', '抽象', '静物'],
    styles: ['写实主义', '印象派', '赛博朋克', '蒸汽朋克', '极简主义', '超现实主义'],
    moods: ['宁静', '神秘', '欢快', '忧郁', '史诗', '梦幻'],
    lighting: ['柔和光线', '戏剧性光线', '霓虹灯', '自然光', '逆光', '黄金时刻'],
    quality: ['8K', '超高清', '精细细节', '电影级', '专业摄影', '杰作'],
  };

  const tips = [
    '使用逗号分隔不同的描述元素',
    '在开头描述主体，然后添加风格和细节',
    '使用具体的艺术家名字可以获得独特风格',
    '添加质量词可以提升生成效果',
    '尝试组合不同的艺术风格',
  ];

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await axios.get('/api/prompt-templates');
      setTemplates(response.data);
    } catch (error) {
      console.error('获取模板失败:', error);
    }
  };

  const addElement = (element) => {
    setPrompt((prev) => (prev ? `${prev}, ${element}` : element));
  };

  const optimizePrompt = () => {
    const elements = prompt
      .split(',')
      .map((e) => e.trim())
      .filter((e) => e);
    const optimized = [
      ...elements.slice(0, 2),
      'highly detailed',
      ...elements.slice(2),
      'professional',
      '8k resolution',
    ].join(', ');
    setOptimizedPrompt(optimized);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('已复制到剪贴板！');
  };

  const saveTemplate = async () => {
    if (!templateName || !prompt) {
      alert('请输入模板名称和提示词');
      return;
    }
    try {
      await axios.post('/api/prompt-templates', {
        name: templateName,
        template: prompt,
        category: '自定义',
        tags: '',
      });
      alert('模板保存成功！');
      setShowSaveModal(false);
      setTemplateName('');
      fetchTemplates();
    } catch (error) {
      console.error('保存模板失败:', error);
      alert('保存失败，请重试');
    }
  };

  const loadTemplate = (template) => {
    setPrompt(template.template);
    setOptimizedPrompt('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-950 py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-3 bg-slate-950 px-6 py-3 rounded-full shadow-lg mb-6 border border-emerald-700/60">
            <Wand2 className="w-6 h-6 text-amber-300" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-secondary via-amber-200 to-secondary bg-clip-text text-transparent">
              AI提示词编辑器
            </h1>
          </div>
          <p className="text-emerald-100/80 text-lg">构建完美的AI艺术提示词，释放创造力</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Editor */}
          <div className="lg:col-span-2 space-y-6">
            {/* Prompt Input */}
            <div className="card p-6 bg-slate-950/80 border border-emerald-700/60">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-emerald-50">
                <Sparkles className="w-5 h-5 text-amber-300" />
                编写提示词
              </h2>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="在这里输入你的AI绘画提示词... 例如：a beautiful sunset over mountains, oil painting style, warm colors"
                className="textarea-field h-40 mb-4 bg-slate-900/80 border-emerald-700/60 text-emerald-50 placeholder:text-emerald-400/60"
              />
              <div className="flex flex-wrap gap-3">
                <button onClick={optimizePrompt} className="btn-primary flex items-center gap-2">
                  <Wand2 className="w-4 h-4" />
                  优化提示词
                </button>
                <button onClick={() => copyToClipboard(prompt)} className="btn-secondary flex items-center gap-2">
                  <Copy className="w-4 h-4" />
                  复制
                </button>
                <button onClick={() => setShowSaveModal(true)} className="btn-secondary flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  保存为模板
                </button>
                <button
                  onClick={() => {
                    setPrompt('');
                    setOptimizedPrompt('');
                  }}
                  className="btn-secondary flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  清空
                </button>
              </div>
            </div>

            {/* Optimized Output */}
            {optimizedPrompt && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card p-6 bg-gradient-to-br from-emerald-900/60 to-slate-950/80 border-2 border-amber-400/40"
              >
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-emerald-50">
                  <Sparkles className="w-5 h-5 text-amber-300" />
                  优化后的提示词
                </h2>
                <div className="bg-slate-950/80 rounded-lg p-4 mb-4 border border-emerald-700/60">
                  <p className="text-emerald-50 font-mono text-sm whitespace-pre-wrap">
                    {optimizedPrompt}
                  </p>
                </div>
                <button onClick={() => copyToClipboard(optimizedPrompt)} className="btn-primary flex items-center gap-2">
                  <Copy className="w-4 h-4" />
                  复制优化后的提示词
                </button>
              </motion.div>
            )}

            {/* Element Buttons */}
            <div className="card p-6 bg-slate-950/80 border border-emerald-700/60">
              <h2 className="text-xl font-semibold mb-4 text-emerald-50">快速添加元素</h2>
              {Object.entries(promptElements).map(([category, elements]) => (
                <div key={category} className="mb-4">
                  <h3 className="text-sm font-semibold text-emerald-200 mb-2 capitalize">
                    {category === 'subjects' && '主题'}
                    {category === 'styles' && '风格'}
                    {category === 'moods' && '氛围'}
                    {category === 'lighting' && '光线'}
                    {category === 'quality' && '质量'}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {elements.map((element) => (
                      <button
                        key={element}
                        onClick={() => addElement(element)}
                        className="px-3 py-1 bg-emerald-900/80 hover:bg-amber-400 hover:text-slate-950 rounded-full text-sm text-emerald-100 transition-all border border-emerald-700/60"
                      >
                        {element}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Tips */}
            <div className="card p-6 bg-slate-950/80 border border-emerald-700/60">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-emerald-50">
                <Lightbulb className="w-5 h-5 text-amber-300" />
                创作技巧
              </h2>
              <ul className="space-y-3">
                {tips.map((tip, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-emerald-100/90">
                    <span className="text-amber-300 font-bold">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Saved Templates */}
            <div className="card p-6 bg-slate-950/80 border border-emerald-700/60">
              <h2 className="text-xl font-semibold mb-4 text-emerald-50">已保存模板</h2>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {templates.length > 0 ? (
                  templates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => loadTemplate(template)}
                      className="w-full text-left p-3 bg-emerald-900/60 hover:bg-emerald-800/80 rounded-lg transition-colors group border border-emerald-700/60"
                    >
                      <div className="font-medium text-emerald-50 group-hover:text-amber-300">
                        {template.name}
                      </div>
                      <div className="text-xs text-emerald-200/80 truncate mt-1">
                        {template.template}
                      </div>
                    </button>
                  ))
                ) : (
                  <p className="text-emerald-200/80 text-sm text-center py-4">暂无保存的模板</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Save Modal */}
        {showSaveModal && (
          <div
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
            onClick={() => setShowSaveModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-slate-950 rounded-2xl p-8 max-w-md w-full border border-emerald-700/60"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-bold mb-4 text-emerald-50">保存模板</h3>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="输入模板名称"
                className="input-field mb-4 bg-slate-900/80 border-emerald-700/60 text-emerald-50 placeholder:text-emerald-400/60"
              />
              <div className="flex gap-3">
                <button onClick={saveTemplate} className="btn-primary flex-1">
                  保存
                </button>
                <button onClick={() => setShowSaveModal(false)} className="btn-secondary flex-1">
                  取消
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PromptEditor;
