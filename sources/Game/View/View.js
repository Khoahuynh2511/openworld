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
import Trees from './Trees.js'

import State from '@/State/State.js'
import Game from '@/Game.js'
import Debug from '@/Debug/Debug.js'

import * as THREE from 'three'
import RainStorm from './Effects/RainStorm/rainstorm.js'
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
        
        // Initialize state for lighting
        this.state = State.getInstance()
        this.game = Game.getInstance()

        // Basic lighting setup
        const ambient = new THREE.AmbientLight(0xffffff, 0.6)
        this.scene.add(ambient)
        this.directionalLight = new THREE.DirectionalLight(0xffffff, 1)
        this.scene.add(this.directionalLight)
        
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
        this.trees = new Trees()
        this.enableRain = false
        this.rainEffect = null
        this.setDebugUI()
        if (this.enableRain) {
            this.rainEffect = new RainStorm(this.scene, this.camera.instance)
        }
    }

    setDebugUI()
    {
        const debug = Debug.getInstance()
        if (!debug.active) return

        const folder = debug.ui.getFolder('View/Weather')
        folder.add(this, 'enableRain')
            .name('Enable Rain')
            .onChange((value) => this.toggleRain(value))
    }

    toggleRain(enabled) {
        this.enableRain = enabled
        if (enabled && !this.rainEffect) {
            this.rainEffect = new RainStorm(this.scene, this.camera.instance)
        } else if (!enabled && this.rainEffect) {
            this.rainEffect.destroy()
            this.rainEffect = null
        }
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
        this.trees.update()
        // Sync directional light with sun
        const sunPos = this.game.state.sun.position
        this.directionalLight.position.set(sunPos.x, sunPos.y, sunPos.z)
        this.camera.update()
        this.renderer.update()
        
        // Update sound
        if(this.soundManager)
            this.soundManager.update()
        if (this.enableRain && this.rainEffect) this.rainEffect.update()
    }

    destroy()
    {
    }
}