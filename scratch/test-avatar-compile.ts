import { generateAvatarPng } from '../src/lib/avatar/generateAvatarPng';
import * as fs from 'fs';
import * as path from 'path';

async function test() {
  try {
    console.log('Compiling avatar...');
    const buffer = await generateAvatarPng('JD', '#ff0055');
    const outputPath = path.join(__dirname, 'avatar-test.png');
    fs.writeFileSync(outputPath, buffer);
    console.log('Avatar compiled successfully, saved to:', outputPath);
  } catch (err) {
    console.error('Failed to compile avatar:', err);
  }
}

test();
