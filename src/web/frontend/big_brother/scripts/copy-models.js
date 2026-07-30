const fs = require('fs')
const path = require('path')

// This script copies face-api model files from the installed package into public/models
// Run from the frontend folder with: `node scripts/copy-models.js` or `npm run copy-models`

const frontendRoot = path.resolve(__dirname)
const srcModels = path.resolve(frontendRoot, 'node_modules', '@vladmandic', 'face-api', 'model')
const destModels = path.resolve(frontendRoot, 'public', 'models')

function fail(msg) {
  console.error(msg)
  process.exit(1)
}

if (!fs.existsSync(srcModels)) {
  fail(`Source models directory not found: ${srcModels}\nMake sure you installed @vladmandic/face-api in this frontend package (run npm install).`)
}

fs.mkdirSync(destModels, { recursive: true })

const files = fs.readdirSync(srcModels)
if (!files.length) {
  fail('No files found in source models directory: ' + srcModels)
}

for (const file of files) {
  const s = path.join(srcModels, file)
  const d = path.join(destModels, file)
  try {
    fs.copyFileSync(s, d)
    console.log('Copied', file)
  } catch (err) {
    console.warn('Failed to copy', file, err.message)
  }
}

console.log('Model copy complete. Destination:', destModels)
