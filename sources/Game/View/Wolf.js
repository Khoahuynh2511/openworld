import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

export default class Wolf {
    constructor(scene, time, initialPosition, audioListener, enableSound) {
        console.log('[Wolf.js] Constructor started for wolf at', initialPosition);
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
        console.log('[Wolf.js] Constructor finished, loadModel called');
    }

    loadModel() {
        console.log('[Wolf.js] loadModel started');
        this.gltfLoader.load(
            '/models/animals/Wolf.glb', // Path to the model
            (gltf) => {
                console.log('[Wolf.js] Model loaded successfully:', gltf);
                this.model = gltf.scene
                this.model.scale.set(0.9, 0.9, 0.9) // Initial scale
                this.model.position.copy(this.initialPosition);
                this.model.rotation.y = Math.random() * Math.PI * 2; // Random initial rotation
                this.scene.add(this.model)
                console.log('[Wolf.js] Model added to scene at', this.initialPosition);
                if (gltf.animations && gltf.animations.length) {
                    console.log('[Wolf.js] Animations found:', gltf.animations);
                    this.mixer = new THREE.AnimationMixer(this.model)
                    const action = this.mixer.clipAction(gltf.animations[0])
                    action.timeScale = 0.5;
                    action.play()
                    console.log('[Wolf.js] Animation started:', gltf.animations[0].name);
                } else {
                    console.log('[Wolf.js] No animations found in model');
                }
                if (this.enableSoundOnLoad) {
                    this.enableSound();
                }
            },
            undefined,
            (error) => {
                console.error('[Wolf.js] An error happened while loading the wolf model:', error)
            }
        )
    }

    enableSound() {
        console.log('[Wolf.js] enableSound called');
        if (this.sound) {
            this.model.remove(this.sound);
            this.sound.stop();
            this.sound = null;
        }
        if (!this.audioListener) return;
        const audioLoader = new THREE.AudioLoader();
        this.sound = new THREE.PositionalAudio(this.audioListener);
        audioLoader.load('/sounds/wolf.mp3', (buffer) => {
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