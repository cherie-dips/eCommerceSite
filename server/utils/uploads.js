const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");

// Everything users upload lives under server/uploads (or UPLOAD_DIR) and is served at /uploads/...
const UPLOAD_ROOT = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(__dirname, "..", "uploads");
const UPLOAD_DIRS = {
  products: path.join(UPLOAD_ROOT, "products"),
  designs: path.join(UPLOAD_ROOT, "designs"),
  // Design images from orders placed before designs were saved separately
  customizations: path.join(UPLOAD_ROOT, "customizations"),
};

// Only real photo formats. SVG is not allowed (it can contain scripts).
const IMAGE_TYPES = { "image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp" };

// First bytes of each allowed format, to reject files that only pretend to be images.
const looksLikeImage = (filePath) => {
  try {
    const fd = fs.openSync(filePath, "r");
    const header = Buffer.alloc(12);
    fs.readSync(fd, header, 0, 12, 0);
    fs.closeSync(fd);
    const isPng = header.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    const isJpeg = header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
    const isWebp = header.slice(0, 4).toString() === "RIFF" && header.slice(8, 12).toString() === "WEBP";
    return isPng || isJpeg || isWebp;
  } catch {
    return false;
  }
};

const removeFiles = (files) => {
  for (const file of files || []) fs.unlink(file.path, () => {});
};

// All files of a multer request, whether it used .single, .array or .fields
const requestFiles = (req) => {
  if (req.file) return [req.file];
  if (Array.isArray(req.files)) return req.files;
  return Object.values(req.files || {}).flat();
};

// "uploads/products/abc.jpg" - the path stored in the database and used in URLs
const publicPath = (file) => `uploads/${path.relative(UPLOAD_ROOT, file.path).split(path.sep).join("/")}`;

// Builds an upload middleware that saves images into `dir`, checks them, and turns
// upload problems into friendly 400 responses.
const imageUploader = (dir, { maxSizeMb, fields, single }) => {
  const upload = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
      },
      // The file name is always generated here, never taken from the upload.
      filename: (req, file, cb) => cb(null, `${uuidv4()}${IMAGE_TYPES[file.mimetype]}`),
    }),
    limits: { fileSize: maxSizeMb * 1024 * 1024, files: 30 },
    fileFilter: (req, file, cb) => {
      if (IMAGE_TYPES[file.mimetype]) return cb(null, true);
      cb(new Error("Only PNG, JPG or WebP images can be uploaded."));
    },
  });
  const handler = single ? upload.single(single) : upload.fields(fields);

  return (req, res, next) => {
    handler(req, res, (err) => {
      if (err) {
        removeFiles(requestFiles(req));
        const message =
          err.code === "LIMIT_FILE_SIZE"
            ? `Each image must be ${maxSizeMb} MB or smaller.`
            : err.code === "LIMIT_UNEXPECTED_FILE"
              ? "Too many images in one upload."
              : err.message || "Image upload failed.";
        return res.status(400).json({ error: message });
      }
      const files = requestFiles(req);
      if (files.some((f) => !looksLikeImage(f.path))) {
        removeFiles(files);
        return res.status(400).json({ error: "One of the files is not a valid image." });
      }
      next();
    });
  };
};

module.exports = {
  UPLOAD_ROOT,
  UPLOAD_DIRS,
  imageUploader,
  removeFiles,
  requestFiles,
  publicPath,
};
