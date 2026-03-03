import { useEffect, useRef } from 'react'
import * as THREE from 'three'

const previewImages = import.meta.glob('/public/pages/*.{png,jpg,jpeg,webp,gif,avif,svg}', {
  eager: true,
  import: 'default',
})

const getBaseName = (path) => {
  const fileName = path.split('/').pop() || ''
  return fileName.replace(/\.[^/.]+$/, '')
}

const toTitle = (name) =>
  name
    .replace(/PagePreview$/i, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .trim() || 'Untitled'

const toRoute = (name) => {
  const normalized = name.toLowerCase()
  if (normalized.includes('home')) return '/home'
  if (normalized.includes('imposter')) return '/imposter'
  if (normalized.includes('tmep') || normalized.includes('bow')) return '/bow'

  const slug = name
    .replace(/PagePreview$/i, '')
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()

  return `/${slug}`
}

const pages = Object.entries(previewImages)
  .map(([path, image]) => {
    const name = getBaseName(path)
    return {
      image,
      name,
      title: toTitle(name),
      route: toRoute(name),
    }
  })
  .filter((page) => !page.name.startsWith('._'))
  .sort((a, b) => a.title.localeCompare(b.title))

function PageGallery({ onNavigate }) {
  const mountRef = useRef(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x000000)
    scene.fog = new THREE.Fog(0x000000, 14, 40)

    const camera = new THREE.PerspectiveCamera(
      50,
      mount.clientWidth / mount.clientHeight,
      0.1,
      100
    )
    camera.position.set(0, 0, 7.6)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    mount.appendChild(renderer.domElement)

    const ambient = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambient)

    const keyLight = new THREE.DirectionalLight(0xffffff, 0.9)
    keyLight.position.set(5, 8, 10)
    scene.add(keyLight)

    const rimLight = new THREE.DirectionalLight(0x5d9fff, 0.35)
    rimLight.position.set(-8, 4, -4)
    scene.add(rimLight)

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(180, 180),
      new THREE.MeshStandardMaterial({
        color: 0x060606,
        roughness: 1,
        metalness: 0,
      })
    )
    floor.rotation.x = -Math.PI / 2
    floor.position.y = -3.25
    scene.add(floor)

    const shelfMaterial = new THREE.MeshStandardMaterial({
      color: 0x0f0f0f,
      roughness: 0.7,
      metalness: 0.45,
    })
    const shelfEdgeMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.35,
      metalness: 0.7,
    })

    const interactivePanels = []
    const textures = []
    const rack = new THREE.Group()
    rack.position.z = 1.6
    scene.add(rack)

    const itemCount = pages.length || 1
    const columns = Math.max(1, Math.min(5, Math.ceil(Math.sqrt(itemCount))))
    const rows = Math.ceil(itemCount / columns)
    const wallW = 2.65
    const wallH = 1.55
    const wallZ = -0.6
    const shelfOuterW = wallW + 0.26
    const shelfOuterH = wallH + 0.45
    const cellW = shelfOuterW
    const cellH = shelfOuterH

    const totalW = (columns - 1) * cellW
    const totalH = (rows - 1) * cellH

    const loader = new THREE.TextureLoader()
    pages.forEach((page, index) => {
      const col = index % columns
      const row = Math.floor(index / columns)

      const x = col * cellW - totalW / 2
      const y = totalH / 2 - row * cellH

      const slot = new THREE.Group()
      slot.position.set(x, y, 0)
      rack.add(slot)

      const backPanel = new THREE.Mesh(
        new THREE.PlaneGeometry(wallW, wallH),
        new THREE.MeshBasicMaterial({
          color: 0xffffff,
          toneMapped: false,
        })
      )
      backPanel.position.set(0, 0, wallZ)
      backPanel.userData.route = page.route
      backPanel.userData.baseScale = 1
      slot.add(backPanel)
      interactivePanels.push(backPanel)

      loader.load(page.image, (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy()
        texture.generateMipmaps = true
        backPanel.material.map = texture
        backPanel.material.needsUpdate = true
        textures.push(texture)
      })

      const topShelf = new THREE.Mesh(
        new THREE.BoxGeometry(shelfOuterW, 0.1, 1.2),
        shelfMaterial
      )
      topShelf.position.set(0, wallH / 2 + 0.17, wallZ + 0.12)
      slot.add(topShelf)

      const bottomShelf = new THREE.Mesh(
        new THREE.BoxGeometry(shelfOuterW, 0.1, 1.2),
        shelfMaterial
      )
      bottomShelf.position.set(0, -wallH / 2 - 0.17, wallZ + 0.12)
      slot.add(bottomShelf)

      const leftWall = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, shelfOuterH, 1.2),
        shelfEdgeMaterial
      )
      leftWall.position.set(-wallW / 2 - 0.08, 0, wallZ + 0.12)
      slot.add(leftWall)

      const rightWall = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, shelfOuterH, 1.2),
        shelfEdgeMaterial
      )
      rightWall.position.set(wallW / 2 + 0.08, 0, wallZ + 0.12)
      slot.add(rightWall)
    })

    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    let hovered = null

    const updatePointer = (event) => {
      const rect = renderer.domElement.getBoundingClientRect()
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    }

    const handlePointerMove = (event) => {
      updatePointer(event)
      raycaster.setFromCamera(pointer, camera)
      const hit = raycaster.intersectObjects(interactivePanels)[0]?.object || null
      hovered = hit
      mount.style.cursor = hovered ? 'pointer' : 'default'
    }

    const handleClick = (event) => {
      updatePointer(event)
      raycaster.setFromCamera(pointer, camera)
      const hit = raycaster.intersectObjects(interactivePanels)[0]
      if (!hit?.object?.userData?.route) return
      onNavigate?.(hit.object.userData.route)
    }

    const handleResize = () => {
      if (!mount) return
      camera.aspect = mount.clientWidth / mount.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(mount.clientWidth, mount.clientHeight)
    }

    window.addEventListener('resize', handleResize)
    renderer.domElement.addEventListener('pointermove', handlePointerMove)
    renderer.domElement.addEventListener('click', handleClick)

    const clock = new THREE.Clock()
    let frameId = 0
    const animate = () => {
      frameId = requestAnimationFrame(animate)
      const t = clock.getElapsedTime()

      rack.rotation.y = Math.sin(t * 0.22) * 0.04
      camera.position.x = Math.sin(t * 0.24) * 0.28
      camera.lookAt(0, 0, 0.2)

      interactivePanels.forEach((panel) => {
        const targetScale = hovered === panel ? 1.045 : 1
        panel.scale.x = THREE.MathUtils.lerp(panel.scale.x, targetScale, 0.16)
        panel.scale.y = THREE.MathUtils.lerp(panel.scale.y, targetScale, 0.16)
      })

      renderer.render(scene, camera)
    }

    animate()

    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener('resize', handleResize)
      renderer.domElement.removeEventListener('pointermove', handlePointerMove)
      renderer.domElement.removeEventListener('click', handleClick)

      textures.forEach((texture) => texture.dispose())
      scene.traverse((object) => {
        if (!object.isMesh) return
        object.geometry?.dispose()
        if (Array.isArray(object.material)) {
          object.material.forEach((material) => material.dispose())
          return
        }
        object.material?.dispose()
      })

      renderer.dispose()
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement)
      }
      mount.style.cursor = 'default'
    }
  }, [onNavigate])

  return (
    <main
      ref={mountRef}
      style={{
        width: '100%',
        height: '100vh',
        background: '#000',
        overflow: 'hidden',
      }}
    />
  )
}

export default PageGallery
