import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowUp } from 'lucide-react';

interface BackToTopButtonProps {
  threshold?: number;
  className?: string;
}

export const BackToTopButton: React.FC<BackToTopButtonProps> = ({
  threshold = 320,
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const checkScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
      setIsVisible(scrollY > threshold);
    };

    window.addEventListener('scroll', checkScroll, { passive: true });
    checkScroll();

    return () => {
      window.removeEventListener('scroll', checkScroll);
    };
  }, [threshold]);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          type="button"
          onClick={scrollToTop}
          initial={{ opacity: 0, scale: 0.8, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 10 }}
          transition={{ duration: 0.2 }}
          aria-label="Scroll back to top"
          title="Scroll to top"
          className={`fixed right-4 bottom-20 md:bottom-6 z-40 p-2.5 rounded-full bg-slate-900/90 dark:bg-slate-800/90 hover:bg-[#023264] dark:hover:bg-[#025798] text-white shadow-xl backdrop-blur-md border border-slate-700/60 transition-all hover:scale-110 active:scale-95 cursor-pointer flex items-center justify-center ${className}`}
          style={{ boxShadow: '0 8px 24px -4px rgba(2, 50, 100, 0.35)' }}
        >
          <ArrowUp className="w-5 h-5 text-amber-400" />
        </motion.button>
      )}
    </AnimatePresence>
  );
};
