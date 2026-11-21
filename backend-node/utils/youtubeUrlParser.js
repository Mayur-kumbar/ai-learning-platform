const ALLOWED_HOSTS = new Set([
  'www.youtube.com',
  'youtube.com',
  'm.youtube.com',
  'youtu.be',
]);

const VIDEO_ID_RE = /^[a-zA-Z0-9_-]{11}$/;

export function parseYoutubeUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { valid: false, error: 'YouTube URL is required' };
  }

  let url;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return { valid: false, error: 'URL must use http or https' };
  }

  const host = url.hostname.toLowerCase();
  if (!ALLOWED_HOSTS.has(host)) {
    return { valid: false, error: 'Not a valid YouTube URL' };
  }

  let videoId = null;

  if (host === 'youtu.be') {
    // https://youtu.be/VIDEO_ID
    videoId = url.pathname.slice(1).split('/')[0];
  } else if (url.pathname.startsWith('/embed/')) {
    // https://www.youtube.com/embed/VIDEO_ID
    videoId = url.pathname.split('/embed/')[1]?.split('/')[0];
  } else if (url.pathname === '/watch') {
    // https://www.youtube.com/watch?v=VIDEO_ID
    videoId = url.searchParams.get('v');
  }

  if (!videoId) {
    return { valid: false, error: 'Could not extract video ID from URL' };
  }

  videoId = videoId.trim();

  if (!VIDEO_ID_RE.test(videoId)) {
    return { valid: false, error: 'Invalid YouTube video ID' };
  }

  return { valid: true, videoId };
}
