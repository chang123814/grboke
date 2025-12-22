import { useState, useEffect } from 'react';
import { useDebouncedCallback } from '../hooks/useDebouncedCallback';

import { motion } from 'framer-motion';
import { Wand2, Copy, Save, Download, Sparkles, RotateCcw, Lightbulb } from 'lucide-react';
import axios from 'axios';

const PromptEditor = () => {
  const [prompt, setPrompt] = useState('');
  const [optimizedPrompt, setOptimizedPrompt] = useState('');
  const [translatedPrompt, setTranslatedPrompt] = useState('');
  const [optimizedTranslatedPrompt, setOptimizedTranslatedPrompt] = useState('');
  const [translateDirection, setTranslateDirection] = useState('auto'); // auto | zh2en | en2zh
  const [isTranslating, setIsTranslating] = useState(false);
  const [translateError, setTranslateError] = useState('');
  const [isOptimizedTranslating, setIsOptimizedTranslating] = useState(false);
  const [optimizedTranslateError, setOptimizedTranslateError] = useState('');

  // 简单自动识别：包含中文则视为中→英，否则视为英→中
  const detectDirection = (text) => {
    if (!text || !text.trim()) return 'zh2en';
    const hasChinese = /[\u4e00-\u9fff]/.test(text);
    return hasChinese ? 'zh2en' : 'en2zh';
  };


  const [templates, setTemplates] = useState([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [templateName, setTemplateName] = useState('');

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

  const [promptElements, setPromptElements] = useState(defaultPromptElements);

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

  useEffect(() => {
    const fetchPromptElements = async () => {
      try {
        const res = await axios.get('/api/prompt-elements');
        if (res.data) {
          setPromptElements(res.data);
        }
      } catch (error) {
        console.warn('获取快速元素配置失败，使用默认值:', error?.message || error);
        setPromptElements(defaultPromptElements);
      }
    };

    fetchPromptElements();
  }, []);

  const doTranslate = useDebouncedCallback(async (text, direction) => {
    if (!text || !text.trim()) {
      setTranslatedPrompt('');
      setTranslateError('');
      return;
    }

    const finalDirection = direction === 'auto' ? detectDirection(text) : direction;

    try {
      setIsTranslating(true);
      setTranslateError('');
      const res = await axios.post('/api/translate', {
        text,
        direction: finalDirection,
      });
      setTranslatedPrompt(res.data?.translatedText || '');
    } catch (error) {
      console.error('翻译失败:', error?.response?.data || error?.message || error);
      setTranslateError('翻译失败，请稍后重试');
    } finally {
      setIsTranslating(false);
    }
  }, 600);

  const doTranslateOptimized = useDebouncedCallback(async (text, direction) => {
    if (!text || !text.trim()) {
      setOptimizedTranslatedPrompt('');
      setOptimizedTranslateError('');
      return;
    }

    const finalDirection = direction === 'auto' ? detectDirection(text) : direction;

    try {
      setIsOptimizedTranslating(true);
      setOptimizedTranslateError('');
      const res = await axios.post('/api/translate', {
        text,
        direction: finalDirection,
      });
      setOptimizedTranslatedPrompt(res.data?.translatedText || '');
    } catch (error) {
      console.error('优化提示词翻译失败:', error?.response?.data || error?.message || error);
      setOptimizedTranslateError('翻译失败，请稍后重试');
    } finally {
      setIsOptimizedTranslating(false);
    }
  }, 600);

  useEffect(() => {
    doTranslate(prompt, translateDirection);
  }, [prompt, translateDirection, doTranslate]);

  useEffect(() => {
    doTranslateOptimized(optimizedPrompt, translateDirection);
  }, [optimizedPrompt, translateDirection, doTranslateOptimized]);



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
            {/* Prompt Input + 双栏翻译 */}
            <div className="card p-6 bg-slate-950/80 border border-emerald-700/60">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-emerald-50">
                <Sparkles className="w-5 h-5 text-amber-300" />
                编写提示词 · 中英互译
              </h2>

              {/* 方向切换 */}
              <div className="flex items-center gap-3 mb-3 text-xs text-emerald-200">
                <span className="hidden sm:inline">翻译方向：</span>
                <div className="inline-flex rounded-full bg-slate-900/80 border border-emerald-700/60 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setTranslateDirection('auto')}
                    className={`px-3 py-1 transition-colors ${
                      translateDirection === 'auto'
                        ? 'bg-emerald-600 text-white'
                        : 'text-emerald-200 hover:bg-emerald-800/60'
                    }`}
                  >
                    自动
                  </button>
                  <button
                    type="button"
                    onClick={() => setTranslateDirection('zh2en')}
                    className={`px-3 py-1 transition-colors ${
                      translateDirection === 'zh2en'
                        ? 'bg-emerald-600 text-white'
                        : 'text-emerald-200 hover:bg-emerald-800/60'
                    }`}
                  >
                    中 → 英
                  </button>
                  <button
                    type="button"
                    onClick={() => setTranslateDirection('en2zh')}
                    className={`px-3 py-1 transition-colors ${
                      translateDirection === 'en2zh'
                        ? 'bg-emerald-600 text-white'
                        : 'text-emerald-200 hover:bg-emerald-800/60'
                    }`}
                  >
                    英 → 中
                  </button>
                </div>

                {isTranslating && (
                  <span className="text-amber-300 text-[11px]">翻译中…</span>
                )}
                {translateError && (
                  <span className="text-red-400 text-[11px]">{translateError}</span>
                )}
              </div>

              {/* 双栏编辑区 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="flex items-center justify-between mb-1 text-xs text-emerald-200 h-8">
                    <span>
                      {translateDirection === 'zh2en'
                        ? '中文 / 原文'
                        : translateDirection === 'en2zh'
                        ? '英文 / 原文'
                        : '中文或英文 / 原文（自动识别）'}
                    </span>
                    <span className="opacity-70">实时翻译</span>
                  </div>

                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="在这里输入提示词，左侧为原文，右侧为自动翻译"
                    className="textarea-field h-40 bg-slate-900/80 border-emerald-700/60 text-emerald-50 placeholder:text-emerald-400/60"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1 text-xs text-emerald-200 h-8">
                    <span>
                      {translateDirection === 'zh2en'
                        ? 'English / 翻译结果'
                        : translateDirection === 'en2zh'
                        ? '中文 / 翻译结果'
                        : '翻译结果'}
                    </span>
                    <button
                      type="button"
                      onClick={() => doTranslate(prompt, translateDirection)}

                      className="px-2 py-1 rounded-full border border-emerald-600 text-[11px] text-emerald-100 hover:bg-emerald-700/40"
                    >
                      手动刷新翻译
                    </button>
                  </div>
                  <textarea
                    value={translatedPrompt}
                    readOnly
                    placeholder="翻译结果会自动显示在这里"
                    className="textarea-field h-40 bg-slate-900/60 border-emerald-700/60 text-emerald-100 placeholder:text-emerald-400/60 cursor-default"
                  />
                </div>
              </div>

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
                  优化后的提示词 · 中英互译
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="flex items-center justify-between mb-1 text-xs text-emerald-200 h-8">
                      <span>
                        {translateDirection === 'zh2en'
                          ? 'English / 优化后原文'
                          : translateDirection === 'en2zh'
                          ? '中文 / 优化后原文'
                          : '优化后原文'}
                      </span>
                    </div>
                    <textarea
                      value={optimizedPrompt}
                      readOnly
                      className="textarea-field h-32 bg-slate-950/80 border-emerald-700/60 text-emerald-50 placeholder:text-emerald-400/60 cursor-default font-mono text-sm"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1 text-xs text-emerald-200 h-8">
                      <span>
                        {translateDirection === 'zh2en'
                          ? '中文 / 翻译结果'
                          : translateDirection === 'en2zh'
                          ? 'English / 翻译结果'
                          : '翻译结果'}
                      </span>
                      {optimizedTranslateError && (
                        <span className="text-red-400 text-[11px]">{optimizedTranslateError}</span>
                      )}
                    </div>
                    <textarea
                      value={optimizedTranslatedPrompt}
                      readOnly
                      placeholder="优化后的提示词的翻译会自动显示在这里"
                      className="textarea-field h-32 bg-slate-950/60 border-emerald-700/60 text-emerald-100 placeholder:text-emerald-400/60 cursor-default font-mono text-sm"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button onClick={() => copyToClipboard(optimizedPrompt)} className="btn-primary flex items-center gap-2">
                    <Copy className="w-4 h-4" />
                    复制优化后的提示词
                  </button>
                  <button
                    onClick={() => copyToClipboard(optimizedTranslatedPrompt)}
                    className="btn-secondary flex items-center gap-2"
                    disabled={!optimizedTranslatedPrompt}
                  >
                    <Copy className="w-4 h-4" />
                    复制翻译结果
                  </button>
                </div>
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
                    {category === 'artists' && '艺术家'}
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
