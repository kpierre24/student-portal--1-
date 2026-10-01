import React, { useState } from 'react';
import hteimLogoSvg from '../assets/hteim_logo.svg';
import hteimLogoPng from '../assets/hteim_logo.png';

interface LogoImageProps {
  className?: string;
  alt?: string;
  onClick?: () => void;
  variant?: 'svg' | 'raster';
}

export const LogoImage: React.FC<LogoImageProps> = ({
  className = "w-10 h-10 shrink-0",
  alt = "HTEIM School of Ministry Logo",
  onClick,
  variant = 'svg'
}) => {
  const [useFallbackPng, setUseFallbackPng] = useState(false);

  return (
    <img
      src={variant === 'raster' || useFallbackPng ? hteimLogoPng : hteimLogoSvg}
      alt={alt}
      className={`${className} object-contain`}
      onClick={onClick}
      loading="eager"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => {
        if (!useFallbackPng) setUseFallbackPng(true);
      }}
    />
  );
};

export default LogoImage;

