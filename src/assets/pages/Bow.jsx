import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'

const CAMERA_PRESET = {
  position: { x: -14.584, y: 41.023, z: -36.178 },
  target: { x: 67.478, y: 40.121, z: -39.363 },
  rotation: { x: -0.276, y: -1.53, z: -0.276 },
  fov: 45,
}

const CAMERA_INTRO_PRESET = {
  position: { x: -234.127, y: 150.302, z: 79.684 },
  target: { x: 3.669, y: 43.012, z: -33.135 },
  rotation: { x: -0.76, y: -0.991, z: -0.672 },
  fov: 45,
}

const CAMERA_SCREEN_END_PRESET = {
  position: { x: -51.411, y: 76.282, z: 10.406 },
  target: { x: 54.214, y: 26.338, z: -49.789 },
  rotation: { x: -0.693, y: -0.933, z: -0.588 },
  fov: 45,
}

const CAMERA_AUTO_RANGE_PRESET = {
  position: { x: 203.107, y: 70.602, z: 103.459 },
  target: { x: 61.25, y: 39.923, z: 46.739 },
  rotation: { x: -0.496, y: 1.144, z: 0.458 },
  fov: 45,
}

const CAMERA_PCB_PRESET = {
  position: { x: -164.408, y: 226.675, z: 77.82 },
  target: { x: -40.132, y: 49.872, z: 17.819 },
  rotation: { x: -1.244, y: -0.587, z: -1.021 },
  fov: 45,
}

// Keep the display overlay anchored to the previous stable camera relation.
const DISPLAY_OVERLAY_PRESET = {
  y: 43.897,
  rotation: { x: -1.285, y: -1.515, z: -1.284 },
}

// Screen Design fly-away tuning (applies to all moving parts together).
const SCREEN_DESIGN_FLY = {
  distanceScale: .4, // 0 = no movement, 1 = current default
  durationMs: 4000, // larger = slower, smaller = faster
}

const BOW_OBJECT_FILES = [
  'BOWMOUNT v15_BOWMOUNT v15_Battery.obj',
  'BOWMOUNT v15_BOWMOUNT v15_Bottom.obj',
  'BOWMOUNT v15_BOWMOUNT v15_DisplayBay.obj',
  'BOWMOUNT v15_BOWMOUNT v15_MountArmMale.obj',
  'BOWMOUNT v15_BOWMOUNT v15_SV&.obj',
  'BOWMOUNT v15_BOWMOUNT v15_Top.obj',
  'BOWMOUNT v15_BOWMOUNT v15_batsup.obj',
  'BOWMOUNT v15_BOWMOUNT v15_capacitor.obj',
  'Driver_Board.obj',
  'Lidar_Lite_V3.obj',
  'PCB TP_4056.obj',
  'PicoW.obj',
]

// Per-object PCB move settings.
// enabled: include in PCB move
// distance: movement along the shared fly direction
// upOffset: extra movement along world up
const PCB_MOVE_WITH_TOP = {
  'BOWMOUNT v15_BOWMOUNT v15_Battery': { enabled: true, distance: 40, upOffset: 0 },
  'BOWMOUNT v15_BOWMOUNT v15_Bottom': { enabled: false, distance: 70, upOffset: 0 },
  'BOWMOUNT v15_BOWMOUNT v15_DisplayBay': { enabled: false, distance: 70, upOffset: 0 },
  'BOWMOUNT v15_BOWMOUNT v15_MountArmMale': { enabled: false, distance: 70, upOffset: 0 },
  'BOWMOUNT v15_BOWMOUNT v15_SV&': { enabled: false, distance: 70, upOffset: 0 },
  'BOWMOUNT v15_BOWMOUNT v15_Top': { enabled: true, distance: 70, upOffset: 0 },
  'BOWMOUNT v15_BOWMOUNT v15_batsup': { enabled: false, distance: 70, upOffset: 0 },
  'BOWMOUNT v15_BOWMOUNT v15_capacitor': { enabled: true, distance: 30, upOffset: 0 },
  Driver_Board: { enabled: true, distance: 20, upOffset: 0 },
  Lidar_Lite_V3: { enabled: true, distance: 30, upOffset: 0 },
  'PCB TP_4056': { enabled: true, distance: 20, upOffset: 0 },
  PicoW: { enabled: true, distance: 10, upOffset: 0 },
}

const BOW_MTL_FILES = new Set([
  'BOWMOUNT v15_BOWMOUNT v15_Battery.mtl',
  'BOWMOUNT v15_BOWMOUNT v15_Bottom.mtl',
  'BOWMOUNT v15_BOWMOUNT v15_DisplayBay.mtl',
  'BOWMOUNT v15_BOWMOUNT v15_MountArmMale.mtl',
  'BOWMOUNT v15_BOWMOUNT v15_SV&.mtl',
  'BOWMOUNT v15_BOWMOUNT v15_Top.mtl',
  'BOWMOUNT v15_BOWMOUNT v15_batsup.mtl',
  'BOWMOUNT v15_BOWMOUNT v15_capacitor.mtl',
  'Driver_Board.mtl',
  'Lidar_Lite_V3.mtl',
  'PCB TP_4056.mtl',
  'PicoW.mtl',
])

const BOW_BASE_PATH = '/objects/BowObjects/'
const encodeFileName = (fileName) => encodeURIComponent(fileName)
const SKY_TOP = '#2A8AC4'
const SKY_BOTTOM = '#7FB7E6'

const getBaseName = (fileName) => fileName.replace(/\.[^/.]+$/, '')

const loadMaterials = (loader, url) =>
  new Promise((resolve, reject) => {
    loader.load(url, resolve, undefined, reject)
  })

const loadObject = (loader, url) =>
  new Promise((resolve, reject) => {
    loader.load(url, resolve, undefined, reject)
  })

const createTextSprite = () => {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 64
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  const boxWidth = Math.floor(canvas.width * 0.62)
  const boxHeight = Math.floor(canvas.height * 0.72)
  const boxX = Math.floor((canvas.width - boxWidth) / 2)
  const boxY = Math.floor((canvas.height - boxHeight) / 2)
  ctx.fillStyle = 'rgba(38, 38, 38, 0.4)'
  ctx.fillRect(boxX, boxY, boxWidth, boxHeight)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.minFilter = THREE.NearestFilter
  texture.magFilter = THREE.NearestFilter
  texture.generateMipmaps = false
  texture.needsUpdate = true

  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthTest: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
  const geometry = new THREE.PlaneGeometry(36, 56)
  const mesh = new THREE.Mesh(geometry, material)
  return { mesh, texture, material, geometry }
}

const createDavisSprite = () => {
  const geometry = new THREE.PlaneGeometry(1, 1)
  const material = new THREE.MeshBasicMaterial({
    transparent: true,
    depthTest: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
  const mesh = new THREE.Mesh(geometry, material)
  const texture = new THREE.TextureLoader().load('/sprites/Davis12864.png', (loaded) => {
    const width = loaded.image?.width || 128
    const height = loaded.image?.height || 64
    const targetHeight = 36
    const scale = targetHeight / height
    mesh.scale.set(width * scale, height * scale, 1)
  })
  material.map = texture
  material.needsUpdate = true
  return { mesh, texture, material, geometry }
}

const createCrosshairSprite = () => {
  const geometry = new THREE.PlaneGeometry(1, 1)
  const material = new THREE.MeshBasicMaterial({
    transparent: true,
    depthTest: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
  const mesh = new THREE.Mesh(geometry, material)
  const texture = new THREE.TextureLoader().load(
    '/sprites/crosshair12864.png',
    (loaded) => {
      const width = loaded.image?.width || 128
      const height = loaded.image?.height || 64
      const targetHeight = 36
      const scale = targetHeight / height
      mesh.scale.set(width * scale, height * scale, 1)
    }
  )
  material.map = texture
  material.needsUpdate = true
  return { mesh, texture, material, geometry }
}

const createRangeReadoutSprite = () => {
  const geometry = new THREE.PlaneGeometry(1, 1)
  const material = new THREE.MeshBasicMaterial({
    transparent: true,
    depthTest: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
  const mesh = new THREE.Mesh(geometry, material)
  const texture = new THREE.TextureLoader().load('/sprites/30m12864.png', (loaded) => {
    const width = loaded.image?.width || 128
    const height = loaded.image?.height || 64
    const targetHeight = 36
    const scale = targetHeight / height
    mesh.scale.set(width * scale, height * scale, 1)
  })
  material.map = texture
  material.needsUpdate = true
  return { mesh, texture, material, geometry }
}

function Bow() {
  const mountRef = useRef(null)
  const screenDesignActionRef = useRef(() => {})
  const reverseScreenDesignActionRef = useRef(() => {})
  const autoRangeActionRef = useRef(() => {})
  const reverseAutoRangeActionRef = useRef(() => {})
  const pcbActionRef = useRef(() => {})
  const reversePcbActionRef = useRef(() => {})
  const backActionRef = useRef(() => {})
  const showSightCrosshairRef = useRef(() => {})
  const hideSightCrosshairRef = useRef(() => {})
  const [isLoading, setIsLoading] = useState(true)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [showBackButton, setShowBackButton] = useState(false)
  const [activePanel, setActivePanel] = useState(null)
  const menuItems = [
    'Screen Design',
    'Auto Range Detection',
    'PCB Board Layout',
  ]
  const menuButtonImages = {
    'Screen Design': '/sprites/SIghtButtonPic.png',
    'Auto Range Detection': '/sprites/RangeButtonPic.png',
    'PCB Board Layout': '/sprites/PCBButtonPic.png',
  }
  const screenDesignInfoImages = [
    {
      src: '/sprites/infopicsbow/RibbonPic.png',
      description:
        'The adjustable sight arm allows precise left-right alignment of the sight screen to match individual arrow flight for improved accuracy. An internal hollow channel routes the ribbon cable cleanly through the arm, connecting the screen to the driver board while keeping wiring protected and hidden. The design maintains a compact, streamlined profile without interfering with movement or visibility. A fully weather-sealed joint ensures smooth adjustment and reliable performance in rain, dust, and harsh outdoor conditions.',
    },
    {
      src: '/sprites/infopicsbow/OLEDPic.png',
      description:
        'The transparent OLED display overlays a dynamic sight directly onto the user’s view, automatically adjusting based on target distance for precise aiming. Its see-through design maintains full visibility of the target while providing crisp, high-contrast digital information. The screen can display real-time ranged distance data alongside the reticle for quick, informed adjustments. Integrated animations enhance usability with smooth visual feedback during power-on and shutdown states.',
    },
  ]

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    setIsLoading(true)
    setLoadingProgress(0)

    const scene = new THREE.Scene()
    const skyCanvas = document.createElement('canvas')
    skyCanvas.width = 2
    skyCanvas.height = 2
    const skyCtx = skyCanvas.getContext('2d')
    if (skyCtx) {
      const gradient = skyCtx.createLinearGradient(0, 0, 0, 2)
      gradient.addColorStop(0, SKY_TOP)
      gradient.addColorStop(1, SKY_BOTTOM)
      skyCtx.fillStyle = gradient
      skyCtx.fillRect(0, 0, 2, 2)
    }
    const skyTexture = new THREE.CanvasTexture(skyCanvas)
    skyTexture.colorSpace = THREE.SRGBColorSpace
    scene.background = skyTexture

    const camera = new THREE.PerspectiveCamera(
      CAMERA_INTRO_PRESET.fov,
      mount.clientWidth / mount.clientHeight,
      0.1,
      2000
    )
    camera.position.set(
      CAMERA_INTRO_PRESET.position.x,
      CAMERA_INTRO_PRESET.position.y,
      CAMERA_INTRO_PRESET.position.z
    )

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    mount.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.07
    controls.target.set(
      CAMERA_INTRO_PRESET.target.x,
      CAMERA_INTRO_PRESET.target.y,
      CAMERA_INTRO_PRESET.target.z
    )
    camera.rotation.set(
      CAMERA_INTRO_PRESET.rotation.x,
      CAMERA_INTRO_PRESET.rotation.y,
      CAMERA_INTRO_PRESET.rotation.z
    )
    camera.updateProjectionMatrix()
    controls.update()

    const introDurationMs = 1800
    let introStart = 0
    let introActive = false
    const startPosition = camera.position.clone()
    const startTarget = controls.target.clone()
    const endPosition = new THREE.Vector3(
      CAMERA_PRESET.position.x,
      CAMERA_PRESET.position.y,
      CAMERA_PRESET.position.z
    )
    const endTarget = new THREE.Vector3(
      CAMERA_PRESET.target.x,
      CAMERA_PRESET.target.y,
      CAMERA_PRESET.target.z
    )

    const formatCameraPreset = () => {
      const preset = {
        position: {
          x: Number(camera.position.x.toFixed(3)),
          y: Number(camera.position.y.toFixed(3)),
          z: Number(camera.position.z.toFixed(3)),
        },
        target: {
          x: Number(controls.target.x.toFixed(3)),
          y: Number(controls.target.y.toFixed(3)),
          z: Number(controls.target.z.toFixed(3)),
        },
        rotation: {
          x: Number(camera.rotation.x.toFixed(3)),
          y: Number(camera.rotation.y.toFixed(3)),
          z: Number(camera.rotation.z.toFixed(3)),
        },
        fov: Number(camera.fov.toFixed(3)),
      }
      return `const CAMERA_PRESET = ${JSON.stringify(preset, null, 2)}`
    }

    let logTimer = 0
    const logCameraPreset = () => {
      if (logTimer) window.clearTimeout(logTimer)
      logTimer = window.setTimeout(() => {
        console.log('[Bow Camera]', formatCameraPreset())
      }, 50)
    }

    const copyCameraPreset = async () => {
      const text = formatCameraPreset()
      try {
        await navigator.clipboard.writeText(text)
        console.log('[Bow Camera] Copied preset to clipboard')
      } catch {
        console.log('[Bow Camera] Clipboard unavailable, copy from log below')
        console.log('[Bow Camera]', text)
      }
    }

    const onKeyDown = (event) => {
      if (event.key.toLowerCase() === 'c') {
        copyCameraPreset()
      }
    }

    controls.addEventListener('change', logCameraPreset)
    window.addEventListener('keydown', onKeyDown)
    console.log('[Bow Camera]', formatCameraPreset())

    scene.add(new THREE.AmbientLight(0xffffff, 0.8))

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.15)
    keyLight.position.set(90, 120, 100)
    scene.add(keyLight)

    const fillLight = new THREE.DirectionalLight(0x88aaff, 0.45)
    fillLight.position.set(-110, 70, -90)
    scene.add(fillLight)

    const groundCanvas = document.createElement('canvas')
    groundCanvas.width = 4
    groundCanvas.height = 512
    const groundCtx = groundCanvas.getContext('2d')
    if (groundCtx) {
      const groundGradient = groundCtx.createLinearGradient(0, 0, 0, 512)
      groundGradient.addColorStop(0, '#6FCF7F')
      groundGradient.addColorStop(1, '#1F7F52')
      groundCtx.fillStyle = groundGradient
      groundCtx.fillRect(0, 0, 4, 512)
    }
    const groundTexture = new THREE.CanvasTexture(groundCanvas)
    groundTexture.colorSpace = THREE.SRGBColorSpace
    groundTexture.wrapS = THREE.ClampToEdgeWrapping
    groundTexture.wrapT = THREE.ClampToEdgeWrapping

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(2000, 2000),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: groundTexture,
        roughness: 0.92,
        metalness: 0.02,
      })
    )
    floor.rotation.x = -Math.PI / 2
    floor.position.y = -35
    scene.add(floor)

    const modelGroup = new THREE.Group()
    scene.add(modelGroup)

    const mtlLoader = new MTLLoader()
    const objLoader = new OBJLoader()
    mtlLoader.setPath(BOW_BASE_PATH)
    mtlLoader.setResourcePath(BOW_BASE_PATH)
    objLoader.setPath(BOW_BASE_PATH)

    const objList = BOW_OBJECT_FILES.map((fileName) => ({
      name: getBaseName(fileName),
      fileName: encodeFileName(fileName),
    }))
    const mtlMap = new Map(
      Array.from(BOW_MTL_FILES).map((fileName) => [
        getBaseName(fileName),
        encodeFileName(fileName),
      ])
    )
    const labelAssets = []
    const flyOffTargets = []
    const flyOffDurationMs = SCREEN_DESIGN_FLY.durationMs
    let flyOffStart = 0
    let flyOffActive = false
    const orbitDurationMs = 2600
    const orbitRadiusEndScale = 1.45
    const orbitSweepRadians = Math.PI * 2
    const orbitEndYLift = 15
    const orbitTargetEndYDrop = 4
    let orbitStart = 0
    let orbitActive = false
    let orbitPhase = 0
    let orbitPhaseFrom = 0
    let orbitPhaseTo = 1
    const orbitOffsetStart = new THREE.Vector3()
    const orbitCenter = new THREE.Vector3()
    const orbitPivot = new THREE.Vector3()
    const worldUp = new THREE.Vector3(0, 1, 0)
    const orbitEndPosition = new THREE.Vector3(
      CAMERA_SCREEN_END_PRESET.position.x,
      CAMERA_SCREEN_END_PRESET.position.y,
      CAMERA_SCREEN_END_PRESET.position.z
    )
    const orbitEndTarget = new THREE.Vector3(
      CAMERA_SCREEN_END_PRESET.target.x,
      CAMERA_SCREEN_END_PRESET.target.y,
      CAMERA_SCREEN_END_PRESET.target.z
    )
    const orbitPositionCorrection = new THREE.Vector3()
    const orbitTargetCorrection = new THREE.Vector3()
    const cameraMoveDurationMs = 3200
    const cameraMoveSpinTurns = 1.35
    let cameraMoveStart = 0
    let cameraMoveActive = false
    const cameraMoveStartPosition = new THREE.Vector3()
    const cameraMoveStartTarget = new THREE.Vector3()
    const cameraMoveEndPosition = new THREE.Vector3()
    const cameraMoveEndTarget = new THREE.Vector3()
    const cameraMoveReturnPosition = new THREE.Vector3()
    const cameraMoveReturnTarget = new THREE.Vector3()
    const cameraMoveSide = new THREE.Vector3()
    const cameraMoveUp = new THREE.Vector3(0, 1, 0)
    const cameraMoveControl1 = new THREE.Vector3()
    const cameraMoveControl2 = new THREE.Vector3()
    let cameraMoveDistance = 0
    const tempMovePosition = new THREE.Vector3()
    const tempMoveTarget = new THREE.Vector3()
    const bezierA = new THREE.Vector3()
    const bezierB = new THREE.Vector3()
    const bezierC = new THREE.Vector3()
    const bezierD = new THREE.Vector3()
    const bezierE = new THREE.Vector3()
    const bezierF = new THREE.Vector3()
    const travelDirection = new THREE.Vector3()
    const movePivot = new THREE.Vector3()
    const moveSpinSide = new THREE.Vector3()
    const moveSpinUp = new THREE.Vector3()
    const moveSpinOffset = new THREE.Vector3()
    const pcbGroupMoveDurationMs = cameraMoveDurationMs
    let pcbGroupMoveStart = 0
    let pcbGroupMoveActive = false
    const pcbGroupMoveEntries = []
    let hasOrbitCenter = false

    let disposed = false

    const loadAll = async () => {
      const loaded = []
      let loadedCount = 0
      const totalCount = objList.length || 1

      for (const entry of objList) {
        try {
          const mtlUrl = mtlMap.get(entry.name)
          if (mtlUrl) {
            const materials = await loadMaterials(mtlLoader, mtlUrl)
            materials.preload()
            objLoader.setMaterials(materials)
          } else {
            objLoader.setMaterials(null)
          }

          const object = await loadObject(objLoader, entry.fileName)
          object.name = entry.name
          loaded.push(object)
        } catch {
          // skip broken model and continue loading the rest
        } finally {
          loadedCount += 1
          if (!disposed) {
            setLoadingProgress(loadedCount / totalCount)
          }
        }
      }

      if (disposed) return

      loaded.forEach((object) => modelGroup.add(object))

      if (loaded.length) {
        const bounds = new THREE.Box3().setFromObject(modelGroup)
        const size = bounds.getSize(new THREE.Vector3())
        const center = bounds.getCenter(new THREE.Vector3())

        modelGroup.position.sub(center)
        modelGroup.position.y += size.y * 0.5 - 10

        const flyDistance = Math.max(size.x * 2.2, 260)
        loaded
          .filter((object) => !object.name.toLowerCase().includes('displaybay'))
          .forEach((object, index) => {
            const start = object.position.clone()
            const target = start.clone()
            flyOffTargets.push({
              object,
              start,
              target,
              origin: start.clone(),
              flyDistance:
                (flyDistance + index * 12) * SCREEN_DESIGN_FLY.distanceScale,
              yOffset: (index % 2 === 0 ? 1 : -1) * 6,
            })
          })

        const displayBay = loaded.find((object) =>
          object.name.toLowerCase().includes('displaybay')
        )
        pcbGroupMoveEntries.length = 0
        loaded.forEach((object) => {
          const moveConfig = PCB_MOVE_WITH_TOP[object.name]
          if (!moveConfig?.enabled) return
          pcbGroupMoveEntries.push({
            object,
            from: object.position.clone(),
            to: object.position.clone(),
            returnPosition: object.position.clone(),
            distance: moveConfig.distance,
            upOffset: moveConfig.upOffset,
          })
        })
        if (displayBay) {
          const label = createTextSprite()
          const textLabel = createDavisSprite()
          const crosshairLabel = createCrosshairSprite()
          const rangeReadoutLabel = createRangeReadoutSprite()
          let davisMesh = null
          let crosshairMesh = null
          let rangeReadoutMesh = null
          if (label) {
            const displayBounds = new THREE.Box3().setFromObject(displayBay)
            const displayCenter = displayBounds.getCenter(new THREE.Vector3())
            const displaySize = displayBounds.getSize(new THREE.Vector3())
            const cameraDir = new THREE.Vector3()
            const cameraRight = new THREE.Vector3()
            const cameraUp = new THREE.Vector3()
            camera.getWorldDirection(cameraDir)
            cameraRight.crossVectors(cameraDir, camera.up).normalize()
            cameraUp.copy(camera.up).normalize()
            orbitCenter.copy(displayCenter)
            hasOrbitCenter = true

            // Put text inside/near the cavity and pull it slightly toward camera.
            label.mesh.position
              .copy(displayCenter)
              .addScaledVector(cameraDir, 0)
            label.mesh.position.x -= 10
            label.mesh.position.y = DISPLAY_OVERLAY_PRESET.y
            label.mesh.position.y -= 3.4
            label.mesh.rotation.set(
              DISPLAY_OVERLAY_PRESET.rotation.x,
              DISPLAY_OVERLAY_PRESET.rotation.y,
              DISPLAY_OVERLAY_PRESET.rotation.z
            )
            label.mesh.renderOrder = 0
            scene.add(label.mesh)
            labelAssets.push(label)

            if (textLabel) {
              textLabel.mesh.position.copy(label.mesh.position)
              textLabel.mesh.position.addScaledVector(cameraDir, -0.6)
              textLabel.mesh.position.addScaledVector(cameraRight, 1.2)
              textLabel.mesh.rotation.copy(label.mesh.rotation)
              textLabel.mesh.renderOrder = 1
              scene.add(textLabel.mesh)
              labelAssets.push(textLabel)
              davisMesh = textLabel.mesh
            }

            if (crosshairLabel) {
              crosshairLabel.mesh.position.copy(label.mesh.position)
              crosshairLabel.mesh.position.addScaledVector(cameraDir, 0.15)
              crosshairLabel.mesh.position.addScaledVector(cameraRight, 1.2)
              crosshairLabel.mesh.rotation.copy(label.mesh.rotation)
              crosshairLabel.mesh.renderOrder = 2
              crosshairLabel.mesh.visible = false
              scene.add(crosshairLabel.mesh)
              labelAssets.push(crosshairLabel)
              crosshairMesh = crosshairLabel.mesh
            }

            if (rangeReadoutLabel) {
              rangeReadoutLabel.mesh.position.copy(label.mesh.position)
              rangeReadoutLabel.mesh.position.addScaledVector(cameraDir, 0.14)
              rangeReadoutLabel.mesh.position.addScaledVector(cameraRight, 1.2)
              rangeReadoutLabel.mesh.position.addScaledVector(cameraUp, -1)
              rangeReadoutLabel.mesh.rotation.copy(label.mesh.rotation)
              rangeReadoutLabel.mesh.renderOrder = 3
              rangeReadoutLabel.mesh.visible = false
              scene.add(rangeReadoutLabel.mesh)
              labelAssets.push(rangeReadoutLabel)
              rangeReadoutMesh = rangeReadoutLabel.mesh
            }
          }

          showSightCrosshairRef.current = () => {
            if (davisMesh) davisMesh.visible = false
            if (crosshairMesh) crosshairMesh.visible = true
            if (rangeReadoutMesh) rangeReadoutMesh.visible = true
          }
          hideSightCrosshairRef.current = () => {
            if (davisMesh) davisMesh.visible = true
            if (crosshairMesh) crosshairMesh.visible = false
            if (rangeReadoutMesh) rangeReadoutMesh.visible = false
          }
        }

        controls.update()
      }

      introStart = performance.now()
      introActive = true
      if (!disposed) {
        setLoadingProgress(1)
        setIsLoading(false)
      }
    }

    screenDesignActionRef.current = () => {
      if (!flyOffTargets.length) return
      const cameraDirection = new THREE.Vector3()
      const cameraRight = new THREE.Vector3()
      camera.getWorldDirection(cameraDirection)
      cameraRight.crossVectors(cameraDirection, camera.up).normalize()

      flyOffStart = performance.now()
      flyOffActive = true
      flyOffTargets.forEach((entry) => {
        entry.start.copy(entry.object.position)
        entry.target
          .copy(entry.origin)
          .addScaledVector(cameraRight, entry.flyDistance)
        entry.target.y += entry.yOffset
      })

      if (hasOrbitCenter) {
        orbitPivot.set(orbitCenter.x, controls.target.y, orbitCenter.z)
        orbitOffsetStart.copy(camera.position).sub(orbitPivot)
        if (orbitOffsetStart.lengthSq() > 0.0001) {
          const endOffset = orbitOffsetStart
            .clone()
            .applyAxisAngle(worldUp, -orbitSweepRadians)
          const baseEndPosition = new THREE.Vector3(
            orbitPivot.x + endOffset.x * orbitRadiusEndScale,
            orbitPivot.y + orbitOffsetStart.y + orbitEndYLift,
            orbitPivot.z + endOffset.z * orbitRadiusEndScale
          )
          const baseEndTarget = new THREE.Vector3(
            orbitPivot.x,
            orbitPivot.y - orbitTargetEndYDrop,
            orbitPivot.z
          )
          orbitPositionCorrection.copy(orbitEndPosition).sub(baseEndPosition)
          orbitTargetCorrection.copy(orbitEndTarget).sub(baseEndTarget)
          orbitPhaseFrom = orbitPhase
          orbitPhaseTo = 1
          orbitStart = performance.now()
          orbitActive = true
          introActive = false
        }
      }
    }

    reverseScreenDesignActionRef.current = () => {
      if (!flyOffTargets.length) return
      flyOffStart = performance.now()
      flyOffActive = true
      flyOffTargets.forEach((entry) => {
        entry.start.copy(entry.object.position)
        entry.target.copy(entry.origin)
      })
      orbitPhaseFrom = orbitPhase
      orbitPhaseTo = 0
      orbitStart = performance.now()
      orbitActive = true
      introActive = false
    }

    const startCreativeCameraMove = (endPosition, endTarget, storeReturn = false) => {
      if (storeReturn) {
        cameraMoveReturnPosition.copy(camera.position)
        cameraMoveReturnTarget.copy(controls.target)
      }
      cameraMoveStartPosition.copy(camera.position)
      cameraMoveStartTarget.copy(controls.target)
      cameraMoveEndPosition.copy(endPosition)
      cameraMoveEndTarget.copy(endTarget)
      travelDirection.copy(endPosition).sub(cameraMoveStartPosition)
      const moveDistance = travelDirection.length()
      cameraMoveDistance = moveDistance
      if (moveDistance > 0.0001) {
        travelDirection.normalize()
        cameraMoveSide.crossVectors(travelDirection, cameraMoveUp).normalize()
      } else {
        travelDirection.set(0, 0, -1)
        cameraMoveSide.set(1, 0, 0)
      }
      if (hasOrbitCenter) {
        movePivot.copy(orbitCenter)
      } else {
        movePivot.lerpVectors(cameraMoveStartTarget, cameraMoveEndTarget, 0.5)
      }

      const sideSign =
        cameraMoveSide.dot(movePivot.clone().sub(cameraMoveStartPosition)) >= 0
          ? -1
          : 1
      const sideAmount = moveDistance * 0.55 * sideSign
      const downAmount = Math.max(moveDistance * 0.34, 24)

      cameraMoveControl1
        .copy(cameraMoveStartPosition)
        .addScaledVector(cameraMoveSide, sideAmount * 0.7)
        .addScaledVector(cameraMoveUp, -downAmount)
      cameraMoveControl2
        .copy(cameraMoveEndPosition)
        .addScaledVector(cameraMoveSide, sideAmount)
        .addScaledVector(cameraMoveUp, -downAmount * 1.25)

      cameraMoveStart = performance.now()
      cameraMoveActive = true
      orbitActive = false
      introActive = false
    }

    const startPcbGroupMove = (forward) => {
      if (!pcbGroupMoveEntries.length) return
      const cameraDirection = new THREE.Vector3()
      const cameraRight = new THREE.Vector3()
      camera.getWorldDirection(cameraDirection)
      cameraRight.crossVectors(cameraDirection, camera.up).normalize()

      pcbGroupMoveEntries.forEach((entry) => {
        entry.from.copy(entry.object.position)
        if (forward) {
          entry.returnPosition.copy(entry.object.position)
          entry.to
            .copy(entry.returnPosition)
            .addScaledVector(cameraRight, entry.distance)
            .addScaledVector(camera.up, entry.upOffset)
        } else {
          entry.to.copy(entry.returnPosition)
        }
      })
      pcbGroupMoveStart = performance.now()
      pcbGroupMoveActive = true
    }

    autoRangeActionRef.current = () => {
      startCreativeCameraMove(
        new THREE.Vector3(
          CAMERA_AUTO_RANGE_PRESET.position.x,
          CAMERA_AUTO_RANGE_PRESET.position.y,
          CAMERA_AUTO_RANGE_PRESET.position.z
        ),
        new THREE.Vector3(
          CAMERA_AUTO_RANGE_PRESET.target.x,
          CAMERA_AUTO_RANGE_PRESET.target.y,
          CAMERA_AUTO_RANGE_PRESET.target.z
        ),
        true
      )
    }

    reverseAutoRangeActionRef.current = () => {
      startCreativeCameraMove(cameraMoveReturnPosition, cameraMoveReturnTarget, false)
    }

    pcbActionRef.current = () => {
      startPcbGroupMove(true)
      startCreativeCameraMove(
        new THREE.Vector3(
          CAMERA_PCB_PRESET.position.x,
          CAMERA_PCB_PRESET.position.y,
          CAMERA_PCB_PRESET.position.z
        ),
        new THREE.Vector3(
          CAMERA_PCB_PRESET.target.x,
          CAMERA_PCB_PRESET.target.y,
          CAMERA_PCB_PRESET.target.z
        ),
        true
      )
    }

    reversePcbActionRef.current = () => {
      startPcbGroupMove(false)
      startCreativeCameraMove(cameraMoveReturnPosition, cameraMoveReturnTarget, false)
    }

    loadAll()

    const onResize = () => {
      if (!mount) return
      camera.aspect = mount.clientWidth / mount.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(mount.clientWidth, mount.clientHeight)
    }

    window.addEventListener('resize', onResize)

    let frame = 0
    const animate = () => {
      frame = requestAnimationFrame(animate)
      if (introActive) {
        const elapsed = performance.now() - introStart
        const t = THREE.MathUtils.clamp(elapsed / introDurationMs, 0, 1)
        const eased = 1 - Math.pow(1 - t, 3)
        camera.position.lerpVectors(startPosition, endPosition, eased)
        controls.target.lerpVectors(startTarget, endTarget, eased)
      }
      if (flyOffActive) {
        const elapsed = performance.now() - flyOffStart
        const t = THREE.MathUtils.clamp(elapsed / flyOffDurationMs, 0, 1)
        const eased = 1 - Math.pow(1 - t, 3)
        flyOffTargets.forEach((entry) => {
          entry.object.position.lerpVectors(entry.start, entry.target, eased)
        })
        if (t >= 1) flyOffActive = false
      }
      if (orbitActive) {
        const elapsed = performance.now() - orbitStart
        const t = THREE.MathUtils.clamp(elapsed / orbitDurationMs, 0, 1)
        const eased = 1 - Math.pow(1 - t, 3)
        const phase = THREE.MathUtils.lerp(orbitPhaseFrom, orbitPhaseTo, eased)
        orbitPhase = phase
        const angle = -phase * orbitSweepRadians
        const rotatedOffset = orbitOffsetStart.clone().applyAxisAngle(worldUp, angle)
        const radiusScale = THREE.MathUtils.lerp(1, orbitRadiusEndScale, phase)
        const yLift = THREE.MathUtils.lerp(0, orbitEndYLift, phase)
        const targetYDrop = THREE.MathUtils.lerp(0, orbitTargetEndYDrop, phase)
        const orbitPosition = new THREE.Vector3(
          orbitPivot.x + rotatedOffset.x * radiusScale,
          orbitPivot.y + orbitOffsetStart.y + yLift,
          orbitPivot.z + rotatedOffset.z * radiusScale
        )
        const orbitTarget = new THREE.Vector3(
          orbitPivot.x,
          orbitPivot.y - targetYDrop,
          orbitPivot.z
        )
        camera.position
          .copy(orbitPosition)
          .addScaledVector(orbitPositionCorrection, phase)
        controls.target
          .copy(orbitTarget)
          .addScaledVector(orbitTargetCorrection, phase)
        if (t >= 1) {
          orbitPhase = orbitPhaseTo
          orbitActive = false
        }
      }
      if (cameraMoveActive) {
        const elapsed = performance.now() - cameraMoveStart
        const t = THREE.MathUtils.clamp(elapsed / cameraMoveDurationMs, 0, 1)
        const eased = 1 - Math.pow(1 - t, 3)

        // Cubic Bezier gives a long, rounded route that can dip under the model.
        bezierA.lerpVectors(cameraMoveStartPosition, cameraMoveControl1, eased)
        bezierB.lerpVectors(cameraMoveControl1, cameraMoveControl2, eased)
        bezierC.lerpVectors(cameraMoveControl2, cameraMoveEndPosition, eased)
        bezierD.lerpVectors(bezierA, bezierB, eased)
        bezierE.lerpVectors(bezierB, bezierC, eased)
        bezierF.lerpVectors(bezierD, bezierE, eased)
        tempMovePosition.copy(bezierF)

        const spinRadius = cameraMoveDistance * 0.085 * Math.sin(Math.PI * eased)
        const spinAngle = eased * Math.PI * 2 * cameraMoveSpinTurns
        moveSpinSide
          .copy(cameraMoveSide)
          .multiplyScalar(Math.cos(spinAngle) * spinRadius)
        moveSpinUp
          .copy(cameraMoveUp)
          .multiplyScalar(Math.sin(spinAngle) * spinRadius)
        moveSpinOffset.copy(moveSpinSide).add(moveSpinUp)
        tempMovePosition.add(moveSpinOffset)

        tempMoveTarget
          .lerpVectors(cameraMoveStartTarget, cameraMoveEndTarget, eased)
          .addScaledVector(cameraMoveUp, -Math.sin(Math.PI * eased) * 4.5)
          .addScaledVector(moveSpinOffset, 0.26)

        camera.position.copy(tempMovePosition)
        controls.target.copy(tempMoveTarget)
        if (t >= 1) {
          camera.position.copy(cameraMoveEndPosition)
          controls.target.copy(cameraMoveEndTarget)
          cameraMoveActive = false
        }
      }
      if (pcbGroupMoveActive) {
        const elapsed = performance.now() - pcbGroupMoveStart
        const t = THREE.MathUtils.clamp(elapsed / pcbGroupMoveDurationMs, 0, 1)
        const eased = 1 - Math.pow(1 - t, 3)
        pcbGroupMoveEntries.forEach((entry) => {
          entry.object.position.lerpVectors(entry.from, entry.to, eased)
        })
        if (t >= 1) pcbGroupMoveActive = false
      }
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      if (logTimer) window.clearTimeout(logTimer)
      controls.removeEventListener('change', logCameraPreset)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', onResize)
      controls.dispose()
      scene.traverse((child) => {
        if (!child.isMesh) return
        child.geometry?.dispose()
        if (Array.isArray(child.material)) {
          child.material.forEach((material) => material.dispose())
        } else {
          child.material?.dispose()
        }
      })
      labelAssets.forEach((entry) => {
        entry.geometry.dispose()
        entry.texture.dispose()
        entry.material.dispose()
      })

      skyTexture.dispose()
      groundTexture.dispose()
      renderer.dispose()
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement)
      }
      screenDesignActionRef.current = () => {}
      reverseScreenDesignActionRef.current = () => {}
      autoRangeActionRef.current = () => {}
      reverseAutoRangeActionRef.current = () => {}
      pcbActionRef.current = () => {}
      reversePcbActionRef.current = () => {}
      backActionRef.current = () => {}
      showSightCrosshairRef.current = () => {}
      hideSightCrosshairRef.current = () => {}
    }
  }, [])

  return (
    <main
      ref={mountRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100vh',
        background: '#0a0a0a',
      }}
    >
      <aside
        style={{
          position: 'absolute',
          left: '0',
          top: '0',
          bottom: '0',
          width: '33.333vw',
          zIndex: 40,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          pointerEvents: 'auto',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            flex: 1,
            minHeight: 0,
            position: 'relative',
            zIndex: 0,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.32)',
              borderRight: 'none',
              background: 'rgba(2, 6, 9, 0.9)',
              boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.1)',
              WebkitMaskImage:
                'linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 84%, rgba(0,0,0,0) 100%)',
              maskImage:
                'linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 84%, rgba(0,0,0,0) 100%)',
              pointerEvents: 'none',
              zIndex: 0,
            }}
          />
          <div
            style={{
              position: 'relative',
              zIndex: 1,
              height: '100%',
              padding: '12px 12px 28px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              overflowY: 'auto',
              overflowX: 'hidden',
            }}
          >
          <div
            style={{
              position: 'relative',
              zIndex: 1,
              width: '100%',
              minHeight: '260px',
            }}
          >
            <div
              style={{
                flexDirection: 'column',
                gap: '10px',
                display: showBackButton ? 'none' : 'flex',
              }}
            >
              {menuItems.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    if (item === 'Auto Range Detection') {
                      hideSightCrosshairRef.current()
                      autoRangeActionRef.current()
                      backActionRef.current = reverseAutoRangeActionRef.current
                      setActivePanel('auto')
                    } else if (item === 'Screen Design') {
                      screenDesignActionRef.current()
                      showSightCrosshairRef.current()
                      backActionRef.current = () => {
                        hideSightCrosshairRef.current()
                        reverseScreenDesignActionRef.current()
                      }
                      setActivePanel('screen')
                    } else if (item === 'PCB Board Layout') {
                      hideSightCrosshairRef.current()
                      pcbActionRef.current()
                      backActionRef.current = reversePcbActionRef.current
                      setActivePanel('pcb')
                    } else {
                      hideSightCrosshairRef.current()
                      screenDesignActionRef.current()
                      backActionRef.current = reverseScreenDesignActionRef.current
                      setActivePanel(null)
                    }
                    setShowBackButton(true)
                  }}
                  style={{
                    width: '94%',
                    padding: '10px 12px',
                    textAlign: 'center',
                    color: '#d7f7f7',
                    background: 'rgba(7, 18, 24, 0.62)',
                    border: '1px solid rgba(72, 78, 84, 0.9)',
                    borderRadius: '8px',
                    font: '600 14px/1.2 "Arial", sans-serif',
                    letterSpacing: '0.02em',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {menuButtonImages[item] ? (
                    <>
                      <img
                        src={menuButtonImages[item]}
                        alt={item}
                        style={{
                          display: 'block',
                          width: '100%',
                          height: 'auto',
                          imageRendering: 'pixelated',
                        }}
                      />
                      <span>{item}</span>
                    </>
                  ) : (
                    item
                  )}
                </button>
              ))}
            </div>
            <div
              style={{
                flexDirection: 'column',
                gap: '10px',
                display: showBackButton ? 'flex' : 'none',
              }}
            >
              {activePanel === 'screen' &&
                screenDesignInfoImages.map((entry) => (
                  <div
                    key={entry.src}
                    style={{
                      width: '94%',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    <img
                      src={entry.src}
                      alt="Screen design info"
                      style={{
                        display: 'block',
                        width: '100%',
                        height: 'auto',
                        borderRadius: '8px',
                        border: '1px solid rgba(72, 78, 84, 0.9)',
                      }}
                    />
                    {entry.description && (
                      <div
                        style={{
                          color: '#d7f7f7',
                          font: '400 13px/1.4 "Arial", sans-serif',
                          background: 'rgba(7, 18, 24, 0.62)',
                          border: '1px solid rgba(72, 78, 84, 0.9)',
                          borderRadius: '8px',
                          padding: '8px 10px',
                        }}
                      >
                        {entry.description}
                      </div>
                    )}
                  </div>
                ))}
              <button
                type="button"
                onClick={() => {
                  backActionRef.current()
                  setShowBackButton(false)
                  setActivePanel(null)
                }}
                style={{
                  width: '94%',
                  padding: '10px 12px',
                  textAlign: 'left',
                  color: '#d7f7f7',
                  background: 'rgba(7, 18, 24, 0.62)',
                  border: '1px solid rgba(72, 78, 84, 0.9)',
                  borderRadius: '8px',
                  font: '600 14px/1.2 "Arial", sans-serif',
                  letterSpacing: '0.02em',
                  cursor: 'pointer',
                }}
              >
                Back
              </button>
              <div
                aria-hidden="true"
                style={{
                  width: '94%',
                  height: '120px',
                  opacity: 0,
                  pointerEvents: 'none',
                  flexShrink: 0,
                }}
              />
            </div>
          </div>
          </div>
        </div>
      </aside>
      {isLoading && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(3, 9, 12, 0.68)',
            backdropFilter: 'blur(4px)',
            color: '#d7f7f7',
            font: '600 16px/1.2 "Arial", sans-serif',
            letterSpacing: '0.02em',
          }}
        >
          {`Loading scene... ${Math.round(loadingProgress * 100)}%`}
        </div>
      )}
    </main>
  )
}

export default Bow
