import { useRef, useCallback, useEffect } from 'react'
import type { Camera } from '../types'

const MIN_SCALE = 0.05
const MAX_SCALE = 8

export function useInfiniteCanvas(worldRef: React.RefObject<HTMLDivElement | null>) {
  const camera = useRef<Camera>({ x: window.innerWidth / 2, y: window.innerHeight / 2.5, scale: 1 })
  const isPanning = useRef(false)
  const lastPan = useRef({ x: 0, y: 0 })
  const onChangeCbs = useRef<Array<(c: Camera) => void>>([])

  const applyTransform = useCallback(() => {
    if (!worldRef.current) return
    const { x, y, scale } = camera.current
    worldRef.current.style.transform = `translate(${x}px, ${y}px) scale(${scale})`
    onChangeCbs.current.forEach(cb => cb({ ...camera.current }))
  }, [worldRef])

  const onCameraChange = useCallback((cb: (c: Camera) => void) => {
    onChangeCbs.current.push(cb)
    return () => {
      onChangeCbs.current = onChangeCbs.current.filter(f => f !== cb)
    }
  }, [])

  const getCamera = useCallback(() => ({ ...camera.current }), [])

  const setCamera = useCallback((next: Partial<Camera>) => {
    camera.current = { ...camera.current, ...next }
    applyTransform()
  }, [applyTransform])

  const screenToWorld = useCallback((sx: number, sy: number) => {
    const { x, y, scale } = camera.current
    return { x: (sx - x) / scale, y: (sy - y) / scale }
  }, [])

  const worldToScreen = useCallback((wx: number, wy: number) => {
    const { x, y, scale } = camera.current
    return { x: wx * scale + x, y: wy * scale + y }
  }, [])

  const zoomTo = useCallback((scale: number, originX: number, originY: number) => {
    const clamped = Math.min(Math.max(scale, MIN_SCALE), MAX_SCALE)
    const ratio = clamped / camera.current.scale
    camera.current = {
      x: originX - (originX - camera.current.x) * ratio,
      y: originY - (originY - camera.current.y) * ratio,
      scale: clamped,
    }
    applyTransform()
  }, [applyTransform])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    isPanning.current = true
    lastPan.current = { x: e.clientX, y: e.clientY }
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning.current) return
    const dx = e.clientX - lastPan.current.x
    const dy = e.clientY - lastPan.current.y
    lastPan.current = { x: e.clientX, y: e.clientY }
    camera.current.x += dx
    camera.current.y += dy
    applyTransform()
  }, [applyTransform])

  const handleMouseUp = useCallback(() => {
    isPanning.current = false
  }, [])

  useEffect(() => {
    const el = worldRef.current?.parentElement
    if (!el) return

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const ox = e.clientX - rect.left
      const oy = e.clientY - rect.top
      const factor = e.ctrlKey ? 0.01 : 0.001
      const delta = -e.deltaY * factor
      const next = camera.current.scale * (1 + delta)
      zoomTo(next, ox, oy)
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [worldRef, zoomTo])

  useEffect(() => {
    applyTransform()
  }, [applyTransform])

  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    screenToWorld,
    worldToScreen,
    getCamera,
    setCamera,
    onCameraChange,
    zoomTo,
    isPanning,
  }
}
