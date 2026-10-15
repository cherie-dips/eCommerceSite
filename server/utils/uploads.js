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
  models: path.join(UPLOAD_ROOT, "models"),
  designs: path.join(UPLOAD_ROOT, "designs"),
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

// Checks an uploaded 3D model is a self-contained binary glTF (.glb) file with at least
// one shape in it. Returns a message saying what's wrong, or null when it's fine.
// Layout: 12-byte header ("glTF", version 2, total length), then a JSON chunk.
const glbProblem = (filePath) => {
  let fd;
  try {
    fd = fs.openSync(filePath, "r");
    const size = fs.fstatSync(fd).size;
    const header = Buffer.alloc(20);
    if (fs.readSync(fd, header, 0, 20, 0) < 20) return "The file is not a .glb 3D model.";
    if (header.toString("ascii", 0, 4) !== "glTF") return "The file is not a .glb 3D model.";
    if (header.readUInt32LE(4) !== 2) return "Only glTF 2.0 models are supported.";
    if (header.readUInt32LE(8) !== size) return "The 3D model file is incomplete or damaged.";
    const jsonLength = header.readUInt32LE(12);
    if (header.toString("ascii", 16, 20) !== "JSON" || jsonLength > size - 20) return "The 3D model file is damaged.";
    const json = Buffer.alloc(jsonLength);
    fs.readSync(fd, json, 0, jsonLength, 20);
    const gltf = JSON.parse(json.toString("utf8"));
    if (!Array.isArray(gltf.meshes) || gltf.meshes.length === 0) return "The 3D model has no shapes in it.";
    // Everything must be inside the one file: a .glb that points to other files can't be shown.
    const external = [...(gltf.buffers || []), ...(gltf.images || [])].some((item) => item.uri && !item.uri.startsWith("data:"));
    if (external) return "The 3D model uses separate texture or data files. Export it as a single .glb file.";
    return null;
  } catch {
    return "The file is not a valid .glb 3D model.";
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
};

// Builds an upload middleware that saves files into `dir`, checks them, and turns
// upload problems into friendly 400 responses.
//   extensionFor(file) -> the extension to save it with, or null to refuse it
//   problem(path)      -> what's wrong with a saved file, or null when it's fine
const uploader = (dir, { maxSizeMb, fields, single, extensionFor, typeError, problem, kind }) => {
  const upload = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
      },
      // The file name is always generated here, never taken from the upload.
      filename: (req, file, cb) => cb(null, `${uuidv4()}${extensionFor(file)}`),
    }),
    limits: { fileSize: maxSizeMb * 1024 * 1024, files: 30 },
    fileFilter: (req, file, cb) => {
      if (extensionFor(file)) return cb(null, true);
      cb(new Error(typeError));
    },
  });
  const handler = single ? upload.single(single) : upload.fields(fields);

  return (req, res, next) => {
    handler(req, res, (err) => {
      if (err) {
        removeFiles(requestFiles(req));
        const message =
          err.code === "LIMIT_FILE_SIZE"
            ? `Each ${kind} must be ${maxSizeMb} MB or smaller.`
            : err.code === "LIMIT_UNEXPECTED_FILE"
              ? `Too many ${kind}s in one upload.`
              : err.message || "Upload failed.";
        return res.status(400).json({ error: message });
      }
      const files = requestFiles(req);
      const found = files.map((f) => problem(f.path)).find(Boolean);
      if (found) {
        removeFiles(files);
        return res.status(400).json({ error: found });
      }
      next();
    });
  };
};

// Product photos, design previews and print files.
const imageUploader = (dir, options) =>
  uploader(dir, {
    ...options,
    kind: "image",
    extensionFor: (file) => IMAGE_TYPES[file.mimetype] || null,
    typeError: "Only PNG, JPG or WebP images can be uploaded.",
    problem: (filePath) => (looksLikeImage(filePath) ? null : "One of the files is not a valid image."),
  });

// A product's 3D model (.glb). Browsers send different types for .glb, so the name decides.
const modelUploader = (dir, options) =>
  uploader(dir, {
    ...options,
    kind: "3D model",
    extensionFor: (file) => (/\.glb$/i.test(file.originalname || "") ? ".glb" : null),
    typeError: "Upload the 3D model as a .glb file.",
    problem: glbProblem,
  });

// True when `value` is a 3D model uploaded to this server (and the file is still there).
const isUploadedModel = (value) =>
  typeof value === "string" &&
  /^uploads\/models\/[\w-]+\.glb$/.test(value) &&
  fs.existsSync(path.join(UPLOAD_ROOT, value.slice("uploads/".length)));

module.exports = {
  UPLOAD_ROOT,
  UPLOAD_DIRS,
  imageUploader,
  modelUploader,
  isUploadedModel,
  removeFiles,
  requestFiles,
  publicPath,
};
