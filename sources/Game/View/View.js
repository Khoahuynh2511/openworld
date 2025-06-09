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
import Cow from './Cow.js'
import Bird from './Bird.js'
import Stag from './Stag.js'
import Wolf from './Wolf.js'
import Horse from './Horse.js'
import TerrainHelper from './TerrainHelper.js'

import State from '@/State/State.js'
import Game from '@/Game.js'
import Debug from '@/Debug/Debug.js'

import * as THREE from 'three'
import RainStorm from './Effects/RainStorm/rainstorm.js'

const MAX_SPAWN_ATTEMPTS_PER_ANIMAL = 20; // Max attempts to find a flat spot

// Default flatness parameters (smaller animals)
const DEFAULT_FLATNESS_CHECK_DISTANCE = 1.5;
const DEFAULT_MAX_ELEVATION_DIFFERENCE = 1.0;

// Cow-specific flatness parameters
const COW_FLATNESS_CHECK_DISTANCE = 3; // Wider check area for cows
const COW_MAX_ELEVATION_DIFFERENCE = 0.8;  // Stricter elevation diff for cows

// Panther-specific flatness parameters
const PANTHER_FLATNESS_CHECK_DISTANCE = 3;
const PANTHER_MAX_ELEVATION_DIFFERENCE = 0.8;

// Deer-specific flatness parameters
const DEER_FLATNESS_CHECK_DISTANCE = 3;
const DEER_MAX_ELEVATION_DIFFERENCE = 0.8;

// Sheep-specific flatness parameters
const SHEEP_FLATNESS_CHECK_DISTANCE = 2.5;
const SHEEP_MAX_ELEVATION_DIFFERENCE = 0.8;

// Stag-specific flatness parameters
const STAG_FLATNESS_CHECK_DISTANCE = 3;
const STAG_MAX_ELEVATION_DIFFERENCE = 0.8;

// Horse-specific flatness parameters
const HORSE_FLATNESS_CHECK_DISTANCE = 2.5;
const HORSE_MAX_ELEVATION_DIFFERENCE = 0.8;

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
        const game = Game.getInstance()
        const stateTerrains = game.state.terrains
        this.debug = game.debug;

        // Đọc trạng thái sound từ localStorage nếu có
        let globalSound = false;
        try {
            const stored = localStorage.getItem('globalAnimalSound');
            if (stored !== null) globalSound = JSON.parse(stored);
        } catch (e) {}

        this.terrainHelper = new TerrainHelper({
            seed: stateTerrains.seed,
            lacunarity: stateTerrains.lacunarity,
            persistence: stateTerrains.persistence,
            maxIterations: stateTerrains.maxIterations,
            baseFrequency: stateTerrains.baseFrequency,
            baseAmplitude: stateTerrains.baseAmplitude,
            power: stateTerrains.power,
            elevationOffset: stateTerrains.elevationOffset,
            iterationsOffsets: stateTerrains.iterationsOffsets
        });

        this.scene = new THREE.Scene()
        this.scene.userData.terrainHelper = this.terrainHelper;
        this.scene.userData.elevationIterations = stateTerrains.maxIterations;
        
        // Initialize state for lighting
        this.state = State.getInstance()
        this.game = Game.getInstance()

        // Basic lighting setup
        const ambient = new THREE.AmbientLight(0xffffff, 0.6)
        this.scene.add(ambient)
        this.directionalLight = new THREE.DirectionalLight(0xffffff, 1)
        this.scene.add(this.directionalLight)
        
        this.camera = new Camera()
        this.audioListener = new THREE.AudioListener();
        this.camera.instance.add(this.audioListener);

        // Đảm bảo resume audio context khi có tương tác người dùng đầu tiên
        const tryResumeAudio = () => {
            if (this.audioListener && this.audioListener.context && this.audioListener.context.state === 'suspended') {
                this.audioListener.context.resume();
            }
        };
        window.addEventListener('pointerdown', tryResumeAudio, { once: true });
        window.addEventListener('keydown', tryResumeAudio, { once: true });

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

        // Animal config state (phải đặt trước khi spawn động vật)
        this.animalConfig = {
            spawnRange: {
                cow: 100,
                bird: 100,
                wolf: 100,
                stag: 100,
                horse: 100,
            },
            number: {
                cow: 2,
                bird: 10,
                wolf: 2,
                stag: 2,
                horse: 2,
            },
            scale: {
                cow: 1,
                bird: 1,
                wolf: 1,
                stag: 1,
                horse: 1,
            },
            sound: {
                cow: globalSound,
                bird: globalSound,
                wolf: globalSound,
                stag: globalSound,
                horse: globalSound,
            }
        };

        this.cows = [];
        this.birds = [];
        this.blackPanthers = [];
        this.deers = [];
        this.sheeps = [];

        // Spawn all animals according to config
        this.spawnAnimalsByConfig();

        if (this.debug && this.debug.active) {
            this.setDebug();
            this.setDebugUI();
        }
    }

    isPositionSuitable(x, z, elevationIterations, flatnessCheckDistance, maxElevationDifference) {
        const centerElevation = this.terrainHelper.getElevation(x, z, elevationIterations);

        const pointsToSample = [
            { dx: flatnessCheckDistance, dz: 0 },
            { dx: -flatnessCheckDistance, dz: 0 },
            { dx: 0, dz: flatnessCheckDistance },
            { dx: 0, dz: -flatnessCheckDistance },
        ];

        for (const point of pointsToSample) {
            const sampleX = x + point.dx;
            const sampleZ = z + point.dz;
            const sampleElevation = this.terrainHelper.getElevation(sampleX, sampleZ, elevationIterations);
            if (Math.abs(sampleElevation - centerElevation) > maxElevationDifference) {
                return false; // Too steep
            }
        }
        return true; // Area is considered flat enough
    }

    isFarFromOthers(x, z, existingAnimals, minDistance) {
        for (const animal of existingAnimals) {
            if (!animal || !animal.model || !animal.model.position) continue;
            const dx = animal.model.position.x - x;
            const dz = animal.model.position.z - z;
            if (Math.sqrt(dx*dx + dz*dz) < minDistance) {
                return false;
            }
        }
        return true;
    }

    setDebugUI()
    {
        const debug = Debug.getInstance()
        if (!debug.active) return

        const folder = debug.ui.getFolder('view/weather')
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
        
        // Update animals
        for (const cow of this.cows) {
            cow.update();
        }
        for (const bird of this.birds) {
            bird.update();
        }
        for (const panther of this.blackPanthers) {
            panther.update();
        }
        for (const deer of this.deers) {
            deer.update();
        }
        for (const sheep of this.sheeps) {
            sheep.update();
        }

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

    setDebug() {
        const animalsFolder = this.debug.ui.getFolder('view/animals');

        // Spawn Range
        const spawnRangeFolder = animalsFolder.addFolder('spawn range');
        spawnRangeFolder.add(this.animalConfig.spawnRange, 'cow', 10, 500, 1).name('Cow');
        spawnRangeFolder.add(this.animalConfig.spawnRange, 'bird', 10, 500, 1).name('Bird');
        spawnRangeFolder.add(this.animalConfig.spawnRange, 'wolf', 10, 500, 1).name('Wolf');
        spawnRangeFolder.add(this.animalConfig.spawnRange, 'stag', 10, 500, 1).name('Stag');
        spawnRangeFolder.add(this.animalConfig.spawnRange, 'horse', 10, 500, 1).name('Horse');

        // Number
        const numberFolder = animalsFolder.addFolder('number');
        numberFolder.add(this.animalConfig.number, 'cow', 0, 20, 1).name('Cow');
        numberFolder.add(this.animalConfig.number, 'bird', 0, 50, 1).name('Bird');
        numberFolder.add(this.animalConfig.number, 'wolf', 0, 10, 1).name('Wolf');
        numberFolder.add(this.animalConfig.number, 'stag', 0, 20, 1).name('Stag');
        numberFolder.add(this.animalConfig.number, 'horse', 0, 20, 1).name('Horse');

        // Scale
        const scaleFolder = animalsFolder.addFolder('scale');
        scaleFolder.add(this.animalConfig.scale, 'cow', 0.1, 5, 0.01).name('Cow');
        scaleFolder.add(this.animalConfig.scale, 'bird', 0.1, 5, 0.01).name('Bird');
        scaleFolder.add(this.animalConfig.scale, 'wolf', 0.1, 5, 0.01).name('Wolf');
        scaleFolder.add(this.animalConfig.scale, 'stag', 0.1, 5, 0.01).name('Stag');
        scaleFolder.add(this.animalConfig.scale, 'horse', 0.1, 5, 0.01).name('Horse');

        // Apply button
        animalsFolder.add({ apply: () => this.applyAnimalConfig() }, 'apply').name('Apply');

        // Sound (single toggle for all animals, placed below Apply)
        const soundFolder = animalsFolder.addFolder('sound');
        const soundToggle = { enabled: this.animalConfig.sound.cow };
        soundFolder.add(soundToggle, 'enabled').name('Enable All Sounds').onChange((value) => {
            // Update all sound states
            this.animalConfig.sound.cow = value;
            this.animalConfig.sound.bird = value;
            this.animalConfig.sound.wolf = value;
            this.animalConfig.sound.stag = value;
            this.animalConfig.sound.horse = value;
            // Lưu vào localStorage
            try {
                localStorage.setItem('globalAnimalSound', JSON.stringify(value));
            } catch (e) {}
            // Reload the page
            window.location.reload();
        });
    }

    applyAnimalConfig() {
        // Remove old animals from scene
        for (const cow of this.cows) if (cow.model) this.scene.remove(cow.model);
        for (const bird of this.birds) if (bird.model) this.scene.remove(bird.model);
        for (const panther of this.blackPanthers) if (panther.model) this.scene.remove(panther.model);
        for (const deer of this.deers) if (deer.model) this.scene.remove(deer.model);
        for (const sheep of this.sheeps) if (sheep.model) this.scene.remove(sheep.model);
        this.cows = [];
        this.birds = [];
        this.blackPanthers = [];
        this.deers = [];
        this.sheeps = [];

        // Spawn new animals with config
        this.spawnAnimalsByConfig();

        // Update sound on/off for all animals
        for (const cow of this.cows) {
            if (this.animalConfig.sound.cow) {
                cow.enableSound();
            } else {
                cow.disableSound();
            }
        }
        for (const bird of this.birds) {
            if (this.animalConfig.sound.bird) {
                bird.enableSound();
            } else {
                bird.disableSound();
            }
        }
        for (const wolf of this.blackPanthers) {
            if (this.animalConfig.sound.wolf) {
                wolf.enableSound();
            } else {
                wolf.disableSound();
            }
        }
        for (const stag of this.deers) {
            if (this.animalConfig.sound.stag) {
                stag.enableSound();
            } else {
                stag.disableSound();
            }
        }
        for (const horse of this.sheeps) {
            if (this.animalConfig.sound.horse) {
                horse.enableSound();
            } else {
                horse.disableSound();
            }
        }
    }

    spawnAnimalsByConfig() {
        const elevationIterations = Game.getInstance().state.terrains.maxIterations;
        const time = Game.getInstance().state.time;
        const minDistance = 3;
        // Cows
        for (let i = 0; i < this.animalConfig.number.cow; i++) {
            const range = this.animalConfig.spawnRange.cow;
            let x, z, y;
            let found = false;
            for (let attempt = 0; attempt < MAX_SPAWN_ATTEMPTS_PER_ANIMAL; attempt++) {
                x = (Math.random() - 0.5) * range * 2;
                z = (Math.random() - 0.5) * range * 2;
                if (
                    this.isPositionSuitable(x, z, elevationIterations, COW_FLATNESS_CHECK_DISTANCE, COW_MAX_ELEVATION_DIFFERENCE) &&
                    this.isFarFromOthers(x, z, this.cows, minDistance)
                ) {
                    found = true;
                    break;
                }
            }
            y = this.terrainHelper.getElevation(x, z, elevationIterations) + 0.75;
            if (!found) {
                console.warn(`[View.js] Could not find a flat spot for Cow after ${MAX_SPAWN_ATTEMPTS_PER_ANIMAL} attempts. Spawning at last tried location.`);
            }
            const cow = new Cow(this.scene, time, new THREE.Vector3(x, y, z), this.audioListener, this.animalConfig.sound.cow);
            if (cow.model) cow.model.scale.setScalar(this.animalConfig.scale.cow);
            this.cows.push(cow);
        }
        // Birds (không kiểm tra độ phẳng)
        for (let i = 0; i < this.animalConfig.number.bird; i++) {
            const range = this.animalConfig.spawnRange.bird;
            let x, z, y;
            let found = false;
            for (let attempt = 0; attempt < MAX_SPAWN_ATTEMPTS_PER_ANIMAL; attempt++) {
                x = (Math.random() - 0.5) * range * 2;
                z = (Math.random() - 0.5) * range * 2;
                if (this.isFarFromOthers(x, z, this.birds, minDistance)) {
                    found = true;
                    break;
                }
            }
            y = this.terrainHelper.getElevation(x, z, elevationIterations) + 40;
            if (!found) {
                console.warn(`[View.js] Could not find a non-overlapping spot for Bird after ${MAX_SPAWN_ATTEMPTS_PER_ANIMAL} attempts. Spawning at last tried location.`);
            }
            const bird = new Bird(this.scene, time, new THREE.Vector3(x, y, z), this.audioListener, this.animalConfig.sound.bird);
            if (bird.model) bird.model.scale.setScalar(this.animalConfig.scale.bird);
            this.birds.push(bird);
        }
        // Wolfs
        for (let i = 0; i < this.animalConfig.number.wolf; i++) {
            const range = this.animalConfig.spawnRange.wolf;
            let x, z, y;
            let found = false;
            for (let attempt = 0; attempt < MAX_SPAWN_ATTEMPTS_PER_ANIMAL; attempt++) {
                x = (Math.random() - 0.5) * range * 2;
                z = (Math.random() - 0.5) * range * 2;
                if (
                    this.isPositionSuitable(x, z, elevationIterations, PANTHER_FLATNESS_CHECK_DISTANCE, PANTHER_MAX_ELEVATION_DIFFERENCE) &&
                    this.isFarFromOthers(x, z, this.blackPanthers, minDistance)
                ) {
                    found = true;
                    break;
                }
            }
            y = this.terrainHelper.getElevation(x, z, elevationIterations) + 0.5;
            if (!found) {
                console.warn(`[View.js] Could not find a flat spot for Wolf after ${MAX_SPAWN_ATTEMPTS_PER_ANIMAL} attempts. Spawning at last tried location.`);
            }
            const wolf = new Wolf(this.scene, time, new THREE.Vector3(x, y, z), this.audioListener, this.animalConfig.sound.wolf);
            if (wolf.model) wolf.model.scale.setScalar(this.animalConfig.scale.wolf);
            this.blackPanthers.push(wolf);
        }
        // Stags
        for (let i = 0; i < this.animalConfig.number.stag; i++) {
            const range = this.animalConfig.spawnRange.stag;
            let x, z, y;
            let found = false;
            for (let attempt = 0; attempt < MAX_SPAWN_ATTEMPTS_PER_ANIMAL; attempt++) {
                x = (Math.random() - 0.5) * range * 2;
                z = (Math.random() - 0.5) * range * 2;
                if (
                    this.isPositionSuitable(x, z, elevationIterations, STAG_FLATNESS_CHECK_DISTANCE, STAG_MAX_ELEVATION_DIFFERENCE) &&
                    this.isFarFromOthers(x, z, this.deers, minDistance)
                ) {
                    found = true;
                    break;
                }
            }
            y = this.terrainHelper.getElevation(x, z, elevationIterations) + 0.5;
            if (!found) {
                console.warn(`[View.js] Could not find a flat spot for Stag after ${MAX_SPAWN_ATTEMPTS_PER_ANIMAL} attempts. Spawning at last tried location.`);
            }
            const stag = new Stag(this.scene, time, new THREE.Vector3(x, y, z), this.audioListener, this.animalConfig.sound.stag);
            if (stag.model) stag.model.scale.setScalar(this.animalConfig.scale.stag);
            this.deers.push(stag);
        }
        // Horses
        for (let i = 0; i < this.animalConfig.number.horse; i++) {
            const range = this.animalConfig.spawnRange.horse;
            let x, z, y;
            let found = false;
            for (let attempt = 0; attempt < MAX_SPAWN_ATTEMPTS_PER_ANIMAL; attempt++) {
                x = (Math.random() - 0.5) * range * 2;
                z = (Math.random() - 0.5) * range * 2;
                if (
                    this.isPositionSuitable(x, z, elevationIterations, HORSE_FLATNESS_CHECK_DISTANCE, HORSE_MAX_ELEVATION_DIFFERENCE) &&
                    this.isFarFromOthers(x, z, this.sheeps, minDistance)
                ) {
                    found = true;
                    break;
                }
            }
            y = this.terrainHelper.getElevation(x, z, elevationIterations);
            if (!found) {
                console.warn(`[View.js] Could not find a flat spot for Horse after ${MAX_SPAWN_ATTEMPTS_PER_ANIMAL} attempts. Spawning at last tried location.`);
            }
            const horse = new Horse(this.scene, time, new THREE.Vector3(x, y, z), this.audioListener, this.animalConfig.sound.horse);
            if (horse.model) horse.model.scale.setScalar(this.animalConfig.scale.horse);
            this.sheeps.push(horse);
        }
    }
}