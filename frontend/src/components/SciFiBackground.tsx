import { useEffect, useRef } from 'react'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  color: string
  alpha: number
}

export function SciFiBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mousePosRef = useRef({ x: 0, y: 0 })
  const particlesRef = useRef<Particle[]>([])
  const animationRef = useRef<number>()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    const initParticles = () => {
      const particles: Particle[] = []
      const particleCount = Math.floor((canvas.width * canvas.height) / 15000)
      const colors = ['#00d4ff', '#00ff88', '#ff00ff', '#ffff00', '#ff6600']
      
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 4,
          vy: (Math.random() - 0.5) * 4,
          radius: Math.random() * 2 + 1,
          color: colors[Math.floor(Math.random() * colors.length)],
          alpha: Math.random() * 0.5 + 0.5,
        })
      }
      particlesRef.current = particles
    }

    initParticles()

    const handleMouseMove = (e: MouseEvent) => {
      mousePosRef.current = { x: e.clientX, y: e.clientY }
    }

    window.addEventListener('mousemove', handleMouseMove)

    const drawGrid = () => {
      ctx.strokeStyle = 'rgba(0, 212, 255, 0.1)'
      ctx.lineWidth = 1
      
      const gridSize = 50
      for (let x = 0; x <= canvas.width; x += gridSize) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, canvas.height)
        ctx.stroke()
      }
      for (let y = 0; y <= canvas.height; y += gridSize) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(canvas.width, y)
        ctx.stroke()
      }
    }

    const animate = () => {
      ctx.fillStyle = 'rgba(10, 14, 39, 0.1)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      drawGrid()

      // 绘制鼠标位置的粒子
      ctx.beginPath()
      ctx.arc(mousePosRef.current.x, mousePosRef.current.y, 4, 0, Math.PI * 2)
      ctx.fillStyle = '#00d4ff'
      ctx.globalAlpha = 1
      ctx.fill()

      particlesRef.current.forEach((particle, i) => {
        particle.x += particle.vx
        particle.y += particle.vy

        if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1
        if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1

        particle.vx *= 0.999
        particle.vy *= 0.999

        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2)
        ctx.fillStyle = particle.color
        ctx.globalAlpha = particle.alpha
        ctx.fill()
        ctx.globalAlpha = 1

        // 粒子之间连线
        particlesRef.current.slice(i + 1).forEach((otherParticle) => {
          const dx2 = particle.x - otherParticle.x
          const dy2 = particle.y - otherParticle.y
          const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2)
          
          if (dist2 < 100) {
            ctx.beginPath()
            ctx.moveTo(particle.x, particle.y)
            ctx.lineTo(otherParticle.x, otherParticle.y)
            const gradient = ctx.createLinearGradient(
              particle.x, particle.y,
              otherParticle.x, otherParticle.y
            )
            gradient.addColorStop(0, particle.color)
            gradient.addColorStop(1, otherParticle.color)
            ctx.strokeStyle = gradient
            ctx.globalAlpha = (1 - dist2 / 100) * 0.3
            ctx.lineWidth = 1
            ctx.stroke()
            ctx.globalAlpha = 1
          }
        })

        // 鼠标粒子与其他粒子连线
        const dxMouse = particle.x - mousePosRef.current.x
        const dyMouse = particle.y - mousePosRef.current.y
        const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse)
        
        if (distMouse < 150) {
          ctx.beginPath()
          ctx.moveTo(particle.x, particle.y)
          ctx.lineTo(mousePosRef.current.x, mousePosRef.current.y)
          const gradient = ctx.createLinearGradient(
            particle.x, particle.y,
            mousePosRef.current.x, mousePosRef.current.y
          )
          gradient.addColorStop(0, particle.color)
          gradient.addColorStop(1, '#00d4ff')
          ctx.strokeStyle = gradient
          ctx.globalAlpha = (1 - distMouse / 150) * 0.5
          ctx.lineWidth = 2
          ctx.stroke()
          ctx.globalAlpha = 1
        }
      })

      const gradient = ctx.createRadialGradient(
        mousePosRef.current.x, mousePosRef.current.y, 0,
        mousePosRef.current.x, mousePosRef.current.y, 150
      )
      gradient.addColorStop(0, 'rgba(0, 212, 255, 0.2)')
      gradient.addColorStop(1, 'rgba(0, 212, 255, 0)')
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(mousePosRef.current.x, mousePosRef.current.y, 150, 0, Math.PI * 2)
      ctx.fill()

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      window.removeEventListener('mousemove', handleMouseMove)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed top-0 left-0 w-full h-full pointer-events-none z-0"
      style={{ background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 50%, #0d1b2a 100%)' }}
    />
  )
}
