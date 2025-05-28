import * as THREE from 'three'

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import Game from '@/Game.js'
import View from '@/View/View.js'
import State from '@/State/State.js'

export default class Trees
{
    constructor()
    {
        this.game = Game.getInstance()
        this.view = View.getInstance()
        this.state = State.getInstance()
        this.scene = this.view.scene

        this.treesPerChunk = 5
        this.treeModel = null
        this.chunkQueue = []
        this.processed = new Set()
        this.spawnProbability = 0.3
        this.maxSlope = 0.5

        this.loader = new GLTFLoader()
        this.loader.load('/models/giant_low_poly_tree/scene.gltf', (gltf) =>
        {
            // Normalize all tree meshes to StandardMaterial so scene lights affect them
            gltf.scene.traverse(child => {
                if(child.isMesh && child.material) {
                    const old = child.material;
                    child.material = new THREE.MeshStandardMaterial({
                        map: old.map,
                        normalMap: old.normalMap,
                        roughnessMap: old.roughnessMap,
                        metalnessMap: old.metalnessMap,
                        aoMap: old.aoMap,
                        color: old.color || new THREE.Color(0xffffff),
                        metalness: old.metalness !== undefined ? old.metalness : 0.2,
                        roughness: old.roughness !== undefined ? old.roughness : 0.8,
                        side: old.side,
                        transparent: old.transparent,
                        opacity: old.opacity
                    });
                    child.material.needsUpdate = true;
                }
            });
            this.treeModel = gltf.scene
            this.chunkQueue.forEach(chunk => this._createTreesInChunk(chunk))
            this.chunkQueue = []
        })

        // Helper to subscribe to a chunk's ready event
        const subscribeToChunk = (chunk) => {
            chunk.events.on('ready', () => {
                if(!chunk.final) return
                if(this.treeModel) this._createTreesInChunk(chunk)
                else this.chunkQueue.push(chunk)
            })
        }

        // Subscribe to existing chunks (for ones created before Trees initialized)
        this.state.chunks.allChunks.forEach(subscribeToChunk)

        // Subscribe to future chunks
        this.state.chunks.events.on('create', subscribeToChunk)
    }

    _createTreesInChunk(chunk)
    {
        if(this.processed.has(chunk.id))
            return

        this.processed.add(chunk.id)

        const group = new THREE.Group()
        group.name = `trees-chunk-${chunk.id}`

        for(let i = 0; i < this.treesPerChunk; i++) {
            if(Math.random() > this.spawnProbability) continue

            const x = THREE.MathUtils.lerp(chunk.bounding.xMin, chunk.bounding.xMax, Math.random())
            const z = THREE.MathUtils.lerp(chunk.bounding.zMin, chunk.bounding.zMax, Math.random())
            let y = 0
            if(chunk.terrain && chunk.terrain.ready) {
                y = chunk.terrain.getElevationForPosition(x, z) || 0
            }
            const amp = this.state.terrains.baseAmplitude || 100
            if(y < 0 || y > amp * 0.3) continue
            const delta = 1
            const hL = chunk.terrain.getElevationForPosition(x - delta, z)
            const hR = chunk.terrain.getElevationForPosition(x + delta, z)
            const hD = chunk.terrain.getElevationForPosition(x, z - delta)
            const hU = chunk.terrain.getElevationForPosition(x, z + delta)
            if(hL !== false && hR !== false && hD !== false && hU !== false) {
                const slopeX = (hR - hL) / (2 * delta)
                const slopeZ = (hU - hD) / (2 * delta)
                const slopeMag = Math.hypot(slopeX, slopeZ)
                if(slopeMag > this.maxSlope) continue
            }
            const tree = this.treeModel.clone(true)
            tree.position.set(x, y, z)
            tree.rotation.y = Math.random() * Math.PI * 2
            group.add(tree)
        }

        this.scene.add(group)
    }

    update()
    {
        // Trees are static; optionally animate them here
    }
} 