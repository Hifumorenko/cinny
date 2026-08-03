export const IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/gif',
  'image/png',
  'image/apng',
  'image/webp',
  'image/avif',
];

export const VIDEO_MIME_TYPES = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];

export const AUDIO_MIME_TYPES = [
  'audio/mp4',
  'audio/webm',
  'audio/aac',
  'audio/mpeg',
  'audio/ogg',
  'audio/wave',
  'audio/wav',
  'audio/x-wav',
  'audio/x-pn-wav',
  'audio/flac',
  'audio/x-flac',
];

export const APPLICATION_MIME_TYPES = [
  'application/pdf',
  'application/json',
  'application/x-sh',
  'application/ecmascript',
  'application/javascript',
  'application/xhtml+xml',
  'application/xml',
  'application/ogg',
];

export const TEXT_MIME_TYPE = [
  'text/plain',
  'text/html',
  'text/css',
  'text/javascript',
  'text/x-c',
  'text/csv',
  'text/tab-separated-values',
  'text/yaml',
  'text/x-java-source,java',
  'text/markdown',
];

export const READABLE_TEXT_MIME_TYPES = [
  'application/json',
  'application/x-sh',
  'application/ecmascript',
  'application/javascript',
  'application/xhtml+xml',
  'application/xml',

  ...TEXT_MIME_TYPE,
];

export const READABLE_EXT_TO_MIME_TYPE: Record<string, string> = {
  go: 'text/go',
  rs: 'text/rust',
  py: 'text/python',
  swift: 'text/swift',
  c: 'text/c',
  cpp: 'text/cpp',
  java: 'text/java',
  kt: 'text/kotlin',
  lua: 'text/lua',
  php: 'text/php',
  ts: 'text/typescript',
  js: 'text/javascript',
  jsx: 'text/jsx',
  tsx: 'text/tsx',
  html: 'text/html',
  xhtml: 'text/xhtml',
  xht: 'text/xhtml',
  css: 'text/css',
  scss: 'text/scss',
  sass: 'text/sass',
  json: 'text/json',
  md: 'text/markdown',
  yaml: 'text/yaml',
  yni: 'text/yni',
  xml: 'text/xml',
  txt: 'text/plain',
  text: 'text/plain',
  conf: 'text/conf',
  cfg: 'text/conf',
  cnf: 'text/conf',
  log: 'text/log',
  me: 'text/me',
  cvs: 'text/cvs',
  tvs: 'text/tvs',
  sql: 'text/sql',
};

export const ALLOWED_BLOB_MIME_TYPES = [
  ...IMAGE_MIME_TYPES,
  ...VIDEO_MIME_TYPES,
  ...AUDIO_MIME_TYPES,
  ...APPLICATION_MIME_TYPES,
  ...TEXT_MIME_TYPE,
];

export const FALLBACK_MIMETYPE = 'application/octet-stream';

export const getBlobSafeMimeType = (mimeType: string) => {
  if (typeof mimeType !== 'string') return FALLBACK_MIMETYPE;
  const [type] = mimeType.split(';');
  if (!ALLOWED_BLOB_MIME_TYPES.includes(type)) {
    return FALLBACK_MIMETYPE;
  }
  // Required for Chromium browsers
  if (type === 'video/quicktime') {
    return 'video/mp4';
  }
  // Fixes missing playback for Ogg audio
  if (type === 'application/ogg') {
    return 'audio/ogg';
  }
  return type;
};

export const safeFile = (f: File) => {
  const safeType = getBlobSafeMimeType(f.type);
  if (safeType !== f.type) {
    return new File([f], f.name, { type: safeType });
  }
  return f;
};

export const mimeTypeToExt = (mimeType: string): string => {
  const extStart = mimeType.lastIndexOf('/') + 1;
  return mimeType.slice(extStart);
};
export const getFileNameExt = (fileName: string): string => {
  const extStart = fileName.lastIndexOf('.') + 1;
  return fileName.slice(extStart);
};
export const getFileNameWithoutExt = (fileName: string): string => {
  const extStart = fileName.lastIndexOf('.');
  if (extStart === 0 || extStart === -1) return fileName;
  return fileName.slice(0, extStart);
};

/**
 * A trailing dot followed by an unbroken run of alphanumerics carrying at least
 * one letter. That letter is what separates a real extension from a dot which
 * merely happens to sit near the end of a name: ".mp4" and ".7z" qualify, the
 * tails of "v1.0" and "Fig. 3" do not.
 */
const FILE_EXT_REG = /\.[a-z0-9]*[a-z][a-z0-9]*$/i;

/**
 * `fileName` with an extension for `mimeType` appended, unless it already ends
 * in one. For saving media named after something other than a filename — a
 * title, say — where an extensionless file is one the OS cannot open. Never
 * rewrites an extension already there, even a mismatched one: that name came
 * from somewhere that knew it, and this doesn't.
 */
/**
 * Where the mime subtype is not the extension anyone actually writes. Pixiv
 * names its own jpeg originals "_p0.jpg", and a file saved from one should
 * match rather than read as a different file in a directory listing.
 */
const EXT_BY_SUBTYPE: Record<string, string> = {
  jpeg: 'jpg',
  'svg+xml': 'svg',
  quicktime: 'mov',
};

export const fileNameWithExt = (fileName: string, mimeType: string): string => {
  if (FILE_EXT_REG.test(fileName)) return fileName;
  // Parameters like "; charset=..." are not part of the subtype.
  const subtype = mimeTypeToExt(mimeType).split(';')[0].trim().toLowerCase();
  const ext = EXT_BY_SUBTYPE[subtype] ?? subtype;
  return FILE_EXT_REG.test(`.${ext}`) ? `${fileName}.${ext}` : fileName;
};
