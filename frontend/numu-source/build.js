import { mkdir, copyFile, readdir } from 'node:fs/promises';
await mkdir('dist/src', { recursive: true });
for (const name of ['index.html', 'favicon.svg']) await copyFile(name, `dist/${name}`);
for (const name of await readdir('src')) {
  if (/\.(js|css)$/.test(name)) await copyFile(`src/${name}`, `dist/src/${name}`);
}
console.log('Static NUMU build created in dist/');
