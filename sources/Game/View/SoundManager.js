import * as THREE from 'three'
import * as dat from 'lil-gui'

import Game from '@/Game.js'
import View from '@/View/View.js'
import State from '@/State/State.js'
import Debug from '@/Debug/Debug.js'

export default class SoundManager
{
    static instance

    static getInstance()
    {
        return SoundManager.instance
    }

    constructor()
    {
        if(SoundManager.instance)
            return SoundManager.instance

        SoundManager.instance = this

        this.game = Game.getInstance()
        this.view = View.getInstance()
        this.state = State.getInstance()
        this.debug = Debug.getInstance()

        // Thiết lập âm thanh
        this.masterVolume = 0.5
        this.isMuted = false
        this.soundsEnabled = true

        this.sounds = {}
        this.listener = new THREE.AudioListener()
        this.audioLoader = new THREE.AudioLoader()

        // Thêm listener vào camera
        this.view.camera.instance.add(this.listener)

        // Tải âm thanh
        this.loadSounds()

        // Kết nối sự kiện nhảy
        this.state.player.controls.events.on('jumpDown', () => {
            this.playSound('jump')
        })

        // Thêm sự kiện phím tắt
        window.addEventListener('keydown', (event) => {
            // Phím M để tắt/bật âm thanh
            if (event.code === 'KeyM') {
                this.toggleMute()
            }
        })

        // Thêm debug controls
        this.setDebug()
    }

    loadSounds()
    {
        // Âm thanh nhảy
        this.createSound('jump', '/sounds/jump.mp3', { volume: 0.4 })
        
        // Âm thanh hạ cánh
        this.createSound('land', '/sounds/land.mp3', { volume: 0.5 })
    }

    createSound(name, path, options = {})
    {
        const sound = new THREE.Audio(this.listener)
        
        this.sounds[name] = {
            sound: sound,
            loaded: false,
            path: path,
            options: Object.assign({
                volume: 0.5,
                loop: false
            }, options)
        }
        
        // Tải âm thanh
        this.audioLoader.load(
            path,
            (buffer) => {
                sound.setBuffer(buffer)
                sound.setVolume(this.sounds[name].options.volume * this.masterVolume)
                sound.setLoop(this.sounds[name].options.loop)
                this.sounds[name].loaded = true
                
                // Nếu âm thanh cần tự động phát
                if(this.sounds[name].options.autoplay && this.soundsEnabled && !this.isMuted) {
                    sound.play()
                }
            },
            (xhr) => {
                // console.log((xhr.loaded / xhr.total * 100) + '% loaded')
            },
            (error) => {
                console.error('Không thể tải file âm thanh:', error)
            }
        )
        
        return sound
    }

    setDebug()
    {
        if(!this.debug.active)
            return
            
        const soundFolder = this.debug.ui.getFolder('audio')
        
        soundFolder.add(this, 'masterVolume', 0, 1, 0.01)
            .name('Âm lượng chính')
            .onChange(() => {
                this.updateAllVolumes()
            })
            
        soundFolder.add(this, 'isMuted')
            .name('Tắt âm')
            .onChange((value) => {
                if(value) {
                    this.muteAll()
                } else {
                    this.unmuteAll()
                }
            })
            
        soundFolder.add(this, 'soundsEnabled')
            .name('Bật âm thanh')
            
        // Tạo folder cho từng loại âm thanh
        const jumpFolder = soundFolder.addFolder('Âm thanh nhảy')
        if(this.sounds.jump) {
            jumpFolder.add(this.sounds.jump.options, 'volume', 0, 1, 0.01)
                .name('Âm lượng nhảy')
                .onChange(() => {
                    if(this.sounds.jump.loaded) {
                        this.sounds.jump.sound.setVolume(
                            this.sounds.jump.options.volume * this.masterVolume
                        )
                    }
                })
        }
        
        const landFolder = soundFolder.addFolder('Âm thanh hạ cánh')
        if(this.sounds.land) {
            landFolder.add(this.sounds.land.options, 'volume', 0, 1, 0.01)
                .name('Âm lượng hạ cánh')
                .onChange(() => {
                    if(this.sounds.land.loaded) {
                        this.sounds.land.sound.setVolume(
                            this.sounds.land.options.volume * this.masterVolume
                        )
                    }
                })
        }
    }

    updateAllVolumes()
    {
        for(const [name, soundObj] of Object.entries(this.sounds)) {
            if(soundObj.loaded) {
                soundObj.sound.setVolume(
                    soundObj.options.volume * this.masterVolume
                )
            }
        }
    }

    toggleMute()
    {
        this.isMuted = !this.isMuted
        
        if(this.isMuted) {
            this.muteAll()
            console.log('Âm thanh đã tắt. Nhấn M để bật lại.')
        } else {
            this.unmuteAll()
            console.log('Âm thanh đã bật. Nhấn M để tắt.')
        }
    }

    muteAll()
    {
        for(const [name, soundObj] of Object.entries(this.sounds)) {
            if(soundObj.loaded && soundObj.sound.isPlaying) {
                soundObj.sound.setVolume(0)
            }
        }
    }

    unmuteAll()
    {
        for(const [name, soundObj] of Object.entries(this.sounds)) {
            if(soundObj.loaded) {
                soundObj.sound.setVolume(
                    soundObj.options.volume * this.masterVolume
                )
            }
        }
    }

    playSound(name)
    {
        if(!this.soundsEnabled || this.isMuted) {
            return
        }
        
        const soundObj = this.sounds[name]
        
        if(!soundObj) {
            console.warn(`Âm thanh '${name}' không tồn tại`)
            return
        }
        
        if(!soundObj.loaded) {
            console.warn(`Âm thanh '${name}' chưa được tải xong`)
            return
        }
        
        // Phát âm thanh
        if(soundObj.sound.isPlaying) {
            soundObj.sound.stop()
        }
        
        soundObj.sound.setVolume(soundObj.options.volume * this.masterVolume)
        soundObj.sound.play()
    }

    stopSound(name)
    {
        const soundObj = this.sounds[name]
        
        if(!soundObj || !soundObj.loaded) {
            return
        }
        
        if(soundObj.sound.isPlaying) {
            soundObj.sound.stop()
        }
    }

    update()
    {
        // Có thể thêm logic cập nhật âm thanh 3D theo vị trí nhân vật
    }
} 