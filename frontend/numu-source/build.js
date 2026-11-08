import { mkdir, copyFile, readdir } from 'node:fs/promises';
await mkdir('dist/src', { recursive: true });
for (const name of ['index.html', 'favicon.svg']) await copyFile(name, `dist/${name}`);
for (const name of await readdir('src')) {
  if (/\.(js|css)$/.test(name)) await copyFile(`src/${name}`, `dist/src/${name}`);
}
console.log('Static NUMU build created in dist/');

// Preserve static badge/logo assets in the Vercel production build.
for (const folder of ['badges', 'logos']) {
  try {
    await mkdir(`dist/src/${folder}`, { recursive: true });
    for (const name of await readdir(`src/${folder}`)) {
      await copyFile(`src/${folder}/${name}`, `dist/src/${folder}/${name}`);
    }
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
}
