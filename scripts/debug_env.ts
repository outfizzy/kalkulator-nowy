
import fs from 'fs';
import path from 'path';
import * as dotenv from 'dotenv'; // Ensure wildcart import if using typical setup

const envPath = path.resolve(process.cwd(), '.env.local');
console.log('Checking env file at:', envPath);

if (fs.existsSync(envPath)) {
    console.log('File exists.');
    const fileContent = fs.readFileSync(envPath);
    const config = dotenv.parse(fileContent);
    console.log('Keys found:', Object.keys(config));
} else {
    console.log('File does NOT exist.');
}
