import { useEffect, useRef } from 'react'

export default function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Don't show on touch devices
    if ('ontouchstart' in window) return

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

    const addHover = () => { isHovering = true }
    const removeHover = () => { isHovering = false }

    // Track interactive element hover
    const attachHoverListeners = () => {
      const targets = document.querySelectorAll('a, button, input, textarea, select, [role="button"], [data-cursor-grow]')
      targets.forEach(el => {
        el.addEventListener('mouseenter', addHover)
        el.addEventListener('mouseleave', removeHover)
      })
      return targets
    }

    let targets = attachHoverListeners()

    // Re-attach on DOM changes (for lazy-loaded pages)
    const observer = new MutationObserver(() => {
      targets.forEach(el => {
        el.removeEventListener('mouseenter', addHover)
        el.removeEventListener('mouseleave', removeHover)
      })
      targets = attachHoverListeners()
    })
    observer.observe(document.body, { childList: true, subtree: true })

    // Animation loop — ring trails behind dot smoothly
    let raf: number
    const animate = () => {
      rx += (mx - rx) * 0.15
      ry += (my - ry) * 0.15

      dot.style.transform = `translate(${mx - 4}px, ${my - 4}px)`
      ring.style.transform = `translate(${rx - 20}px, ${ry - 20}px) scale(${isHovering ? 1.8 : 1})`
      ring.style.opacity = isHovering ? '0.5' : '0.3'
      ring.style.borderColor = isHovering ? 'rgb(124, 131, 249)' : 'rgba(148, 163, 184, 0.5)'
      dot.style.backgroundColor = isHovering ? 'rgb(124, 131, 249)' : '#fff'
      dot.style.transform = `translate(${mx - 4}px, ${my - 4}px) scale(${isHovering ? 1.5 : 1})`

      raf = requestAnimationFrame(animate)
    }

    document.addEventListener('mousemove', move)
    raf = requestAnimationFrame(animate)
    document.body.style.cursor = 'none'

    return () => {
      document.removeEventListener('mousemove', move)
      cancelAnimationFrame(raf)
      observer.disconnect()
      document.body.style.cursor = ''
      targets.forEach(el => {
        el.removeEventListener('mouseenter', addHover)
        el.removeEventListener('mouseleave', removeHover)
      })
    }
  }, [])

  // Hide on touch devices
  if (typeof window !== 'undefined' && 'ontouchstart' in window) return null

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
