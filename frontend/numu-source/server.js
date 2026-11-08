
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

// Use the production build if it exists.
// Otherwise, use the original files for local development.
const distRoot = path.join(projectRoot, 'dist');
const root = existsSync(path.join(distRoot, 'index.html'))
  ? distRoot
  : projectRoot;

const port = Number(process.env.PORT || 4173);

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json',
  '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const requested = decodeURIComponent(pathname);

    if (
      requested.includes('\0') ||
      !['GET', 'HEAD'].includes(req.method)
    ) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    const filename = requested === '/'
      ? '/index.html'
      : requested;

    const file = path.resolve(root, '.' + filename);

    if (!file.startsWith(root + path.sep)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    const info = await stat(file);

    if (!info.isFile()) {
      throw new Error('Not a file');
    }

    res.writeHead(200, {
      'Content-Type':
        mime[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff'
    });

    if (req.method === 'HEAD') {
      res.end();
    } else {
      res.end(await readFile(file));
    }

  } catch (error) {
    console.error('File serving error:', req.url, error.message);

    res.writeHead(404, {
      'Content-Type': 'text/plain; charset=utf-8'
    });

    res.end('Not found');
  }
});

// Listen on all interfaces for Vercel.
server.listen(port, '0.0.0.0', () => {
  console.log(`NUMU ready on port ${port}`);
  console.log(`Serving files from: ${root}`);
});
