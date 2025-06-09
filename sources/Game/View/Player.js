import * as THREE from 'three'

import Game from '@/Game.js'
import View from '@/View/View.js'
import Debug from '@/Debug/Debug.js'
import State from '@/State/State.js'
import PlayerMaterial from './Materials/PlayerMaterial.js'

export default class Player
{
    constructor()
    {
        this.game = Game.getInstance()
        this.state = State.getInstance()
        this.view = View.getInstance()
        this.debug = Debug.getInstance()

        this.scene = this.view.scene

        this.setGroup()
        this.setHelper()
        this.setJumpEffects()
        this.setDebug()
    }

    setGroup()
    {
        this.group = new THREE.Group()
        this.scene.add(this.group)
    }
    
    setHelper()
    {
        this.helper = new THREE.Mesh()
        this.helper.material = new PlayerMaterial()
        this.helper.material.uniforms.uColor.value = new THREE.Color('#fff8d6')
        this.helper.material.uniforms.uSunPosition.value = new THREE.Vector3(- 0.5, - 0.5, - 0.5)

        this.helper.geometry = new THREE.CapsuleGeometry(0.5, 0.8, 3, 16),
        this.helper.geometry.translate(0, 0.9, 0)
        this.group.add(this.helper)

        // const arrow = new THREE.Mesh(
        //     new THREE.ConeGeometry(0.2, 0.2, 4),
        //     new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: false })
        // )
        // arrow.rotation.x = - Math.PI * 0.5
        // arrow.position.y = 1.5
        // arrow.position.z = - 0.5
        // this.helper.add(arrow)
        
        // // Axis helper
        // this.axisHelper = new THREE.AxesHelper(3)
        // this.group.add(this.axisHelper)
    }

    setJumpEffects()
    {
        // Scale animation when jumping
        this.jumpScale = {
            min: 0.9,
            max: 1.15
        }
        
        // Dust effect when landing
        this.dustGeometry = new THREE.CircleGeometry(1, 12)
        this.dustGeometry.rotateX(-Math.PI / 2)
        
        this.dustMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending
        })
        
        this.dustEffect = new THREE.Mesh(this.dustGeometry, this.dustMaterial)
        this.dustEffect.position.y = 0.05
        this.dustEffect.scale.set(0, 0, 0)
        this.group.add(this.dustEffect)
        
        this.isShowingDust = false
        this.dustTime = 0
        this.dustDuration = 0.6
    }

    setDebug()
    {
        if(!this.debug.active)
            return

        // Sphere
        const playerFolder = this.debug.ui.getFolder('view/player')

        playerFolder.addColor(this.helper.material.uniforms.uColor, 'value')
    }


    update()
    {
        const playerState = this.state.player
        const sunState = this.state.sun

        this.group.position.set(
            playerState.position.current[0],
            playerState.position.current[1],
            playerState.position.current[2]
        )
        
        // Helper
        this.helper.rotation.y = playerState.rotation
        this.helper.material.uniforms.uSunPosition.value.set(sunState.position.x, sunState.position.y, sunState.position.z)
        
        // Jump effect
        if(playerState.isJumping)
        {
            // Scaling animation when jumping
            const jumpProgress = playerState.jumpTime / playerState.jumpDuration
            const jumpScaleValue = this.jumpScale.min + Math.sin(jumpProgress * Math.PI) * (this.jumpScale.max - this.jumpScale.min)
            
            // Extend when jumping, compress when landing
            this.helper.scale.y = 2 - jumpScaleValue
            this.helper.scale.x = jumpScaleValue
            this.helper.scale.z = jumpScaleValue
            
            // Set dust effect when landing
            if(jumpProgress > 0.8 && !this.isShowingDust)
            {
                this.isShowingDust = true
            }
        }
        else
        {
            // Back to normal size when not jumping
            this.helper.scale.set(1, 1, 1)
            
            // Show dust effect when landing
            if(this.isShowingDust)
            {
                this.dustTime += this.state.time.delta
                
                if(this.dustTime < this.dustDuration)
                {
                    const progress = this.dustTime / this.dustDuration
                    const size = progress * 2
                    const opacity = Math.sin(progress * Math.PI) * 0.5
                    
                    this.dustEffect.scale.set(size, size, size)
                    this.dustMaterial.opacity = opacity
                }
                else
                {
                    this.isShowingDust = false
                    this.dustTime = 0
                    this.dustEffect.scale.set(0, 0, 0)
                    this.dustMaterial.opacity = 0
                }
            }
        }
    }
}
