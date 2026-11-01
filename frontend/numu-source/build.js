import { mkdir, copyFile, readdir } from 'node:fs/promises';
await mkdir('dist/src', { recursive: true });
for (const name of ['index.html', 'favicon.svg', 'favicon.ico']) await copyFile(name, `dist/${name}`);
await mkdir('dist/assets', { recursive: true });
for (const name of await readdir('assets')) await copyFile(`assets/${name}`, `dist/assets/${name}`);
for (const name of await readdir('src')) {
  if (/\.(js|css)$/.test(name)) await copyFile(`src/${name}`, `dist/src/${name}`);
}
console.log('Static NUMU build created in dist/');
