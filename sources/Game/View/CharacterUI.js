export default class CharacterUI
{
    constructor(player)
    {
        this.player = player
        this.isVisible = false
        this.init()
    }

    init()
    {
        this.createUI()
        this.setupEventListeners()
    }

    createUI()
    {
        // Tạo container chính
        this.container = document.createElement('div')
        this.container.id = 'character-selector'
        this.container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 20px;
            border-radius: 10px;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 14px;
            min-width: 320px;
            max-width: 400px;
            z-index: 1000;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            transition: all 0.3s ease;
            display: none;
        `

        // Tạo tiêu đề
        const title = document.createElement('h3')
        title.textContent = 'Chọn Nhân Vật'
        title.style.cssText = `
            margin: 0 0 15px 0;
            color: #4ecdc4;
            text-align: center;
            font-size: 16px;
            font-weight: bold;
        `
        this.container.appendChild(title)

        // Tạo danh sách nhân vật
        this.characterList = document.createElement('div')
        this.characterList.style.cssText = `
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            max-height: 300px;
            overflow-y: auto;
        `

        // Thêm các nút nhân vật
        const characters = this.player.getAvailableCharacters()
        characters.forEach(character => {
            const button = document.createElement('button')
            button.textContent = character.name
            button.dataset.characterId = character.id
            button.style.cssText = `
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border: none;
                color: white;
                padding: 12px 16px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 13px;
                font-weight: 500;
                transition: all 0.2s ease;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
            `

            // Hover effects
            button.addEventListener('mouseenter', () => {
                button.style.transform = 'translateY(-2px)'
                button.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)'
            })

            button.addEventListener('mouseleave', () => {
                button.style.transform = 'translateY(0)'
                button.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.2)'
            })

            button.addEventListener('click', () => {
                this.selectCharacter(character.id)
            })

            this.characterList.appendChild(button)
        })

        this.container.appendChild(this.characterList)

        // Nút đóng
        const closeButton = document.createElement('button')
        closeButton.textContent = '✕'
        closeButton.style.cssText = `
            position: absolute;
            top: 8px;
            right: 8px;
            background: none;
            border: none;
            color: #999;
            font-size: 18px;
            cursor: pointer;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition: all 0.2s ease;
        `

        closeButton.addEventListener('mouseenter', () => {
            closeButton.style.background = 'rgba(255, 255, 255, 0.1)'
            closeButton.style.color = 'white'
        })

        closeButton.addEventListener('mouseleave', () => {
            closeButton.style.background = 'none'
            closeButton.style.color = '#999'
        })

        closeButton.addEventListener('click', () => {
            this.hide()
        })

        this.container.appendChild(closeButton)

        // Nút mở UI
        this.toggleButton = document.createElement('button')
        this.toggleButton.textContent = '👤'
        this.toggleButton.title = 'Chọn Nhân Vật (phím C)'
        this.toggleButton.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%);
            border: none;
            color: white;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 20px;
            z-index: 999;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
            transition: all 0.3s ease;
        `

        this.toggleButton.addEventListener('mouseenter', () => {
            this.toggleButton.style.transform = 'scale(1.1)'
            this.toggleButton.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.3)'
        })

        this.toggleButton.addEventListener('mouseleave', () => {
            this.toggleButton.style.transform = 'scale(1)'
            this.toggleButton.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.2)'
        })

        this.toggleButton.addEventListener('click', () => {
            this.toggle()
        })

        // Thêm vào DOM
        document.body.appendChild(this.container)
        document.body.appendChild(this.toggleButton)
    }

    setupEventListeners()
    {
        // Phím tắt C để mở/đóng UI
        document.addEventListener('keydown', (event) => {
            if (event.code === 'KeyC' && !event.ctrlKey && !event.altKey && !event.shiftKey) {
                event.preventDefault()
                this.toggle()
            }
        })

        // Đóng UI khi click bên ngoài
        document.addEventListener('click', (event) => {
            if (this.isVisible && 
                !this.container.contains(event.target) && 
                !this.toggleButton.contains(event.target)) {
                this.hide()
            }
        })
    }

    async selectCharacter(characterId)
    {
        try {
            // Show loading
            this.showNotification(`🔄 Đang tải ${this.getCharacterName(characterId)}...`)
            
            const success = await this.player.changeCharacter(characterId)
            
            if (success) {
                console.log(`Đã chuyển sang nhân vật: ${characterId}`)
                
                // Hiệu ứng thông báo
                this.showNotification(`✅ Đã chọn: ${this.getCharacterName(characterId)}`)
                
                // Cập nhật UI để highlight nhân vật được chọn
                this.updateSelection(characterId)
            } else {
                this.showNotification(`❌ Không thể chọn nhân vật: ${this.getCharacterName(characterId)}`)
            }
        } catch (error) {
            console.error('Error changing character:', error)
            this.showNotification(`❌ Lỗi khi tải nhân vật: ${this.getCharacterName(characterId)}`)
        }
    }

    getCharacterName(characterId)
    {
        const characters = this.player.getAvailableCharacters()
        const character = characters.find(c => c.id === characterId)
        return character ? character.name : characterId
    }

    updateSelection(selectedId)
    {
        const buttons = this.characterList.querySelectorAll('button')
        buttons.forEach(button => {
            if (button.dataset.characterId === selectedId) {
                button.style.background = 'linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%)'
                button.style.fontWeight = 'bold'
            } else {
                button.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                button.style.fontWeight = '500'
            }
        })
    }

    showNotification(message)
    {
        // Tạo thông báo tạm thời
        const notification = document.createElement('div')
        notification.textContent = message
        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 16px;
            z-index: 2000;
            animation: slideIn 0.3s ease;
        `

        // Thêm animation CSS
        const style = document.createElement('style')
        style.textContent = `
            @keyframes slideIn {
                from { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
                to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            }
        `
        document.head.appendChild(style)

        document.body.appendChild(notification)

        // Tự động xóa sau 2 giây
        setTimeout(() => {
            notification.remove()
            style.remove()
        }, 2000)
    }

    show()
    {
        this.container.style.display = 'block'
        this.toggleButton.style.display = 'none'
        this.isVisible = true
        
        // Cập nhật selection hiện tại
        const currentType = this.player.characterManager.getCurrentCharacterType()
        this.updateSelection(currentType)
    }

    hide()
    {
        this.container.style.display = 'none'
        this.toggleButton.style.display = 'block'
        this.isVisible = false
    }

    toggle()
    {
        if (this.isVisible) {
            this.hide()
        } else {
            this.show()
        }
    }

    destroy()
    {
        if (this.container) {
            this.container.remove()
        }
        if (this.toggleButton) {
            this.toggleButton.remove()
        }
    }
} 