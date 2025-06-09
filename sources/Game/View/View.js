import Camera from './Camera.js'
import Chunks from './Chunks.js'
import Grass from './Grass.js'
import Noises from './Noises.js'
import Player from './Player.js'
import Renderer from './Renderer.js'
import Sky from './Sky.js'
import Terrains from './Terrains.js'
import Water from './Water.js'
import SoundManager from './SoundManager.js'

import * as THREE from 'three'

export default class View
{
    static instance

    static getInstance()
    {
        return View.instance
    }

    constructor()
    {
        if(View.instance)
            return View.instance

        View.instance = this

        this.scene = new THREE.Scene()
        
        // Thêm lighting để model GLTF không bị đen
        this.setupLighting()
        
        this.camera = new Camera()
        this.renderer = new Renderer()
        this.noises = new Noises()
        this.sky = new Sky()
        this.water = new Water()
        this.terrains = new Terrains()
        this.chunks = new Chunks()
        this.player = new Player()
        this.grass = new Grass()
        this.soundManager = new SoundManager()
    }

    setupLighting()
    {
        // Ambient light - ánh sáng môi trường để model không bị đen hoàn toàn
        this.ambientLight = new THREE.AmbientLight('#ffffff', 0.6) // Soft white light
        this.scene.add(this.ambientLight)

        // Directional light - mô phỏng ánh mặt trời
        this.directionalLight = new THREE.DirectionalLight('#ffffff', 0.8)
        this.directionalLight.position.set(-0.5, 1, -0.5) // Tương ứng với uSunPosition
        this.directionalLight.target.position.set(0, 0, 0)
        this.scene.add(this.directionalLight)
        this.scene.add(this.directionalLight.target)

        console.log('✨ Lighting system initialized for GLTF models')
    }

    resize()
    {
        this.camera.resize()
        this.renderer.resize()
        this.sky.resize()
        this.terrains.resize()
    }

    update()
    {
        this.sky.update()
        this.water.update()
        this.terrains.update()
        this.chunks.update()
        this.player.update()
        this.grass.update()
        this.camera.update()
        this.renderer.update()
        
        // Cập nhật âm thanh
        if(this.soundManager)
            this.soundManager.update()
    }

    destroy()
    {
    }
}