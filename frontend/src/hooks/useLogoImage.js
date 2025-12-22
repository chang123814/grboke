import { useEffect, useState } from 'react';
import axios from 'axios';

const DEFAULT_FALLBACK = '';


const useLogoImage = (fallback = DEFAULT_FALLBACK) => {
  const [logoUrl, setLogoUrl] = useState(fallback);

  useEffect(() => {
    let isMounted = true;

    const fetchLogos = async () => {
      try {
        const res = await axios.get('/api/logos');
        const data = Array.isArray(res.data) ? res.data : [];
        if (isMounted && data.length > 0) {
          setLogoUrl(data[0]);
        }
      } catch (error) {
        console.warn('获取 logo 列表失败，使用默认 logo:', error?.message || error);
        if (isMounted) {
          setLogoUrl(fallback);
        }
      }
    };

    fetchLogos();

    return () => {
      isMounted = false;
    };
  }, [fallback]);

  return logoUrl;
};

export default useLogoImage;
