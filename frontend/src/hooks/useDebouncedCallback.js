import { useRef, useCallback, useEffect } from 'react';

// 简单的防抖 hook，用于避免频繁调用翻译接口
// 通过 useRef 保存最新的 fn，确保返回的 debounced 函数引用稳定
export function useDebouncedCallback(fn, delay = 500) {
  const timerRef = useRef(null);
  const fnRef = useRef(fn);

  // 始终保存最新的回调，避免闭包拿到旧值
  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  const debounced = useCallback(
    (...args) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        if (fnRef.current) {
          fnRef.current(...args);
        }
      }, delay);
    },
    [delay]
  );

  return debounced;
}

