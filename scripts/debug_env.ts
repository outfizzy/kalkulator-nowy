
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

const envPath = path.resolve(process.cwd(), '.env.local');
console.log('Loading env from:', envPath);

try {
    const file = fs.readFileSync(envPath);
    console.log('File found, size:', file.length);
    const envConfig = dotenv.parse(file);
    console.log('Keys found:', Object.keys(envConfig));
} catch (e) {
    console.error('Error reading env:', e);
}
