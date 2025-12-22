import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import useLogoImage from '../hooks/useLogoImage';


const Header = () => {

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const logoUrl = useLogoImage();

  const navItems = [

    { path: '/', label: '首页' },
    { path: '/portfolio', label: '作品集' },
    { path: '/prompt-editor', label: 'AI提示词工具' },
    { path: '/blog', label: '博客' },
  ];


  const isActive = (path) => location.pathname === path;

  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      <nav className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between md:justify-start md:gap-12">

          {/* Logo */}
          <Link to="/" className="flex items-center group">
            <div className="h-20 md:h-24 flex items-center">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="清寒居 Logo"
                  className="h-full w-auto object-contain"
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-gray-400">
                  LOGO
                </div>
              )}
            </div>



          </Link>



          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-10 md:ml-6">


            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`font-medium transition-colors relative group ${
                  isActive(item.path)
                    ? 'text-primary'
                    : 'text-gray-600 hover:text-primary'
                }`}
              >
                {item.label}
                <span
                  className={`absolute bottom-0 left-0 w-full h-0.5 bg-primary transform origin-left transition-transform ${
                    isActive(item.path) ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                  }`}
                />
              </Link>
            ))}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 py-4 border-t border-gray-200 animate-fade-in">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMenuOpen(false)}
                className={`block py-3 px-4 rounded-lg font-medium transition-colors ${
                  isActive(item.path)
                    ? 'bg-primary text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </nav>
    </header>
  );
};

export default Header;
