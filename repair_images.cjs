const fs = require('fs');
const path = require('path');

const referencesDir = path.join(__dirname, 'public', 'references');

console.log(`Scanning directory: ${referencesDir}`);

if (!fs.existsSync(referencesDir)) {
    console.error("Directory not found!");
    process.exit(1);
}

const files = fs.readdirSync(referencesDir);

files.forEach(file => {
    if (file.toLowerCase().endsWith('.jpg') || file.toLowerCase().endsWith('.jpeg')) {
        const filePath = path.join(referencesDir, file);
        const buffer = fs.readFileSync(filePath);

        // JPEG SOI marker is FF D8
        const soiIndex = buffer.indexOf(Buffer.from([0xFF, 0xD8]));

        if (soiIndex === 0) {
            console.log(`[OK] ${file} is valid.`);
        } else if (soiIndex > 0) {
            console.log(`[FIXING] ${file}: Found SOI at offset ${soiIndex}. Stripping ${soiIndex} bytes...`);
            const newBuffer = buffer.slice(soiIndex);
            fs.writeFileSync(filePath, newBuffer);
            console.log(`[FIXED] ${file} repaired.`);
        } else {
            console.error(`[ERROR] ${file}: No JPEG SOI marker found!`);
        }
    }
});
