import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

export default class Stag {
    constructor(scene, time, initialPosition, audioListener, enableSound) {
        console.log('[Stag.js] Constructor started for stag at', initialPosition);
        this.scene = scene;
        this.time = time;
        this.initialPosition = initialPosition;
        this.audioListener = audioListener;
        this.sound = null;
        this.enableSoundOnLoad = enableSound;
        this.gltfLoader = new GLTFLoader()
        this.mixer = null
        this.model = null

        this.loadModel()
        console.log('[Stag.js] Constructor finished, loadModel called');
    }

    loadModel() {
        console.log('[Stag.js] loadModel started');
        this.gltfLoader.load(
            '/models/animals/Stag.glb', // Path to the model
            (gltf) => {
                console.log('[Stag.js] Model loaded successfully:', gltf);
                this.model = gltf.scene
                this.model.scale.set(0.8, 0.8, 0.8) // Initial scale
                this.model.position.copy(this.initialPosition);
                this.model.rotation.y = Math.random() * Math.PI * 2; // Random initial rotation
                this.scene.add(this.model)
                if (gltf.animations && gltf.animations.length) {
                    console.log('[Stag.js] Animations found:', gltf.animations);
                    this.mixer = new THREE.AnimationMixer(this.model)
                    const action = this.mixer.clipAction(gltf.animations[0])
                    action.timeScale = 0.5;
                    action.play()
                    console.log('[Stag.js] Animation started:', gltf.animations[0].name);
                } else {
                    console.log('[Stag.js] No animations found in model');
                }
                if (this.enableSoundOnLoad) {
                    this.enableSound();
                }
            },
            undefined,
            (error) => {
                console.error('[Stag.js] An error happened while loading the stag model:', error)
            }
        )
    }

    enableSound() {
        console.log('[Stag.js] enableSound called');
        if (this.sound) {
            this.model.remove(this.sound);
            this.sound.stop();
            this.sound = null;
        }
        if (!this.audioListener) return;
        const audioLoader = new THREE.AudioLoader();
        this.sound = new THREE.PositionalAudio(this.audioListener);
        audioLoader.load('/sounds/stag.mp3', (buffer) => {
            this.sound.setBuffer(buffer);
            this.sound.setRefDistance(10);
            this.sound.setLoop(true);
            this.sound.setVolume(1);
            this.sound.play();
        });
        this.model.add(this.sound);
    }

    disableSound() {
        if (this.sound) {
            this.sound.stop();
            this.model.remove(this.sound);
            this.sound = null;
        }
    }

    update() {
        if (this.mixer) {
            const deltaTime = this.time.delta
            this.mixer.update(deltaTime)
        }
    }
} 