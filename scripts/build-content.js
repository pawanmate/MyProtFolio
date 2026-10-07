const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const contentDir = path.join(root, 'content');
const read = (name) => JSON.parse(fs.readFileSync(path.join(contentDir, name), 'utf8'));

const data = {
  site: read('site.json'),
  skills: read('skills.json').items,
  hero: read('hero.json').items,
  projects: read('projects.json').items
};

const output = `/* Generated automatically from /content. Do not edit manually. */\nwindow.PORTFOLIO_DATA = ${JSON.stringify(data, null, 2)};\n`;
fs.writeFileSync(path.join(root, 'content.generated.js'), output);
console.log('Built content.generated.js');
