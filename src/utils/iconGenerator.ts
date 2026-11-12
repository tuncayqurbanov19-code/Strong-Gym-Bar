/**
 * Utility for dynamically generating PWA / Apple Touch / Android / Favicon icons
 * from a user-uploaded custom logo using HTML5 Canvas.
 */

export interface GeneratedIcons {
  faviconUrl: string;
  appleTouchIconUrl: string;
  icon192Url: string;
  icon512Url: string;
  maskable512Url: string;
}

/**
 * Loads an image from a URL, Base64 string, or File into an HTMLImageElement
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error('Şəkil yüklənə bilmədi: ' + e));
    img.src = src;
  });
}

/**
 * Generates all standard icon sizes from an image source:
 * - 64x64 favicon
 * - 180x180 Apple Touch Icon (iPhone/iPad Home Screen)
 * - 192x192 Android Chrome standard icon
 * - 512x512 Android high-res icon
 * - 512x512 Android Adaptive Maskable icon (with 10% safe zone padding on #09090b)
 */
export async function generateAppIcons(imageSrc: string): Promise<GeneratedIcons> {
  const img = await loadImage(imageSrc);

  const renderToCanvas = (
    size: number,
    options: {
      padding?: number;
      backgroundColor?: string;
      roundedCorners?: number;
    } = {}
  ): string => {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return imageSrc;

    const { padding = 0, backgroundColor, roundedCorners = 0 } = options;

    if (backgroundColor) {
      ctx.fillStyle = backgroundColor;
      if (roundedCorners > 0) {
        ctx.beginPath();
        const r = roundedCorners;
        ctx.moveTo(r, 0);
        ctx.lineTo(size - r, 0);
        ctx.quadraticCurveTo(size, 0, size, r);
        ctx.lineTo(size, size - r);
        ctx.quadraticCurveTo(size, size, size - r, size);
        ctx.lineTo(r, size);
        ctx.quadraticCurveTo(0, size, 0, size - r);
        ctx.lineTo(0, r);
        ctx.quadraticCurveTo(0, 0, r, 0);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillRect(0, 0, size, size);
      }
    }

    // Calculate draw dimensions keeping aspect ratio
    const drawSize = size - padding * 2;
    const scale = Math.min(drawSize / img.width, drawSize / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    const x = (size - w) / 2;
    const y = (size - h) / 2;

    ctx.drawImage(img, x, y, w, h);
    return canvas.toDataURL('image/png');
  };

  // 1. Favicon (64x64)
  const faviconUrl = renderToCanvas(64);

  // 2. Apple Touch Icon for iPhone / iPad (180x180) - iOS applies its own rounded squircle
  const appleTouchIconUrl = renderToCanvas(180, {
    backgroundColor: '#09090b',
    padding: 16,
  });

  // 3. Android 192x192
  const icon192Url = renderToCanvas(192, {
    backgroundColor: '#09090b',
    padding: 18,
  });

  // 4. Android 512x512
  const icon512Url = renderToCanvas(512, {
    backgroundColor: '#09090b',
    padding: 48,
  });

  // 5. Maskable 512x512 for Samsung / Android adaptive launcher icons
  // Google recommends safe area of 80% (padding = 512 * 0.1 = 51px)
  const maskable512Url = renderToCanvas(512, {
    backgroundColor: '#09090b',
    padding: 64,
  });

  return {
    faviconUrl,
    appleTouchIconUrl,
    icon192Url,
    icon512Url,
    maskable512Url,
  };
}

/**
 * Updates DOM head elements:
 * - <link rel="icon">
 * - <link rel="apple-touch-icon">
 * - <link rel="manifest"> dynamic manifest data URL
 */
export function applyIconsToDocument(icons: GeneratedIcons, barName: string = 'Zal Barı'): void {
  if (typeof document === 'undefined') return;

  // 1. Update Favicon
  const existingFavicons = document.querySelectorAll("link[rel*='icon']");
  existingFavicons.forEach(el => el.remove());

  const newFavicon = document.createElement('link');
  newFavicon.rel = 'icon';
  newFavicon.type = 'image/png';
  newFavicon.href = icons.faviconUrl;
  document.head.appendChild(newFavicon);

  // 2. Update Apple Touch Icon
  const existingAppleIcons = document.querySelectorAll("link[rel*='apple-touch-icon']");
  existingAppleIcons.forEach(el => el.remove());

  const newAppleIcon = document.createElement('link');
  newAppleIcon.rel = 'apple-touch-icon';
  newAppleIcon.sizes = '180x180';
  newAppleIcon.href = icons.appleTouchIconUrl;
  document.head.appendChild(newAppleIcon);

  // 3. Update Web App Manifest dynamically
  try {
    const dynamicManifest = {
      id: '/',
      name: `${barName} — İdarəetmə və POS`,
      short_name: barName,
      description: `${barName} üçün kassa, satış, depo və borc idarəetmə sistemi.`,
      theme_color: '#09090b',
      background_color: '#09090b',
      display: 'standalone',
      orientation: 'portrait',
      start_url: '/',
      scope: '/',
      icons: [
        {
          src: icons.icon192Url,
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: icons.icon512Url,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: icons.maskable512Url,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
      ],
    };

    const manifestBlob = new Blob([JSON.stringify(dynamicManifest, null, 2)], {
      type: 'application/manifest+json',
    });
    const manifestBlobUrl = URL.createObjectURL(manifestBlob);

    let manifestLink = document.querySelector<HTMLLinkElement>("link[rel='manifest']");
    if (!manifestLink) {
      manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      document.head.appendChild(manifestLink);
    }
    manifestLink.href = manifestBlobUrl;
  } catch (err) {
    console.warn('Dynamic manifest update warning:', err);
  }

  // 4. Save to local storage for instant preload on next refresh
  try {
    localStorage.setItem('zalbar_dynamic_icons', JSON.stringify(icons));
  } catch (e) {
    // ignore quota errors
  }
}

/**
 * Preloads cached dynamic icons before React starts if available
 */
export function preloadCachedIcons(): void {
  if (typeof window === 'undefined') return;
  try {
    const cached = localStorage.getItem('zalbar_dynamic_icons');
    if (cached) {
      const icons = JSON.parse(cached) as GeneratedIcons;
      const settingsStr = localStorage.getItem('zalbar_settings');
      let barName = 'Zal Barı';
      if (settingsStr) {
        try {
          barName = JSON.parse(settingsStr).barName || 'Zal Barı';
        } catch {
          // fallback
        }
      }
      applyIconsToDocument(icons, barName);
    }
  } catch (e) {
    console.warn('preloadCachedIcons error:', e);
  }
}
