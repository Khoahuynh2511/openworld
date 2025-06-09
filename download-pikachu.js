// Script tự động tải model Pikachu
// Chạy: node download-pikachu.js

const https = require('https')
const fs = require('fs')
const path = require('path')

const PIKACHU_MODEL_ID = '6bf624f2be9b4990a4fbd01c7767b41d'

// URL trực tiếp để tải model (nếu public)
const DIRECT_URLS = [
    // Thử các URL trực tiếp có thể có
    `https://media.sketchfab.com/models/${PIKACHU_MODEL_ID}/thumbnails/`,
    `https://sketchfab.com/i/models/${PIKACHU_MODEL_ID}`,
    // Backup: sử dụng model khác từ THREE.js
    'https://threejs.org/examples/models/gltf/Duck/glTF-Binary/Duck.glb'
]

async function downloadModel(url, filename) {
    return new Promise((resolve, reject) => {
        console.log(`🔄 Trying to download from: ${url}`)
        
        const file = fs.createWriteStream(filename)
        
        const request = https.get(url, (response) => {
            if (response.statusCode === 200) {
                response.pipe(file)
                
                file.on('finish', () => {
                    file.close()
                    console.log(`✅ Downloaded: ${filename}`)
                    resolve(true)
                })
            } else {
                file.close()
                fs.unlink(filename, () => {}) // Delete empty file
                console.log(`❌ Failed: ${response.statusCode} - ${url}`)
                reject(new Error(`HTTP ${response.statusCode}`))
            }
        }).on('error', (err) => {
            file.close()
            fs.unlink(filename, () => {})
            console.log(`❌ Error: ${err.message}`)
            reject(err)
        })
        
        // Timeout sau 30 giây
        request.setTimeout(30000, () => {
            request.abort()
            reject(new Error('Timeout'))
        })
    })
}

async function downloadPikachu() {
    // Tạo thư mục models nếu chưa có
    const modelsDir = './public/models'
    if (!fs.existsSync(modelsDir)) {
        fs.mkdirSync(modelsDir, { recursive: true })
        console.log('📁 Created models directory')
    }
    
    const outputFile = path.join(modelsDir, 'pikachu.glb')
    
    // Thử download từ URL backup (Duck model từ THREE.js)
    console.log('🦆 Using Duck model as Pikachu replacement...')
    const backupUrl = 'https://threejs.org/examples/models/gltf/Duck/glTF-Binary/Duck.glb'
    
    try {
        await downloadModel(backupUrl, outputFile)
        console.log('\n✅ SUCCESS!')
        console.log(`📁 Model saved to: ${outputFile}`)
        console.log('\n🎮 Next steps:')
        console.log('1. Run: npm run dev')
        console.log('2. Press C or click 👤 button')
        console.log('3. Select "Pikachu 3D ⚡"')
        console.log('\n📝 Note: Using Duck model as placeholder')
        console.log('You can replace it with real Pikachu later!')
        
    } catch (error) {
        console.log('\n❌ Auto-download failed!')
        console.log('\n📥 Manual download steps:')
        console.log('1. Go to: https://sketchfab.com/3d-models/image-to-stlcom--pikachuglb-6bf624f2be9b4990a4fbd01c7767b41d')
        console.log('2. Click "Download" button')
        console.log('3. Choose GLB format')
        console.log('4. Save as: public/models/pikachu.glb')
        console.log('5. Run: npm run dev')
    }
}

// Chạy script
downloadPikachu() 