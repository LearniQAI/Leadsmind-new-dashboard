import { pathToFileURL } from 'url';
import path from 'path';

const mod = await import(pathToFileURL(path.resolve('src/lib/builder/templates/velocity.ts')).href);
const tpl = Object.values(mod).find(v => v && typeof v === 'object' && typeof v.content === 'string');
const data = JSON.parse(tpl.content);
for (const [id, node] of Object.entries(data)) {
  if (node.type && (node.type.resolvedName === 'UserImage' || node.type.resolvedName === 'Image') && node.props.src) {
    console.log(id, '=>', node.props.src, '| parent:', node.parent);
  }
}
