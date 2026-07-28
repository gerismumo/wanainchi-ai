export const STORAGE_FOLDERS = {
  REPORTS: 'reports',
  USERS: 'users',
};

export const allowedTypes = [
  // Images
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/jpg',
  'image/gif',
  'image/svg+xml',
  'image/bmp',
  'image/tiff',
  'image/heic',
  'image/heif',
  'image/avif',

  // Videos
  'video/webm',
  'video/mp4',
  'video/quicktime',
  'video/x-matroska', // mkv
];

// Voice-note formats accepted from web/mobile recorders and WhatsApp forwards.
export const allowedAudioTypes = [
  'audio/webm',
  'audio/ogg',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/mp4',
  'audio/m4a',
  'audio/aac',
  'audio/3gpp',
  'audio/amr', // common on lower-end Android phones / WhatsApp voice notes
];
