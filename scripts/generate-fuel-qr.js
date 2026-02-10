import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// URL to your fuel registry page
// Update this with your actual production URL
const FUEL_REGISTRY_URL = 'https://polendach24.app/fuel-registry';

// Generate QR code
async function generateQRCode() {
    try {
        // Generate QR code as PNG
        const outputPath = path.join(__dirname, '../public/fuel-registry-qr.png');

        await QRCode.toFile(outputPath, FUEL_REGISTRY_URL, {
            width: 500,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });

        console.log('✅ QR Code generated successfully!');
        console.log(`📍 Location: ${outputPath}`);
        console.log(`🔗 URL: ${FUEL_REGISTRY_URL}`);
        console.log('\n📋 Next steps:');
        console.log('1. Open the file: public/fuel-registry-qr.png');
        console.log('2. Print it on A4 paper');
        console.log('3. Attach it to your fuel dispenser');

    } catch (error) {
        console.error('❌ Error generating QR code:', error);
    }
}

generateQRCode();
