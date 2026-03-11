import { useEffect, useRef } from 'react'

export default function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)

  // Skip rendering entirely on touch devices
  const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)

  useEffect(() => {
    if (isTouchDevice) return

    const dot = dotRef.current
    const ring = ringRef.current
    if (!dot || !ring) return

    let mx = 0, my = 0
    let rx = 0, ry = 0
    let isHovering = false

    const move = (e: MouseEvent) => {
      mx = e.clientX
      my = e.clientY
    }

    // Use event delegation instead of attaching listeners to every element
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      if (!target) return
      const interactive = target.closest('a, button, input, textarea, select, [role="button"], [data-cursor-grow]')
      isHovering = !!interactive
    }

    // Animation loop — ring trails behind dot smoothly
    let raf: number
    const animate = () => {
      rx += (mx - rx) * 0.15
      ry += (my - ry) * 0.15

      dot.style.transform = `translate(${mx - 4}px, ${my - 4}px) scale(${isHovering ? 1.5 : 1})`
      dot.style.backgroundColor = isHovering ? 'rgb(124, 131, 249)' : '#fff'
      ring.style.transform = `translate(${rx - 20}px, ${ry - 20}px) scale(${isHovering ? 1.8 : 1})`
      ring.style.opacity = isHovering ? '0.5' : '0.3'
      ring.style.borderColor = isHovering ? 'rgb(124, 131, 249)' : 'rgba(148, 163, 184, 0.5)'

      raf = requestAnimationFrame(animate)
    }

    document.addEventListener('mousemove', move)
    document.addEventListener('mouseover', handleMouseOver)
    raf = requestAnimationFrame(animate)
    document.body.style.cursor = 'none'

    return () => {
      document.removeEventListener('mousemove', move)
      document.removeEventListener('mouseover', handleMouseOver)
      cancelAnimationFrame(raf)
      document.body.style.cursor = ''
    }
  }, [isTouchDevice])

  if (isTouchDevice) return null

  return (
    <>
      {/* Small dot — follows exactly */}
      <div
        ref={dotRef}
        className="fixed top-0 left-0 pointer-events-none z-[9999] w-2 h-2 rounded-full bg-white mix-blend-difference transition-transform duration-75"
      />
      {/* Outer ring — trails behind smoothly */}
      <div
        ref={ringRef}
        className="fixed top-0 left-0 pointer-events-none z-[9998] w-10 h-10 rounded-full border border-slate-400/50 transition-[border-color,opacity] duration-300"
      />
    </>
  )
}
