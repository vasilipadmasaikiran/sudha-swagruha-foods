// ============================================================
// AppImage Component - Robust Image Display with Graceful Fallback
// Prevents distortion, handles broken URLs, aspect ratios, responsive sizing,
// cache-complete detection (resolves white/blank images), and transparent PNG backdrop
// ============================================================
import React, { useState, useEffect, useRef, useCallback } from 'react';

export interface AppImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string | null;
  alt: string;
  fallbackSrc?: string;
  className?: string;
  aspectRatio?: 'square' | 'video' | 'portrait' | 'auto';
  containerClassName?: string;
}

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
  width?: number;
  height?: number;
  dataUrl?: string;
  fileSize?: number;
}

/**
 * Validates an image file before upload (MIME, size, corrupted file, 0x0 dimension)
 */
export async function validateProductImageFile(file: File): Promise<ImageValidationResult> {
  const allowedMime = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedMime.includes(file.type)) {
    return {
      valid: false,
      error: `Unsupported image format (${file.type || 'unknown'}). Please upload a JPEG, PNG, or WebP image.`,
    };
  }

  // 5MB max
  const maxBytes = 5 * 1024 * 1024;
  if (file.size > maxBytes) {
    return {
      valid: false,
      error: `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds maximum allowed limit of 5.0MB.`,
    };
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        if (img.naturalWidth === 0 || img.naturalHeight === 0) {
          resolve({
            valid: false,
            error: 'Corrupted image: zero dimensions detected (0x0).',
          });
        } else {
          resolve({
            valid: true,
            width: img.naturalWidth,
            height: img.naturalHeight,
            dataUrl,
            fileSize: file.size,
          });
        }
      };
      img.onerror = () => {
        resolve({
          valid: false,
          error: 'Image decoding failed. The image file appears to be corrupted or invalid.',
        });
      };
      img.src = dataUrl;
    };
    reader.onerror = () => {
      resolve({
        valid: false,
        error: 'Failed to read file from disk.',
      });
    };
    reader.readAsDataURL(file);
  });
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
  const imgRef = useRef<HTMLImageElement | null>(null);

  const cleanSrc = normalizeImageUrl(src);
  const defaultFallback = normalizeImageUrl(fallbackSrc || `${import.meta.env.BASE_URL}images/pickle.jpg`);

  // Proactively check if the DOM image is already loaded and complete from cache.
  // This solves the production bug where cached images have complete=true before React binds onLoad,
  // preventing onLoad from firing and leaving the element permanently trapped in opacity-0!
  const checkComplete = useCallback((el: HTMLImageElement | null) => {
    if (!el) return;
    if (el.complete) {
      if (el.naturalWidth > 0 && el.naturalHeight > 0) {
        setIsLoading(false);
        setHasError(false);
      } else {
        setIsLoading(false);
        setHasError(true);
      }
    }
  }, []);

  useEffect(() => {
    if (!cleanSrc) {
      setHasError(true);
      setIsLoading(false);
      return;
    }
    setHasError(false);
    setIsLoading(true);

    if (imgRef.current) {
      checkComplete(imgRef.current);
    }
  }, [cleanSrc, checkComplete]);

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
      className={`relative overflow-hidden bg-gradient-to-br from-stone-50 via-slate-50 to-stone-100 flex items-center justify-center ${aspectClass} ${containerClassName}`}
    >
      {/* Skeleton Loading State */}
      {isLoading && !hasError && (
        <div className="absolute inset-0 bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 animate-pulse pointer-events-none" />
      )}

      {/* Render Fallback on Error or Empty URL */}
      {hasError ? (
        <img
          src={defaultFallback}
          alt={alt || 'Product Image'}
          className={`${className} transition-opacity duration-300 opacity-100`}
          loading={loading}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : (
        <img
          ref={(node) => {
            imgRef.current = node;
            checkComplete(node);
          }}
          src={cleanSrc}
          alt={alt}
          className={`${className} transition-opacity duration-300 ${
            isLoading ? 'opacity-0' : 'opacity-100'
          }`}
          loading={loading}
          onLoad={(e) => {
            const target = e.currentTarget;
            if (target.naturalWidth > 0) {
              setIsLoading(false);
              setHasError(false);
            } else {
              setIsLoading(false);
              setHasError(true);
            }
          }}
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
