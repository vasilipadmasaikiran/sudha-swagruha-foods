// ============================================================
// AppImage Component - Robust Image Display with Graceful Fallback
// Prevents distortion, handles broken URLs, aspect ratios, responsive sizing
// ============================================================
import React, { useState, useEffect } from 'react';

interface AppImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string | null;
  alt: string;
  fallbackSrc?: string;
  className?: string;
  aspectRatio?: 'square' | 'video' | 'portrait' | 'auto';
  containerClassName?: string;
}

/**
 * Normalizes image paths to handle base URL, local public assets, and absolute URLs cleanly.
 */
export function normalizeImageUrl(rawUrl?: string | null): string {
  if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return '';
  }

  const url = rawUrl.trim();

  // If already absolute HTTP/HTTPS or data URI, return as-is
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }

  const baseUrl = import.meta.env.BASE_URL || '/';
  const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;

  // If it's referencing logo.png, we know logo.png and logo.jpg both exist in public/logo
  if (url.includes('logo/logo')) {
    return `${cleanBase}logo/logo.jpg`;
  }

  // If it starts with base URL already
  if (url.startsWith(cleanBase)) {
    return url;
  }

  // Strip leading slash
  const stripped = url.startsWith('/') ? url.slice(1) : url;

  return `${cleanBase}${stripped}`;
}

export default function AppImage({
  src,
  alt,
  fallbackSrc,
  className = 'w-full h-full object-cover',
  aspectRatio,
  containerClassName = '',
  loading = 'lazy',
  ...rest
}: AppImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const cleanSrc = normalizeImageUrl(src);

  useEffect(() => {
    // Reset state whenever src changes
    setHasError(!cleanSrc);
    setIsLoading(Boolean(cleanSrc));
  }, [cleanSrc]);

  const aspectClass =
    aspectRatio === 'square'
      ? 'aspect-square'
      : aspectRatio === 'video'
      ? 'aspect-video'
      : aspectRatio === 'portrait'
      ? 'aspect-[3/4]'
      : '';

  return (
    <div
      className={`relative overflow-hidden bg-slate-100 flex items-center justify-center ${aspectClass} ${containerClassName}`}
    >
      {/* Skeleton Loading State */}
      {isLoading && !hasError && (
        <div className="absolute inset-0 bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 animate-pulse" />
      )}

      {/* Render Fallback Placeholder on Error or Empty URL */}
      {hasError ? (
        fallbackSrc ? (
          <img
            src={normalizeImageUrl(fallbackSrc)}
            alt={alt || 'Product Image'}
            className={`${className} transition-opacity duration-300`}
            loading={loading}
          />
        ) : (
          <div className="w-full h-full min-h-[140px] flex flex-col items-center justify-center p-4 bg-emerald-50/50 text-emerald-800/70 select-none">
            <svg
              className="w-10 h-10 mb-2 text-emerald-600/50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span className="text-xs font-semibold text-emerald-900/60 text-center line-clamp-1">
              {alt || 'Traditional Delicacy'}
            </span>
            <span className="text-[10px] text-emerald-700/50 mt-0.5">Sudha Swagruha</span>
          </div>
        )
      ) : (
        <img
          src={cleanSrc}
          alt={alt}
          className={`${className} transition-opacity duration-300 ${
            isLoading ? 'opacity-0' : 'opacity-100'
          }`}
          loading={loading}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
          {...rest}
        />
      )}
    </div>
  );
}
