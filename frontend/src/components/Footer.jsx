import { Github, Mail, Twitter } from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-gray-300 mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* 关于 */}
          <div>
            <h3 className="text-white text-lg font-semibold mb-4">关于清寒居</h3>
            <p className="text-sm leading-relaxed">
              清寒居是一个专注于AI艺术创作的个人空间，记录创作过程、分享技术心得与灵感火花。
            </p>
          </div>

          {/* 快速链接 */}
          <div>
            <h3 className="text-white text-lg font-semibold mb-4">快速链接</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="/portfolio" className="hover:text-primary transition-colors">
                  作品集
                </a>
              </li>
              <li>
                <a href="/prompt-editor" className="hover:text-primary transition-colors">
                  提示词工具
                </a>
              </li>
              <li>
                <a href="/blog" className="hover:text-primary transition-colors">
                  博客文章
                </a>
              </li>
            </ul>
          </div>

          {/* 联系方式 */}
          <div>
            <h3 className="text-white text-lg font-semibold mb-4">联系我</h3>
            <div className="flex space-x-4">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary transition-colors"
              >
                <Github className="w-5 h-5" />
              </a>
              <a
                href="mailto:contact@example.com"
                className="hover:text-primary transition-colors"
              >
                <Mail className="w-5 h-5" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary transition-colors"
              >
                <Twitter className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-6 text-center text-sm">
          <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
            {/* 国徽图片：请将国徽图标放在 frontend/public/guohui.png */}
            <img src="/guohui.png" alt="国徽" className="w-5 h-5 object-contain" />
            <a
              href="https://beian.miit.gov.cn/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors"
            >
              黔ICP备2025060679号
            </a>
            <span>© {currentYear} 清寒居</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
