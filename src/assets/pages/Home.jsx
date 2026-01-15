import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import Navbar from './Navbar.jsx'

const SKY_TOP = '#2A8AC4'
const SKY_BOTTOM = '#D6C5E7'
const GROUND_WIDTH = 200
const GROUND_DEPTH = 30

// ----- FAST TERRAIN NOISE (value noise + fbm) -----
const smoothstep = (t) => t * t * (3 - 2 * t)
const hash2 = (x, z) => {
  const n = Math.sin(x * 127.1 + z * 311.7) * 43758.5453123
  return n - Math.floor(n)
}
const valueNoise2D = (x, z) => {
  const xi = Math.floor(x)
  const zi = Math.floor(z)
  const xf = x - xi
  const zf = z - zi

  const r00 = hash2(xi, zi)
  const r10 = hash2(xi + 1, zi)
  const r01 = hash2(xi, zi + 1)
  const r11 = hash2(xi + 1, zi + 1)

  const u = smoothstep(xf)
  const v = smoothstep(zf)

  const x1 = THREE.MathUtils.lerp(r00, r10, u)
  const x2 = THREE.MathUtils.lerp(r01, r11, u)
  return THREE.MathUtils.lerp(x1, x2, v)
}
const fbm2D = (x, z, octaves = 5) => {
  let v = 0
  let amp = 0.6
  let freq = 1
  for (let i = 0; i < octaves; i++) {
    v += valueNoise2D(x * freq, z * freq) * amp
    freq *= 2
    amp *= 0.5
  }
  return THREE.MathUtils.clamp(v, 0, 1)
}

const CANVAS_ITEMS = [
  
  {
    title: 'SLT Venture',
    body: 'Drop your copy, links, or sections here.',
  },
  {
    title: 'Oracle',
    body: 'Drop your copy, links, or sections here.',
  },
  {
    title: 'Home Card',
    body: 'Drop your copy, links, or sections here.',
    image: '/sprites/NameCard4.png',
    imageMobile: '/sprites/NameCardMobile2.png',
    imageScale: 1.06,
    transparent: true,
  },
  {
    title: 'Bow Sight',
    body: 'Drop your copy, links, or sections here.',
  },
  {
    title: 'NAS Storage',
    body: 'Drop your copy, links, or sections here.',
  },
  {
    title: 'All-purpose Server ',
    body: 'Drop your copy, links, or sections here.',
  },
]
const DEFAULT_CANVAS_INDEX = 2

function Home() {
  const mountRef = useRef(null)
  const cursorRef = useRef(null)
  const [activeCanvas, setActiveCanvas] = useState(DEFAULT_CANVAS_INDEX)
  const scrollLockRef = useRef(0)
  const infoPanelStyle = {
    position: 'fixed',
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    width: 'min(980px, calc(100vw - 120px))',
    minHeight: 'min(520px, 78vh)',
    maxHeight: 'calc(100vh - 32px)',
    padding: 'clamp(36px, 7vw, 56px)',
    background: 'rgba(16, 20, 30, 0.72)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '28px',
    boxShadow: '0 24px 60px rgba(0, 0, 0, 0.4)',
    color: 'rgba(255, 255, 255, 0.92)',
    zIndex: 900,
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    overflow: 'auto',
  }
  const infoPanelMotionStyle = {
    transition: 'transform 600ms ease',
    willChange: 'transform',
  }
  const getCanvasTransform = (delta) => {
    if (delta === 0) return 'translate(-50%, -50%) scale(1)'

    const scale = 'scale(1.08)'
    if (delta > 0) {
      const offset = -260 - (delta - 1) * 180
      return `translate(-50%, ${offset}%) ${scale}`
    }

    const offset = 120 + (Math.abs(delta) - 1) * 180
    return `translate(-50%, ${offset}%) ${scale}`
  }
  const getCanvasStyle = (index) => {
    const delta = index - activeCanvas
    const item = CANVAS_ITEMS[index]
    return {
      ...infoPanelStyle,
      ...infoPanelMotionStyle,
      transform: getCanvasTransform(delta),
      pointerEvents: delta === 0 ? 'auto' : 'none',
      zIndex: 900 - Math.min(Math.abs(delta), 5),
      background: item?.transparent ? 'transparent' : infoPanelStyle.background,
      border: item?.transparent ? 'none' : infoPanelStyle.border,
      boxShadow: item?.transparent ? 'none' : infoPanelStyle.boxShadow,
      backdropFilter: item?.transparent ? 'none' : infoPanelStyle.backdropFilter,
      WebkitBackdropFilter: item?.transparent
        ? 'none'
        : infoPanelStyle.WebkitBackdropFilter,
    }
  }

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const scene = new THREE.Scene()
    scene.fog = new THREE.Fog(0xd6c5e7, 10, 55) // helps depth/readability

    const camera = new THREE.PerspectiveCamera(
      30,
      mount.clientWidth / mount.clientHeight,
      0.1,
      200
    )
    camera.position.set(0, 3.6, 6.4)
    const baseCameraPos = camera.position.clone()
    const baseLookAt = new THREE.Vector3(0, 1.2, -18)
    camera.lookAt(baseLookAt)
    const mouseOffset = { current: 0, target: 0 }
    const mouseOffsetY = { current: 0, target: 0 }

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    renderer.outputColorSpace = THREE.SRGBColorSpace

    // ✅ shading helpers
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap

    mount.appendChild(renderer.domElement)

    const renderTarget = new THREE.WebGLRenderTarget(
      mount.clientWidth,
      mount.clientHeight
    )

    const postScene = new THREE.Scene()
    const postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    const postMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: renderTarget.texture },
        uCurve: { value: 0.7 },
        uVignette: { value: 0.2 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float uCurve;
        uniform float uVignette;
        varying vec2 vUv;

        void main() {
          vec2 centered = vUv - 0.5;
          float curve = max(0.001, uCurve);
          float angle = centered.x * curve * 3.1415926;
          float sinHalf = sin(curve * 3.1415926 * 0.5);
          float warpedX = (sin(angle) / max(0.001, sinHalf)) * 0.5 + 0.5;
          vec2 uvWarped = vec2(warpedX, vUv.y);
          vec4 color = texture2D(tDiffuse, clamp(uvWarped, 0.0, 1.0));

          float edge =
            smoothstep(0.0, 0.02, uvWarped.x) *
            smoothstep(1.0, 0.98, uvWarped.x) *
            smoothstep(0.0, 0.02, uvWarped.y) *
            smoothstep(1.0, 0.98, uvWarped.y);
          float vignette = smoothstep(0.9, 0.2, length(centered));
          color.rgb *= mix(1.0 - uVignette, 1.0, vignette) * edge;

          gl_FragColor = color;
        }
      `,
    })
    const postQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMaterial)
    postScene.add(postQuad)

    // --- SKY ---
    const skyCanvas = document.createElement('canvas')
    skyCanvas.width = 2
    skyCanvas.height = 2
    const skyCtx = skyCanvas.getContext('2d')
    if (skyCtx) {
      const g = skyCtx.createLinearGradient(0, 0, 0, 2)
      g.addColorStop(0, SKY_TOP)
      g.addColorStop(1, SKY_BOTTOM)
      skyCtx.fillStyle = g
      skyCtx.fillRect(0, 0, 2, 2)
    }
    const skyTexture = new THREE.CanvasTexture(skyCanvas)
    skyTexture.colorSpace = THREE.SRGBColorSpace
    scene.background = skyTexture

    // --- LIGHTS (stronger directional for shadows + shape) ---
    const hemi = new THREE.HemisphereLight(0x9ac6ff, 0xd9e6ff, 0.55)
    scene.add(hemi)

    const sun = new THREE.DirectionalLight(0xfff0cf, 1.35)
    sun.position.set(10, 14, 8)
    sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048)
    sun.shadow.camera.near = 1
    sun.shadow.camera.far = 60
    sun.shadow.camera.left = -35
    sun.shadow.camera.right = 35
    sun.shadow.camera.top = 35
    sun.shadow.camera.bottom = -35
    sun.shadow.bias = -0.0005
    scene.add(sun)

    const fill = new THREE.DirectionalLight(0xa9c9ff, 0.35)
    fill.position.set(-8, 6, -6)
    scene.add(fill)

    // --- TERRAIN (actual geometry displacement + vertex-color shading) ---
    const SEG_X = 220 // more segments => more visible silhouette changes
    const SEG_Z = 90

    const terrainGeo = new THREE.PlaneGeometry(
      GROUND_WIDTH,
      GROUND_DEPTH,
      SEG_X,
      SEG_Z
    )
    terrainGeo.rotateX(-Math.PI / 2)

    const baseZ = camera.position.z - GROUND_DEPTH / 2
    const pos = terrainGeo.attributes.position

    // Terrain tuning (make it obviously NOT flat)
    const HEIGHT = 2.2        // <-- increase for visible hills
    const NOISE_SCALE = 0.06  // <-- lower = bigger hills
    const FLAT_NEAR = 0.15    // keep slightly flatter near camera
    const colorAttr = new THREE.BufferAttribute(
      new Float32Array(pos.count * 3),
      3
    )

    let minH = Infinity
    let maxH = -Infinity

    const sampleHeight = (worldX, worldZ) => {
      const n = fbm2D(worldX * NOISE_SCALE, worldZ * NOISE_SCALE, 5)
      let h = (n - 0.5) * 2.0 * HEIGHT
      const distToCam = Math.abs(worldZ - camera.position.z)
      const t = THREE.MathUtils.clamp(distToCam / (GROUND_DEPTH * 0.8), 0, 1)
      const ease = THREE.MathUtils.lerp(FLAT_NEAR, 1.0, t)
      return h * ease
    }

    // First pass: displace + track min/max height
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const y = pos.getY(i)
      const z = pos.getZ(i)

      const worldX = x
      const worldZ = z + baseZ

      const h = sampleHeight(worldX, worldZ)

      pos.setXYZ(i, x, y + h, z)
      if (h < minH) minH = h
      if (h > maxH) maxH = h
    }

    pos.needsUpdate = true
    terrainGeo.computeVertexNormals()

    // Second pass: vertex colors based on height (gives "shading" even with flat lighting)
    const low = new THREE.Color('#1f7f52')  // darker green
    const mid = new THREE.Color('#2aa865')  // base green
    const high = new THREE.Color('#6fcf7f') // lighter grassy tops

    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i) // displaced height
      const t = THREE.MathUtils.clamp((y - minH) / (maxH - minH + 1e-6), 0, 1)

      // blend low->mid->high
      const c = new THREE.Color()
      if (t < 0.55) {
        c.copy(low).lerp(mid, t / 0.55)
      } else {
        c.copy(mid).lerp(high, (t - 0.55) / 0.45)
      }

      colorAttr.setXYZ(i, c.r, c.g, c.b)
    }

    terrainGeo.setAttribute('color', colorAttr)

    const terrainMat = new THREE.MeshStandardMaterial({
      vertexColors: true,     // ✅ uses our height-based colors
      roughness: 0.95,
      metalness: 0.0,
    })

    const terrain = new THREE.Mesh(terrainGeo, terrainMat)
    terrain.position.z = baseZ
    terrain.receiveShadow = true
    terrain.castShadow = false
    scene.add(terrain)

    // --- GRASS SPRITE ---
    const grassTexture = new THREE.TextureLoader().load('/sprites/grass1.png')
    grassTexture.colorSpace = THREE.SRGBColorSpace

    const grassTextureFlipped = grassTexture.clone()
    grassTextureFlipped.wrapS = THREE.RepeatWrapping
    grassTextureFlipped.repeat.x = -1
    grassTextureFlipped.offset.x = 1
    grassTextureFlipped.needsUpdate = true

    const grassMaterial = new THREE.SpriteMaterial({
      map: grassTexture,
      transparent: true,
      depthWrite: false,
    })
    const grassFlippedMaterial = new THREE.SpriteMaterial({
      map: grassTextureFlipped,
      transparent: true,
      depthWrite: false,
    })
    const grass = new THREE.Sprite(grassMaterial)

    const grassX = 0
    const grassZ = -5.2
    const grassY = sampleHeight(grassX, grassZ)
    grass.position.set(grassX, grassY + 0.35, grassZ)
    grass.scale.set(1, 1, 1)
    grass.renderOrder = 2
    scene.add(grass)

    const grassLeft = new THREE.Sprite(grassFlippedMaterial)
    const grassLeftX = grassX - 2.8
    const grassLeftZ = grassZ
    const grassLeftY = sampleHeight(grassLeftX, grassLeftZ)
    grassLeft.position.set(grassLeftX, grassLeftY + 0.35, grassLeftZ)
    grassLeft.scale.set(1, 1, 1)
    grassLeft.renderOrder = 2
    scene.add(grassLeft)

    const grassRight = new THREE.Sprite(grassMaterial)
    const grassRightX = grassX + 2.8
    const grassRightZ = grassZ
    const grassRightY = sampleHeight(grassRightX, grassRightZ)
    grassRight.position.set(grassRightX, grassRightY + 0.35, grassRightZ)
    grassRight.scale.set(1, 1, 1)
    grassRight.renderOrder = 2
    scene.add(grassRight)

    const grassBack = new THREE.Sprite(grassMaterial)
    const grassBackX = grassX - 1.4
    const grassBackZ = grassZ - 4.0
    const grassBackY = sampleHeight(grassBackX, grassBackZ)
    grassBack.position.set(grassBackX, grassBackY + 0.35, grassBackZ)
    grassBack.scale.set(1, 1, 1)
    grassBack.renderOrder = 2
    scene.add(grassBack)

    const grassBackRight = new THREE.Sprite(grassFlippedMaterial)
    const grassBackRightX = grassX + 1.9
    const grassBackRightZ = grassZ - 3.4
    const grassBackRightY = sampleHeight(grassBackRightX, grassBackRightZ)
    grassBackRight.position.set(
      grassBackRightX,
      grassBackRightY + 0.35,
      grassBackRightZ
    )
    grassBackRight.scale.set(1, 1, 1)
    grassBackRight.renderOrder = 2
    scene.add(grassBackRight)

    const grassBaseScales = {
      grass: new THREE.Vector2(1, 1),
      grassLeft: new THREE.Vector2(1, 1),
      grassRight: new THREE.Vector2(1, 1),
      grassBack: new THREE.Vector2(1, 1),
      grassBackRight: new THREE.Vector2(1, 1),
    }

    const updateGrassScale = () => {
      const image = grassTexture.image
      if (!image) return
      const { width, height } = image
      const aspect = width / height
      const targetHeight = 0.3
      const widthScaled = targetHeight * aspect
      grass.scale.set(widthScaled, targetHeight, 1)
      grassLeft.scale.set(widthScaled, targetHeight, 1)
      grassRight.scale.set(widthScaled, targetHeight, 1)
      grassBack.scale.set(widthScaled, targetHeight, 1)
      grassBackRight.scale.set(widthScaled, targetHeight, 1)
      grassBaseScales.grass.set(widthScaled, targetHeight)
      grassBaseScales.grassLeft.set(widthScaled, targetHeight)
      grassBaseScales.grassRight.set(widthScaled, targetHeight)
      grassBaseScales.grassBack.set(widthScaled, targetHeight)
      grassBaseScales.grassBackRight.set(widthScaled, targetHeight)
    }

    if (grassTexture.image) {
      updateGrassScale()
    } else {
      grassTexture.onUpdate = updateGrassScale
    }

    // --- BUSH SPRITE ---
    const bushTexture = new THREE.TextureLoader().load('/sprites/bush1-1.png')
    bushTexture.colorSpace = THREE.SRGBColorSpace

    const bush2Texture = new THREE.TextureLoader().load('/sprites/bush2-1.png')
    bush2Texture.colorSpace = THREE.SRGBColorSpace

    const bushMaterial = new THREE.SpriteMaterial({
      map: bushTexture,
      transparent: true,
      depthWrite: false,
    })
    const bush2Material = new THREE.SpriteMaterial({
      map: bush2Texture,
      transparent: true,
      depthWrite: false,
    })

    const bush = new THREE.Sprite(bushMaterial)
    const bushX = 0
    const bushZ = grassZ - 8.0
    const bushY = sampleHeight(bushX, bushZ)
    bush.position.set(bushX, bushY + 0.35, bushZ)
    bush.scale.set(1, 1, 1)
    bush.renderOrder = 2
    scene.add(bush)

    const bushBackLeft = new THREE.Sprite(bush2Material)
    const bushBackLeftX = bushX - 0.8
    const bushBackLeftZ = bushZ + 0.8
    const bushBackLeftY = sampleHeight(bushBackLeftX, bushBackLeftZ)
    bushBackLeft.position.set(
      bushBackLeftX,
      bushBackLeftY + 0.35,
      bushBackLeftZ
    )
    bushBackLeft.scale.set(1, 1, 1)
    bushBackLeft.renderOrder = 2
    scene.add(bushBackLeft)

    const bushLeft = new THREE.Sprite(bushMaterial)
    const bushLeftX = bushX - 6.0
    const bushLeftZ = bushZ + 3.4
    const bushLeftY = sampleHeight(bushLeftX, bushLeftZ)
    bushLeft.position.set(bushLeftX, bushLeftY + 0.35, bushLeftZ)
    bushLeft.scale.set(1, 1, 1)
    bushLeft.renderOrder = 2
    scene.add(bushLeft)

    const bushLeftNear1 = new THREE.Sprite(bushMaterial)
    const bushLeftNear1X = bushLeftX + 0.2
    const bushLeftNear1Z = bushLeftZ + 2.4
    const bushLeftNear1Y = sampleHeight(bushLeftNear1X, bushLeftNear1Z)
    bushLeftNear1.position.set(
      bushLeftNear1X,
      bushLeftNear1Y + 0.35,
      bushLeftNear1Z
    )
    bushLeftNear1.scale.set(1, 1, 1)
    bushLeftNear1.renderOrder = 2
    scene.add(bushLeftNear1)

    const bushLeftNear2 = new THREE.Sprite(bush2Material)
    const bushLeftNear2X = bushLeftX + 1.1
    const bushLeftNear2Z = bushLeftZ - 0.2
    const bushLeftNear2Y = sampleHeight(bushLeftNear2X, bushLeftNear2Z)
    bushLeftNear2.position.set(
      bushLeftNear2X,
      bushLeftNear2Y + 0.35,
      bushLeftNear2Z
    )
    bushLeftNear2.scale.set(1, 1, 1)
    bushLeftNear2.renderOrder = 2
    scene.add(bushLeftNear2)

    const bushRight = new THREE.Sprite(bushMaterial)
    const bushRightX = bushX + 6.0
    const bushRightZ = bushZ + 3.4
    const bushRightY = sampleHeight(bushRightX, bushRightZ)
    bushRight.position.set(bushRightX, bushRightY + 0.35, bushRightZ)
    bushRight.scale.set(1, 1, 1)
    bushRight.renderOrder = 2
    scene.add(bushRight)

    const bushRightNear1 = new THREE.Sprite(bushMaterial)
    const bushRightNear1X = bushRightX - 0.2
    const bushRightNear1Z = bushRightZ + 2.4
    const bushRightNear1Y = sampleHeight(bushRightNear1X, bushRightNear1Z)
    bushRightNear1.position.set(
      bushRightNear1X,
      bushRightNear1Y + 0.35,
      bushRightNear1Z
    )
    bushRightNear1.scale.set(1, 1, 1)
    bushRightNear1.renderOrder = 2
    scene.add(bushRightNear1)

    const bushRightNear2 = new THREE.Sprite(bush2Material)
    const bushRightNear2X = bushRightX - 1.1
    const bushRightNear2Z = bushRightZ - 0.2
    const bushRightNear2Y = sampleHeight(bushRightNear2X, bushRightNear2Z)
    bushRightNear2.position.set(
      bushRightNear2X,
      bushRightNear2Y + 0.35,
      bushRightNear2Z
    )
    bushRightNear2.scale.set(1, 1, 1)
    bushRightNear2.renderOrder = 2
    scene.add(bushRightNear2)

    const bushBaseScales = {
      bush: new THREE.Vector2(1, 1),
      bushBackLeft: new THREE.Vector2(1, 1),
      bushLeft: new THREE.Vector2(1, 1),
      bushLeftNear1: new THREE.Vector2(1, 1),
      bushLeftNear2: new THREE.Vector2(1, 1),
      bushRight: new THREE.Vector2(1, 1),
      bushRightNear1: new THREE.Vector2(1, 1),
      bushRightNear2: new THREE.Vector2(1, 1),
      bushFarFront: new THREE.Vector2(1, 1),
      bush2FarFront: new THREE.Vector2(1, 1),
    }

    const updateBushScale = () => {
      const targetHeightBush1 = 0.4
      const targetHeightBush2 = 0.32
      if (bushTexture.image) {
        const { width, height } = bushTexture.image
        const aspect = width / height
        const widthScaled = targetHeightBush1 * aspect
        bush.scale.set(widthScaled, targetHeightBush1, 1)
        bushLeft.scale.set(widthScaled, targetHeightBush1, 1)
        bushLeftNear1.scale.set(widthScaled, targetHeightBush1, 1)
        bushRight.scale.set(widthScaled, targetHeightBush1, 1)
        bushRightNear1.scale.set(widthScaled, targetHeightBush1, 1)
        bushFarFront.scale.set(widthScaled, targetHeightBush1, 1)
        bushBaseScales.bush.set(widthScaled, targetHeightBush1)
        bushBaseScales.bushLeft.set(widthScaled, targetHeightBush1)
        bushBaseScales.bushLeftNear1.set(widthScaled, targetHeightBush1)
        bushBaseScales.bushRight.set(widthScaled, targetHeightBush1)
        bushBaseScales.bushRightNear1.set(widthScaled, targetHeightBush1)
        bushBaseScales.bushFarFront.set(widthScaled, targetHeightBush1)
      }

      if (bush2Texture.image) {
        const { width, height } = bush2Texture.image
        const aspect = width / height
        const widthScaled = targetHeightBush2 * aspect
        bushBackLeft.scale.set(widthScaled, targetHeightBush2, 1)
        bushLeftNear2.scale.set(widthScaled, targetHeightBush2, 1)
        bushRightNear2.scale.set(widthScaled, targetHeightBush2, 1)
        bush2FarFront.scale.set(widthScaled, targetHeightBush2, 1)
        bushBaseScales.bushBackLeft.set(widthScaled, targetHeightBush2)
        bushBaseScales.bushLeftNear2.set(widthScaled, targetHeightBush2)
        bushBaseScales.bushRightNear2.set(widthScaled, targetHeightBush2)
        bushBaseScales.bush2FarFront.set(widthScaled, targetHeightBush2)
      }
    }

    if (bushTexture.image) {
      updateBushScale()
    } else {
      bushTexture.onUpdate = updateBushScale
    }
    if (bush2Texture.image) {
      updateBushScale()
    } else {
      bush2Texture.onUpdate = updateBushScale
    }

    // --- BOULDER SPRITE ---
    const boulderTexture = new THREE.TextureLoader().load('/sprites/boulder1.png')
    boulderTexture.colorSpace = THREE.SRGBColorSpace

    const boulderTextureFlipped = boulderTexture.clone()
    boulderTextureFlipped.wrapS = THREE.RepeatWrapping
    boulderTextureFlipped.repeat.x = -1
    boulderTextureFlipped.offset.x = 1
    boulderTextureFlipped.needsUpdate = true

    const boulderMaterial = new THREE.SpriteMaterial({
      map: boulderTexture,
      transparent: true,
      depthWrite: false,
    })
    const boulderFlippedMaterial = new THREE.SpriteMaterial({
      map: boulderTextureFlipped,
      transparent: true,
      depthWrite: false,
    })
    const boulder = new THREE.Sprite(boulderMaterial)

    const boulderX = 3.8
    const boulderZ = grassZ - 9.2
    const boulderY = sampleHeight(boulderX, boulderZ)
    boulder.position.set(boulderX, boulderY + 0.05, boulderZ)
    boulder.scale.set(1, 1, 1)
    boulder.renderOrder = 2
    scene.add(boulder)

    const boulderFarRight = new THREE.Sprite(boulderMaterial)
    const boulderFarRightX = 9.6
    const boulderFarRightZ = boulderZ
    const boulderFarRightY = sampleHeight(boulderFarRightX, boulderFarRightZ)
    boulderFarRight.position.set(
      boulderFarRightX,
      boulderFarRightY + 0.95,
      boulderFarRightZ
    )
    boulderFarRight.scale.set(1, 1, 1)
    boulderFarRight.renderOrder = 2
    scene.add(boulderFarRight)

    const boulderFarLeft = new THREE.Sprite(boulderFlippedMaterial)
    const boulderFarLeftX = -8.0
    const boulderFarLeftZ = boulderZ + 4.8
    const boulderFarLeftY = sampleHeight(boulderFarLeftX, boulderFarLeftZ)
    boulderFarLeft.position.set(
      boulderFarLeftX,
      boulderFarLeftY + 0.95,
      boulderFarLeftZ
    )
    boulderFarLeft.scale.set(1, 1, 1)
    boulderFarLeft.renderOrder = 2
    scene.add(boulderFarLeft)

    const boulderFarCenter = new THREE.Sprite(boulderMaterial)
    const farTerrainEdgeZ = baseZ - GROUND_DEPTH / 2 + 0.8
    const boulderFarCenterX = -3.25
    const desiredFarZ = grassZ - 26.0
    const boulderFarCenterZ = Math.max(desiredFarZ, farTerrainEdgeZ)
    const boulderFarCenterY = sampleHeight(boulderFarCenterX, boulderFarCenterZ)
    boulderFarCenter.position.set(
      boulderFarCenterX,
      boulderFarCenterY + 0.2,
      boulderFarCenterZ
    )
    boulderFarCenter.scale.set(1, 1, 1)
    boulderFarCenter.renderOrder = 2
    scene.add(boulderFarCenter)

    const bushFarFront = new THREE.Sprite(bushMaterial)
    const bushFarFrontX = boulderFarCenterX - 0.5
    const bushFarFrontZ = boulderFarCenterZ + 1.4
    const bushFarFrontY = sampleHeight(bushFarFrontX, bushFarFrontZ)
    bushFarFront.position.set(
      bushFarFrontX,
      bushFarFrontY + 0.15,
      bushFarFrontZ
    )
    bushFarFront.scale.set(1, 1, 1)
    bushFarFront.renderOrder = 2
    scene.add(bushFarFront)

    const bush2FarFront = new THREE.Sprite(bush2Material)
    const bush2FarFrontX = boulderFarCenterX + 0.6
    const bush2FarFrontZ = boulderFarCenterZ + 1.1
    const bush2FarFrontY = sampleHeight(bush2FarFrontX, bush2FarFrontZ)
    bush2FarFront.position.set(
      bush2FarFrontX,
      bush2FarFrontY + 0.15,
      bush2FarFrontZ
    )
    bush2FarFront.scale.set(1, 1, 1)
    bush2FarFront.renderOrder = 2
    scene.add(bush2FarFront)

    const updateBoulderScale = () => {
      const image = boulderTexture.image
      if (!image) return
      const { width, height } = image
      const aspect = width / height
      const targetHeight = 2.0
      const targetHeightFar = 1.2
      const widthScaled = targetHeight * aspect
      const widthScaledFar = targetHeightFar * aspect
      boulder.scale.set(widthScaled, targetHeight, 1)
      boulderFarRight.scale.set(widthScaled, targetHeight, 1)
      boulderFarLeft.scale.set(widthScaled, targetHeight, 1)
      boulderFarCenter.scale.set(widthScaledFar, targetHeightFar, 1)
    }

    if (boulderTexture.image) {
      updateBoulderScale()
    } else {
      boulderTexture.onUpdate = updateBoulderScale
    }

    // --- CLOUD SPRITE ---
    const cloudTexture = new THREE.TextureLoader().load('/sprites/cloud1.png')
    cloudTexture.colorSpace = THREE.SRGBColorSpace

    const cloudMaterial = new THREE.SpriteMaterial({
      map: cloudTexture,
      transparent: true,
      depthWrite: false,
    })
    const cloud = new THREE.Sprite(cloudMaterial)

    const cloudBaseX = -5.0
    const cloudZ = grassZ - 12.0
    const cloudY = 6.9
    cloud.position.set(cloudBaseX, cloudY, cloudZ)
    cloud.scale.set(1, 1, 1)
    cloud.renderOrder = 1
    scene.add(cloud)

    const updateCloudScale = () => {
      const image = cloudTexture.image
      if (!image) return
      const { width, height } = image
      const aspect = width / height
      const targetHeight = 2.4
      const widthScaled = targetHeight * aspect
      cloud.scale.set(widthScaled, targetHeight, 1)
    }

    if (cloudTexture.image) {
      updateCloudScale()
    } else {
      cloudTexture.onUpdate = updateCloudScale
    }

    let cloudXFactor = 1
    const minCloudXOffset = -0.8
    const updateCloudPositions = () => {
      cloudXFactor = THREE.MathUtils.clamp(camera.aspect / 1.6, 0.45, 1)
      cloud.position.x = Math.max(
        cloudBaseX * cloudXFactor,
        cloudBaseX * cloudXFactor + minCloudXOffset
      )
    }
    updateCloudPositions()

    // --- CLOUD 5 (cloud1 texture) ---
    const cloud5 = new THREE.Sprite(cloudMaterial)
    const cloud5X = 13.0
    const cloud5Z = cloudZ - 6.0
    const cloud5Y = 4.6
    cloud5.position.set(cloud5X, cloud5Y, cloud5Z)
    cloud5.scale.set(1, 1, 1)
    cloud5.renderOrder = 1
    scene.add(cloud5)

    const updateCloud5Scale = () => {
      const image = cloudTexture.image
      if (!image) return
      const { width, height } = image
      const aspect = width / height
      const targetHeight = 2.2
      const widthScaled = targetHeight * aspect
      cloud5.scale.set(widthScaled, targetHeight, 1)
    }

    if (cloudTexture.image) {
      updateCloud5Scale()
    } else {
      const prevUpdate = cloudTexture.onUpdate
      cloudTexture.onUpdate = () => {
        if (prevUpdate) prevUpdate()
        updateCloud5Scale()
      }
    }

    // --- CLOUD 2 SPRITE ---
    const cloud2Texture = new THREE.TextureLoader().load('/sprites/cloud2.png')
    cloud2Texture.colorSpace = THREE.SRGBColorSpace

    const cloud2Material = new THREE.SpriteMaterial({
      map: cloud2Texture,
      transparent: true,
      depthWrite: false,
    })
    const cloud2 = new THREE.Sprite(cloud2Material)

    const cloud2X = 3.1
    const cloud2Z = grassZ - 11.0
    const cloud2Y = 5.8
    cloud2.position.set(cloud2X, cloud2Y, cloud2Z)
    cloud2.scale.set(1, 1, 1)
    cloud2.renderOrder = 1
    scene.add(cloud2)

    const updateCloud2Scale = () => {
      const image = cloud2Texture.image
      if (!image) return
      const { width, height } = image
      const aspect = width / height
      const targetHeight = 2.1
      const widthScaled = targetHeight * aspect
      cloud2.scale.set(widthScaled, targetHeight, 1)
    }

    if (cloud2Texture.image) {
      updateCloud2Scale()
    } else {
      cloud2Texture.onUpdate = updateCloud2Scale
    }

    // --- CLOUD 4 (cloud2 texture) ---
    const cloud2TextureFlipped = cloud2Texture.clone()
    cloud2TextureFlipped.wrapS = THREE.RepeatWrapping
    cloud2TextureFlipped.repeat.x = -1
    cloud2TextureFlipped.offset.x = 1
    cloud2TextureFlipped.needsUpdate = true

    const cloud2FlippedMaterial = new THREE.SpriteMaterial({
      map: cloud2TextureFlipped,
      transparent: true,
      depthWrite: false,
    })

    const cloud4 = new THREE.Sprite(cloud2FlippedMaterial)
    const cloud4X = -10.9
    const cloud4Z = cloud2Z - 2.0
    const cloud4Y = 5.2
    cloud4.position.set(cloud4X, cloud4Y, cloud4Z)
    cloud4.scale.set(1, 1, 1)
    cloud4.renderOrder = 1
    scene.add(cloud4)

    const updateCloud4Scale = () => {
      const image = cloud2Texture.image
      if (!image) return
      const { width, height } = image
      const aspect = width / height
      const targetHeight = 2.0
      const widthScaled = targetHeight * aspect
      cloud4.scale.set(widthScaled, targetHeight, 1)
    }

    if (cloud2Texture.image) {
      updateCloud4Scale()
    } else {
      const prevUpdate = cloud2Texture.onUpdate
      cloud2Texture.onUpdate = () => {
        if (prevUpdate) prevUpdate()
        updateCloud4Scale()
      }
    }

    // --- CLOUD 3 SPRITE ---
    const cloud3Texture = new THREE.TextureLoader().load('/sprites/cloud3.png')
    cloud3Texture.colorSpace = THREE.SRGBColorSpace
    cloud3Texture.wrapS = THREE.RepeatWrapping
    cloud3Texture.repeat.x = -1
    cloud3Texture.offset.x = 1

    const cloud3Material = new THREE.SpriteMaterial({
      map: cloud3Texture,
      transparent: true,
      depthWrite: false,
    })
    const cloud3 = new THREE.Sprite(cloud3Material)

    const cloud3X = -2.3
    const cloud3Z = grassZ - 15.0
    const cloud3Y = 5.0
    cloud3.position.set(cloud3X, cloud3Y, cloud3Z)
    cloud3.scale.set(1, 1, 1)
    cloud3.renderOrder = 1
    scene.add(cloud3)

    const updateCloud3Scale = () => {
      const image = cloud3Texture.image
      if (!image) return
      const { width, height } = image
      const aspect = width / height
      const targetHeight = 1.9
      const widthScaled = targetHeight * aspect
      cloud3.scale.set(widthScaled, targetHeight, 1)
    }

    if (cloud3Texture.image) {
      updateCloud3Scale()
    } else {
      cloud3Texture.onUpdate = updateCloud3Scale
    }

    // --- MOUNTAIN SPRITE ---
    const mountainTexture = new THREE.TextureLoader().load('/sprites/mountain1.png')
    mountainTexture.colorSpace = THREE.SRGBColorSpace
    const mountainTextureFlipped = mountainTexture.clone()
    mountainTextureFlipped.wrapS = THREE.RepeatWrapping
    mountainTextureFlipped.repeat.x = -1
    mountainTextureFlipped.offset.x = 1

    const mountainMaterial = new THREE.SpriteMaterial({
      map: mountainTexture,
      transparent: true,
      depthWrite: false,
    })
    const mountainFlippedMaterial = new THREE.SpriteMaterial({
      map: mountainTextureFlipped,
      transparent: true,
      depthWrite: false,
    })
    const mountain = new THREE.Sprite(mountainMaterial)

    const mountainBaseX = -8.0
    const mountainZ = grassZ - 20.0
    const mountainY = 1.2
    mountain.position.set(mountainBaseX, mountainY, mountainZ)
    mountain.scale.set(1, 1, 1)
    mountain.renderOrder = 0
    mountain.frustumCulled = false
    scene.add(mountain)

    const mountainRight = new THREE.Sprite(mountainFlippedMaterial)
    const mountainRightBaseX = 10.5
    const mountainRightZ = mountainZ
    const mountainRightY = mountainY - 2.6
    mountainRight.position.set(mountainRightBaseX, mountainRightY, mountainRightZ)
    mountainRight.scale.set(1, 1, 1)
    mountainRight.renderOrder = 0
    mountainRight.frustumCulled = false
    scene.add(mountainRight)

    const updateMountainScale = () => {
      const image = mountainTexture.image
      if (!image) return
      const { width, height } = image
      const aspect = width / height
      const targetHeight = 19.5
      const widthScaled = targetHeight * aspect
      mountain.scale.set(widthScaled, targetHeight, 1)
      mountainRight.scale.set(widthScaled, targetHeight, 1)
    }

    if (mountainTexture.image) {
      updateMountainScale()
    } else {
      mountainTexture.onUpdate = updateMountainScale
    }

    const updateMountainPositions = () => {
      const factor = THREE.MathUtils.clamp(camera.aspect / 1.6, 0.45, 1)
      const leftBias = (1 - factor) * 6.0
      const leftX = mountainBaseX * factor - leftBias
      const rightX = mountainRightBaseX * factor
      mountain.position.x = THREE.MathUtils.clamp(leftX, -9.5, -2.0)
      mountainRight.position.x = THREE.MathUtils.clamp(rightX, 2.0, 9.5)
    }
    updateMountainPositions()

    // --- LOOP ---
    let raf = 0
    const startTime = performance.now()
    const cloudMotion = [
      { phase: 0.0, ampX: 0.12, ampY: 0.06 },
      { phase: 0.7, ampX: 0.14, ampY: 0.06 },
      { phase: 1.4, ampX: 0.1, ampY: 0.06 },
      { phase: 2.1, ampX: 0.14, ampY: 0.06 },
      { phase: 2.8, ampX: 0.1, ampY: 0.06 },
    ]
    const grassWavePhases = {
      grass: 0.0,
      grassLeft: 0.9,
      grassRight: 1.7,
      grassBack: 2.4,
      grassBackRight: 3.1,
    }
    const bushShakeConfigs = [
      { key: 'bush', amp: 0.05, phase: 0.2 },
      { key: 'bushBackLeft', amp: 0.04, phase: 1.1 },
      { key: 'bushLeft', amp: 0.05, phase: 2.0 },
      { key: 'bushLeftNear1', amp: 0.06, phase: 2.7 },
      { key: 'bushLeftNear2', amp: 0.045, phase: 3.6 },
      { key: 'bushRight', amp: 0.05, phase: 4.3 },
      { key: 'bushRightNear1', amp: 0.04, phase: 5.1 },
      { key: 'bushRightNear2', amp: 0.055, phase: 6.0 },
      { key: 'bushFarFront', amp: 0.035, phase: 6.8 },
      { key: 'bush2FarFront', amp: 0.05, phase: 7.5 },
    ]
    const animate = () => {
      const t = (performance.now() - startTime) * 0.001
      mouseOffset.current = THREE.MathUtils.lerp(
        mouseOffset.current,
        mouseOffset.target,
        0.12
      )
      mouseOffsetY.current = THREE.MathUtils.lerp(
        mouseOffsetY.current,
        mouseOffsetY.target,
        0.12
      )
      camera.position.x = baseCameraPos.x - mouseOffset.current * 1.2
      camera.position.y = baseCameraPos.y - mouseOffsetY.current * 0.8
      camera.position.z = baseCameraPos.z + mouseOffsetY.current * 0.45
      camera.lookAt(
        baseLookAt.x + mouseOffset.current * 0.08,
        baseLookAt.y + mouseOffsetY.current * 0.05,
        baseLookAt.z
      )
      const baseCloudX = cloudBaseX * cloudXFactor
      const minCloudX = baseCloudX + minCloudXOffset
      const cloudLoopX = Math.sin(t * 0.4 + cloudMotion[0].phase) * cloudMotion[0].ampX
      const cloudLoopY = Math.sin(t * 0.8 + cloudMotion[0].phase * 2) * cloudMotion[0].ampY
      const cloud2LoopX = Math.sin(t * 0.4 + cloudMotion[1].phase) * cloudMotion[1].ampX
      const cloud2LoopY = Math.sin(t * 0.8 + cloudMotion[1].phase * 2) * cloudMotion[1].ampY
      const cloud3LoopX = Math.sin(t * 0.4 + cloudMotion[2].phase) * cloudMotion[2].ampX
      const cloud3LoopY = Math.sin(t * 0.8 + cloudMotion[2].phase * 2) * cloudMotion[2].ampY
      const cloud4LoopX = Math.sin(t * 0.4 + cloudMotion[3].phase) * cloudMotion[3].ampX
      const cloud4LoopY = Math.sin(t * 0.8 + cloudMotion[3].phase * 2) * cloudMotion[3].ampY
      const cloud5LoopX = Math.sin(t * 0.4 + cloudMotion[4].phase) * cloudMotion[4].ampX
      const cloud5LoopY = Math.sin(t * 0.8 + cloudMotion[4].phase * 2) * cloudMotion[4].ampY
      cloud.position.x = Math.max(baseCloudX + cloudLoopX, minCloudX)
      cloud.position.y = cloudY + cloudLoopY
      cloud2.position.x = cloud2X + cloud2LoopX
      cloud2.position.y = cloud2Y + cloud2LoopY
      cloud3.position.x = cloud3X + cloud3LoopX
      cloud3.position.y = cloud3Y + cloud3LoopY
      cloud4.position.x = cloud4X + cloud4LoopX
      cloud4.position.y = cloud4Y + cloud4LoopY
      cloud5.position.x = cloud5X + cloud5LoopX
      cloud5.position.y = cloud5Y + cloud5LoopY
      grass.quaternion.copy(camera.quaternion)
      grassLeft.quaternion.copy(camera.quaternion)
      grassRight.quaternion.copy(camera.quaternion)
      grassBack.quaternion.copy(camera.quaternion)
      grassBackRight.quaternion.copy(camera.quaternion)
      const grassWave = (phase) => Math.sin(t * 1.1 + phase)
      const grassStretch = 1 + grassWave(grassWavePhases.grass) * 0.06
      const grassSquash = 1 - grassWave(grassWavePhases.grass) * 0.04
      grass.scale.set(
        grassBaseScales.grass.x * grassStretch,
        grassBaseScales.grass.y * grassSquash,
        1
      )
      const grassLeftWave = grassWave(grassWavePhases.grassLeft)
      grassLeft.scale.set(
        grassBaseScales.grassLeft.x * (1 + grassLeftWave * 0.06),
        grassBaseScales.grassLeft.y * (1 - grassLeftWave * 0.04),
        1
      )
      const grassRightWave = grassWave(grassWavePhases.grassRight)
      grassRight.scale.set(
        grassBaseScales.grassRight.x * (1 + grassRightWave * 0.06),
        grassBaseScales.grassRight.y * (1 - grassRightWave * 0.04),
        1
      )
      const grassBackWave = grassWave(grassWavePhases.grassBack)
      grassBack.scale.set(
        grassBaseScales.grassBack.x * (1 + grassBackWave * 0.06),
        grassBaseScales.grassBack.y * (1 - grassBackWave * 0.04),
        1
      )
      const grassBackRightWave = grassWave(grassWavePhases.grassBackRight)
      grassBackRight.scale.set(
        grassBaseScales.grassBackRight.x * (1 + grassBackRightWave * 0.06),
        grassBaseScales.grassBackRight.y * (1 - grassBackRightWave * 0.04),
        1
      )
      bush.quaternion.copy(camera.quaternion)
      bushBackLeft.quaternion.copy(camera.quaternion)
      bushLeft.quaternion.copy(camera.quaternion)
      bushLeftNear1.quaternion.copy(camera.quaternion)
      bushLeftNear2.quaternion.copy(camera.quaternion)
      bushRight.quaternion.copy(camera.quaternion)
      bushRightNear1.quaternion.copy(camera.quaternion)
      bushRightNear2.quaternion.copy(camera.quaternion)
      bushFarFront.quaternion.copy(camera.quaternion)
      bush2FarFront.quaternion.copy(camera.quaternion)
      const bushShakeFor = (cfg) => {
        const pulse = Math.pow(Math.max(0, Math.sin(t * 0.7 + cfg.phase)), 3)
        return Math.sin(t * 12.0 + cfg.phase * 2.3) * cfg.amp * pulse
      }
      const bushShake = Object.fromEntries(
        bushShakeConfigs.map((cfg) => [cfg.key, bushShakeFor(cfg)])
      )
      bush.scale.set(
        bushBaseScales.bush.x * (1 + bushShake.bush),
        bushBaseScales.bush.y * (1 - bushShake.bush),
        1
      )
      bushBackLeft.scale.set(
        bushBaseScales.bushBackLeft.x * (1 + bushShake.bushBackLeft * 0.98),
        bushBaseScales.bushBackLeft.y * (1 - bushShake.bushBackLeft * 1.02),
        1
      )
      bushLeft.scale.set(
        bushBaseScales.bushLeft.x * (1 + bushShake.bushLeft * 1.01),
        bushBaseScales.bushLeft.y * (1 - bushShake.bushLeft * 0.99),
        1
      )
      bushLeftNear1.scale.set(
        bushBaseScales.bushLeftNear1.x * (1 + bushShake.bushLeftNear1 * 1.02),
        bushBaseScales.bushLeftNear1.y * (1 - bushShake.bushLeftNear1 * 0.98),
        1
      )
      bushLeftNear2.scale.set(
        bushBaseScales.bushLeftNear2.x * (1 + bushShake.bushLeftNear2 * 0.99),
        bushBaseScales.bushLeftNear2.y * (1 - bushShake.bushLeftNear2 * 1.01),
        1
      )
      bushRight.scale.set(
        bushBaseScales.bushRight.x * (1 + bushShake.bushRight * 1.01),
        bushBaseScales.bushRight.y * (1 - bushShake.bushRight * 0.99),
        1
      )
      bushRightNear1.scale.set(
        bushBaseScales.bushRightNear1.x * (1 + bushShake.bushRightNear1 * 0.98),
        bushBaseScales.bushRightNear1.y * (1 - bushShake.bushRightNear1 * 1.02),
        1
      )
      bushRightNear2.scale.set(
        bushBaseScales.bushRightNear2.x * (1 + bushShake.bushRightNear2 * 1.02),
        bushBaseScales.bushRightNear2.y * (1 - bushShake.bushRightNear2 * 0.98),
        1
      )
      bushFarFront.scale.set(
        bushBaseScales.bushFarFront.x * (1 + bushShake.bushFarFront * 0.97),
        bushBaseScales.bushFarFront.y * (1 - bushShake.bushFarFront * 1.03),
        1
      )
      bush2FarFront.scale.set(
        bushBaseScales.bush2FarFront.x * (1 + bushShake.bush2FarFront * 1.03),
        bushBaseScales.bush2FarFront.y * (1 - bushShake.bush2FarFront * 0.97),
        1
      )
      boulder.quaternion.copy(camera.quaternion)
      boulderFarRight.quaternion.copy(camera.quaternion)
      boulderFarLeft.quaternion.copy(camera.quaternion)
      boulderFarCenter.quaternion.copy(camera.quaternion)
      cloud.quaternion.copy(camera.quaternion)
      cloud2.quaternion.copy(camera.quaternion)
      cloud3.quaternion.copy(camera.quaternion)
      cloud4.quaternion.copy(camera.quaternion)
      cloud5.quaternion.copy(camera.quaternion)
      mountain.quaternion.copy(camera.quaternion)
      mountainRight.quaternion.copy(camera.quaternion)
      renderer.render(scene, camera)
      raf = requestAnimationFrame(animate)
    }

    const onResize = () => {
      const { clientWidth, clientHeight } = mount
      camera.aspect = clientWidth / clientHeight
      camera.updateProjectionMatrix()
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.setSize(clientWidth, clientHeight)
      updateCloudPositions()
      updateMountainPositions()
    }

    const onMouseMove = (event) => {
      const rect = mount.getBoundingClientRect()
      const normalizedX =
        ((event.clientX - rect.left) / rect.width) * 2 - 1
      const normalizedY =
        ((event.clientY - rect.top) / rect.height) * 2 - 1
      mouseOffset.target = THREE.MathUtils.clamp(normalizedX, -1, 1) * 1.6
      mouseOffsetY.target = THREE.MathUtils.clamp(normalizedY, -1, 1) * -1.2
    }

    window.addEventListener('resize', onResize)
    window.addEventListener('mousemove', onMouseMove)
    onResize()
    animate()

    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('mousemove', onMouseMove)
      cancelAnimationFrame(raf)

      skyTexture.dispose()
      terrainGeo.dispose()
      terrainMat.dispose()
      grassMaterial.dispose()
      grassTexture.dispose()
      grassTextureFlipped.dispose()
      bushMaterial.dispose()
      bushTexture.dispose()
      bush2Material.dispose()
      bush2Texture.dispose()
      boulderMaterial.dispose()
      boulderTexture.dispose()
      boulderFlippedMaterial.dispose()
      boulderTextureFlipped.dispose()
      cloudMaterial.dispose()
      cloudTexture.dispose()
      cloud2Material.dispose()
      cloud2Texture.dispose()
      cloud2FlippedMaterial.dispose()
      cloud2TextureFlipped.dispose()
      cloud3Material.dispose()
      cloud3Texture.dispose()
      mountainMaterial.dispose()
      mountainTexture.dispose()
      mountainFlippedMaterial.dispose()
      mountainTextureFlipped.dispose()
      renderer.dispose()

      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement)
      }
    }
  }, [])

  useEffect(() => {
    const cursor = cursorRef.current
    if (!cursor) return

    const isTouchDevice =
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      window.matchMedia('(pointer: coarse)').matches
    if (isTouchDevice) {
      cursor.style.display = 'none'
      return
    }

    const previousCursor = document.body.style.cursor
    document.body.style.cursor = 'none'
    const previousRootCursor = document.documentElement.style.cursor
    document.documentElement.style.cursor = 'none'
    const cursorStyle = document.createElement('style')
    cursorStyle.setAttribute('data-custom-cursor', 'true')
    cursorStyle.textContent = '* { cursor: none !important; }'
    document.head.appendChild(cursorStyle)

    const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    let raf = 0
    let hoveringClickable = false
    const clickableSelector =
      'button, a, input, select, textarea, [role="button"], [data-clickable="true"]'

    const onMouseMove = (event) => {
      mouse.x = event.clientX
      mouse.y = event.clientY
      const hit = document.elementFromPoint(event.clientX, event.clientY)
      const isClickable = Boolean(hit && hit.closest(clickableSelector))
      if (isClickable !== hoveringClickable) {
        hoveringClickable = isClickable
        cursor.style.setProperty(
          '--cursor-color',
          isClickable ? 'rgba(86, 255, 138, 0.95)' : 'rgba(255, 255, 255, 0.85)'
        )
      }
    }

    const animate = () => {
      cursor.style.left = `${mouse.x}px`
      cursor.style.top = `${mouse.y}px`
      raf = requestAnimationFrame(animate)
    }

    window.addEventListener('mousemove', onMouseMove)
    animate()

    return () => {
      document.body.style.cursor = previousCursor
      document.documentElement.style.cursor = previousRootCursor
      cursorStyle.remove()
      window.removeEventListener('mousemove', onMouseMove)
      cancelAnimationFrame(raf)
    }
  }, [])

  useEffect(() => {
    const onWheel = (event) => {
      const now = Date.now()
      if (now - scrollLockRef.current < 450) return
      if (event.deltaY < -5) {
        scrollLockRef.current = now
        setActiveCanvas((prev) =>
          Math.min(prev + 1, CANVAS_ITEMS.length - 1)
        )
      } else if (event.deltaY > 5) {
        scrollLockRef.current = now
        setActiveCanvas((prev) => Math.max(prev - 1, 0))
      }
    }

    let touchStartY = 0
    const onTouchStart = (event) => {
      if (!event.touches?.length) return
      touchStartY = event.touches[0].clientY
    }
    const onTouchEnd = (event) => {
      if (!event.changedTouches?.length) return
      const touchEndY = event.changedTouches[0].clientY
      const deltaY = touchEndY - touchStartY
      if (Math.abs(deltaY) < 30) return
      const now = Date.now()
      if (now - scrollLockRef.current < 450) return
      scrollLockRef.current = now
      if (deltaY < 0) {
        setActiveCanvas((prev) => Math.max(prev - 1, 0))
      } else {
        setActiveCanvas((prev) =>
          Math.min(prev + 1, CANVAS_ITEMS.length - 1)
        )
      }
    }

    window.addEventListener('wheel', onWheel, { passive: true })
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [])

  return (
    <>
      <style>{`
        .scroll-hint--up {
          animation: scrollHintBobUp 3.6s ease-in-out infinite;
        }
        .scroll-hint--down {
          animation: scrollHintBobDown 3.6s ease-in-out infinite;
        }
        @keyframes scrollHintBobUp {
          0%,
          10%,
          18%,
          26%,
          100% {
            top: 18px;
          }
          6% {
            top: 6px;
          }
          14% {
            top: 12px;
          }
          22% {
            top: 15px;
          }
        }
        @keyframes scrollHintBobDown {
          0%,
          10%,
          18%,
          26%,
          100% {
            bottom: 18px;
          }
          6% {
            bottom: 6px;
          }
          14% {
            bottom: 12px;
          }
          22% {
            bottom: 15px;
          }
        }
        @media (min-width: 769px) {
          .namecard-title {
            margin-top: 0;
          }
        }
      `}</style>
      <Navbar
        items={CANVAS_ITEMS}
        activeIndex={activeCanvas}
        onSelect={setActiveCanvas}
      />
      <div
        ref={cursorRef}
        style={{
          position: 'fixed',
          top: '-9999px',
          left: '-9999px',
          width: '18px',
          height: '18px',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          zIndex: 1200,
          '--cursor-color': 'rgba(255, 255, 255, 0.85)',
        }}
      >
        <span
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: '18px',
            height: '2px',
            background: 'var(--cursor-color)',
            transform: 'translate(-50%, -50%)',
            boxShadow: '0 0 10px rgba(0, 0, 0, 0.25)',
          }}
        />
        <span
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: '2px',
            height: '18px',
            background: 'var(--cursor-color)',
            transform: 'translate(-50%, -50%)',
            boxShadow: '0 0 10px rgba(0, 0, 0, 0.25)',
          }}
        />
      </div>
      {activeCanvas === DEFAULT_CANVAS_INDEX && (
        <button
          type="button"
          className="scroll-hint--up"
          onClick={() =>
            setActiveCanvas((prev) =>
              Math.min(prev + 1, CANVAS_ITEMS.length - 1)
            )
          }
          style={{
            position: 'fixed',
            top: '18px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 950,
            background:
              'linear-gradient(135deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.04))',
            borderRadius: '18px',
            boxShadow: 'none',
            border: '1px solid rgba(255, 255, 255, 0.28)',
            backdropFilter: 'blur(16px) saturate(140%)',
            WebkitBackdropFilter: 'blur(16px) saturate(140%)',
            padding: '10px 18px 12px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px',
            pointerEvents: 'auto',
            cursor: 'pointer',
            outline: 'none',
            border: '1px solid rgba(255, 255, 255, 0.28)',
            font: 'inherit',
          }}
        >
          <span
            style={{
              display: 'block',
              width: '14px',
              height: '14px',
              borderRight: '2px solid rgba(255, 255, 255, 0.85)',
              borderBottom: '2px solid rgba(255, 255, 255, 0.85)',
              borderRadius: '2px',
              transform: 'rotate(-135deg)',
              filter: 'drop-shadow(0 4px 10px rgba(0, 0, 0, 0.35))',
            }}
          />
          <span
            style={{
              color: 'rgba(255, 255, 255, 0.82)',
              fontSize: '14px',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              fontWeight: 600,
              textShadow: '0 6px 14px rgba(0, 0, 0, 0.4)',
            }}
          >
            Scroll up to see Projects
          </span>
        </button>
      )}
      {activeCanvas === DEFAULT_CANVAS_INDEX && (
        <button
          type="button"
          className="scroll-hint--down"
          onClick={() =>
            setActiveCanvas((prev) => Math.max(prev - 1, 0))
          }
          style={{
            position: 'fixed',
            bottom: '18px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 950,
            background:
              'linear-gradient(135deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.04))',
            borderRadius: '18px',
            boxShadow: 'none',
            border: '1px solid rgba(255, 255, 255, 0.28)',
            backdropFilter: 'blur(16px) saturate(140%)',
            WebkitBackdropFilter: 'blur(16px) saturate(140%)',
            padding: '12px 18px 10px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px',
            pointerEvents: 'auto',
            cursor: 'pointer',
            outline: 'none',
            font: 'inherit',
          }}
        >
          <span
            style={{
              color: 'rgba(255, 255, 255, 0.82)',
              fontSize: '14px',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              fontWeight: 600,
              textShadow: '0 6px 14px rgba(0, 0, 0, 0.4)',
            }}
          >
            Scroll down to see Experiences
          </span>
          <span
            style={{
              display: 'block',
              width: '14px',
              height: '14px',
              borderRight: '2px solid rgba(255, 255, 255, 0.85)',
              borderBottom: '2px solid rgba(255, 255, 255, 0.85)',
              borderRadius: '2px',
              transform: 'rotate(45deg)',
              filter: 'drop-shadow(0 4px 10px rgba(0, 0, 0, 0.35))',
            }}
          />
        </button>
      )}
      {CANVAS_ITEMS.map((item, index) => (
        <section
          key={item.title}
          style={{
            ...getCanvasStyle(index),
            visibility: item.hidden ? 'hidden' : 'visible',
          }}
        >
          {item.image ? (
            <div className="namecard-wrap">
              {item.imageMobile ? (
                <picture>
                  <source
                    media="(max-width: 768px)"
                    srcSet={item.imageMobile}
                  />
                  <img
                    src={item.image}
                    alt={item.title}
                    className="namecard-image"
                    style={{
                      width: '100%',
                      height: 'auto',
                      borderRadius: '20px',
                      transform: `translateY(var(--namecard-translate, -16px)) scale(${item.imageScale || 1})`,
                    }}
                  />
                </picture>
              ) : (
                <img
                  src={item.image}
                  alt={item.title}
                  className="namecard-image"
                  style={{
                    width: '100%',
                    height: 'auto',
                    borderRadius: '20px',
                    transform: `translateY(var(--namecard-translate, -16px)) scale(${item.imageScale || 1})`,
                  }}
                />
              )}
              <div
                className="namecard-title"
                style={{
                  textAlign: 'center',
                  fontSize: '28px',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: '#F8FAFC',
                  fontFamily: '"Vast Shadow", serif',
                  fontWeight: 700,
                  textShadow:
                    '0 14px 28px rgba(0, 0, 0, 0.95), 0 0 10px rgba(0, 0, 0, 0.8), 0 0 18px rgba(0, 0, 0, 0.6)',
                  WebkitTextStroke: '1px rgba(0, 0, 0, 0.75)',
                }}
              >
                Engineer <span className="namecard-sep">*</span> Scientist{' '}
                <span className="namecard-sep">*</span> Innovator
              </div>
            </div>
          ) : (
            <>
              <h1
                style={{
                  margin: 0,
                  fontSize: 'clamp(24px, 4vw, 34px)',
                  letterSpacing: '0.02em',
                }}
              >
                {item.title}
              </h1>
              <p
                style={{
                  margin: 0,
                  fontSize: 'clamp(15px, 2.6vw, 17px)',
                  lineHeight: 1.7,
                  color: 'rgba(255, 255, 255, 0.75)',
                }}
              >
                {item.body}
              </p>
            </>
          )}
        </section>
      ))}
      <div
        ref={mountRef}
        style={{
          position: 'fixed',
          inset: 0,
          width: '100%',
          height: '100%',
          overflow: 'hidden',
        }}
      />
    </>
  )
}

export default Home
