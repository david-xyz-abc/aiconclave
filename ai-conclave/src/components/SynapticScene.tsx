import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import {
  Edges,
  Environment,
  Lightformer,
  Line,
  MeshTransmissionMaterial,
} from '@react-three/drei'
import {
  Bloom,
  EffectComposer,
  Noise,
  Vignette,
} from '@react-three/postprocessing'
import * as THREE from 'three'

type ProgressRef = { current: number }

const modulePositions: [number, number, number][] = [
  [-1.2, 1.25, 0.2],
  [-1.65, 0.3, 0.45],
  [-1.1, -1.15, 0.1],
  [-0.25, 1.72, -0.15],
  [0.72, 1.42, 0.12],
  [1.48, 0.72, 0.35],
  [1.42, -0.62, 0.1],
  [0.55, -1.48, 0.35],
  [-0.35, -1.68, -0.2],
]

function CoreInterior() {
  const filaments = useMemo(() => {
    return Array.from({ length: 22 }, (_, index) => {
      const angle = (index / 22) * Math.PI * 2
      const elevation = Math.sin(index * 1.71) * 0.46
      const radius = Math.sqrt(1 - elevation * elevation) * 0.58
      const edge = new THREE.Vector3(
        Math.cos(angle) * radius,
        elevation,
        Math.sin(angle) * radius,
      )
      const bend = edge
        .clone()
        .multiplyScalar(0.54)
        .add(
          new THREE.Vector3(
            Math.sin(index * 2.3) * 0.13,
            Math.cos(index * 1.4) * 0.11,
            Math.sin(index * 0.8) * 0.15,
          ),
        )
      return new THREE.QuadraticBezierCurve3(
        edge,
        bend,
        new THREE.Vector3(
          Math.sin(index) * 0.08,
          Math.cos(index * 1.7) * 0.08,
          Math.sin(index * 2.1) * 0.08,
        ),
      ).getPoints(20)
    })
  }, [])

  const sparks = useMemo(() => {
    const data = new Float32Array(130 * 3)
    for (let index = 0; index < 130; index += 1) {
      const radius = Math.cbrt((index * 0.61803398875) % 1) * 0.53
      const theta = index * 2.39996
      const phi = Math.acos(1 - 2 * ((index * 0.37) % 1))
      data[index * 3] = radius * Math.sin(phi) * Math.cos(theta)
      data[index * 3 + 1] = radius * Math.cos(phi)
      data[index * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta)
    }
    return data
  }, [])

  return (
    <group renderOrder={5}>
      {filaments.map((points, index) => (
        <Line
          key={index}
          points={points}
          color={index % 4 === 0 ? '#ffd0a9' : '#ff3b0b'}
          lineWidth={index % 4 === 0 ? 0.8 : 0.42}
          transparent
          opacity={index % 4 === 0 ? 0.95 : 0.64}
          depthTest={false}
        />
      ))}
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[sparks, 3]} />
        </bufferGeometry>
        <pointsMaterial
          color="#ffb17d"
          size={0.022}
          transparent
          opacity={0.88}
          depthWrite={false}
          depthTest={false}
          toneMapped={false}
        />
      </points>
      <mesh scale={0.1}>
        <icosahedronGeometry args={[0.72, 1]} />
        <meshBasicMaterial color="#ff2608" />
      </mesh>
    </group>
  )
}

const coreVertexShader = `
  varying vec3 vNormalView;
  varying vec3 vViewDirection;
  varying vec3 vPositionLocal;

  void main() {
    vPositionLocal = position;
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    vNormalView = normalize(normalMatrix * normal);
    vViewDirection = normalize(-viewPosition.xyz);
    gl_Position = projectionMatrix * viewPosition;
  }
`

const coreFragmentShader = `
  uniform float uTime;
  varying vec3 vNormalView;
  varying vec3 vViewDirection;
  varying vec3 vPositionLocal;

  float hash(vec3 p) {
    p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x),
          mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
      mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
          mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y),
      f.z
    );
  }

  void main() {
    vec3 p = vPositionLocal * 5.0;
    float broad = noise(p + vec3(0.0, uTime * 0.08, 0.0));
    float fine = noise(p * 2.35 - vec3(uTime * 0.04, 0.0, uTime * 0.06));
    float veinA = 1.0 - smoothstep(0.012, 0.038, abs(broad - 0.5));
    float veinB = 1.0 - smoothstep(0.009, 0.027, abs(fine - 0.52));
    float veins = clamp(veinA * 0.9 + veinB * 0.42, 0.0, 1.0);
    float fresnel = pow(1.0 - max(dot(vNormalView, vViewDirection), 0.0), 2.5);
    float pulse = 0.78 + sin(uTime * 1.25 + broad * 9.0) * 0.22;

    vec3 smoke = vec3(0.012, 0.004, 0.002);
    vec3 ember = vec3(1.0, 0.1, 0.01) * veins * pulse * 0.58;
    vec3 rim = vec3(1.0, 0.24, 0.06) * fresnel * 0.38;
    vec3 color = smoke + ember + rim;
    float alpha = 0.96 + fresnel * 0.03 + veins * 0.01;
    gl_FragColor = vec4(color, alpha);
  }
`

function NeuralCoreShell() {
  const material = useRef<THREE.ShaderMaterial>(null)

  useFrame(({ clock }) => {
    if (material.current) {
      material.current.uniforms.uTime.value = clock.elapsedTime
    }
  })

  return (
    <mesh castShadow scale={1.08} renderOrder={2}>
      <dodecahedronGeometry args={[0.72, 2]} />
      <shaderMaterial
        ref={material}
        vertexShader={coreVertexShader}
        fragmentShader={coreFragmentShader}
        uniforms={{ uTime: { value: 0 } }}
        transparent
        depthWrite
        blending={THREE.NormalBlending}
      />
      <Edges color="#ff7136" threshold={18} />
    </mesh>
  )
}

function makeBladeGeometry() {
  const shape = new THREE.Shape()
  shape.moveTo(0, -2.25)
  shape.bezierCurveTo(-0.45, -1.4, -0.72, 0.8, -0.16, 2.25)
  shape.bezierCurveTo(0.48, 1.45, 0.72, -0.75, 0, -2.25)
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.22,
    steps: 2,
    bevelEnabled: true,
    bevelThickness: 0.09,
    bevelSize: 0.08,
    bevelSegments: 5,
  })
  geometry.center()
  geometry.computeVertexNormals()
  return geometry
}

function NeuralConnection({
  end,
  index,
  active,
}: {
  end: [number, number, number]
  index: number
  active: number
}) {
  const pulse = useRef<THREE.Mesh>(null)
  const curve = useMemo(() => {
    const endpoint = new THREE.Vector3(...end)
    const midpoint = endpoint
      .clone()
      .multiplyScalar(0.54)
      .add(new THREE.Vector3(0, Math.sin(index * 2.1) * 0.24, 0.4))
    return new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(0, 0, 0),
      midpoint,
      endpoint,
    )
  }, [end, index])
  const points = useMemo(() => curve.getPoints(32), [curve])

  useFrame(({ clock }) => {
    if (!pulse.current) return
    const t =
      (clock.elapsedTime * (0.16 + index * 0.006) + index * 0.12) % 1
    pulse.current.position.copy(curve.getPoint(t))
    pulse.current.scale.setScalar(0.55 + active * 0.45)
  })

  return (
    <group>
      <Line
        points={points}
        color="#ff4a15"
        lineWidth={0.65}
        transparent
        opacity={0.52 + active * 0.38}
      />
      <mesh ref={pulse}>
        <sphereGeometry args={[0.035, 12, 12]} />
        <meshBasicMaterial color="#ff6b2b" toneMapped={false} />
      </mesh>
    </group>
  )
}

function AutomationModule({
  position,
  index,
  progress,
}: {
  position: [number, number, number]
  index: number
  progress: ProgressRef
}) {
  const group = useRef<THREE.Group>(null)
  const origin = useMemo(() => new THREE.Vector3(...position), [position])

  useFrame(({ clock }, delta) => {
    if (!group.current) return
    const spread = THREE.MathUtils.smoothstep(progress.current, 0.14, 0.66)
    const target = origin.clone().multiplyScalar(1 + spread * 0.22)
    group.current.position.lerp(target, 1 - Math.exp(-delta * 3.5))
    group.current.rotation.x += delta * (0.08 + index * 0.004)
    group.current.rotation.y += delta * (0.12 + index * 0.005)
    group.current.position.y +=
      Math.sin(clock.elapsedTime * 0.65 + index) * 0.0007
  })

  return (
    <group ref={group} position={position}>
      <mesh castShadow rotation={[0.22, 0.35, 0.08]}>
        <boxGeometry args={[0.3, 0.25, 0.28]} />
        <meshStandardMaterial
          color="#0d0b0a"
          metalness={0.92}
          roughness={0.16}
          emissive="#6b1708"
          emissiveIntensity={0.38}
        />
        <Edges color="#ff5b22" threshold={18} />
      </mesh>
      <mesh position={[0, 0.17, 0]} rotation={[0.22, 0.35, 0.08]}>
        <boxGeometry args={[0.23, 0.055, 0.21]} />
        <meshBasicMaterial color="#ff4a15" toneMapped={false} />
      </mesh>
      <mesh position={[0, -0.17, 0]} rotation={[0.22, 0.35, 0.08]}>
        <boxGeometry args={[0.23, 0.04, 0.21]} />
        <meshBasicMaterial color="#a91d08" toneMapped={false} />
      </mesh>
    </group>
  )
}

function ObsidianFragments({ progress }: { progress: ProgressRef }) {
  const fragments = useMemo(
    () =>
      Array.from({ length: 14 }, (_, index) => ({
        position: new THREE.Vector3(
          (Math.sin(index * 9.31) * 0.5 + 0.5) * 8 - 4,
          (Math.sin(index * 4.17 + 1) * 0.5 + 0.5) * 6 - 3,
          -1.5 + (index % 5) * 0.9,
        ),
        scale: 0.08 + (index % 4) * 0.055,
        speed: 0.12 + (index % 5) * 0.025,
        rotation: new THREE.Euler(index, index * 0.7, index * 0.3),
      })),
    [],
  )

  return (
    <group>
      {fragments.map((fragment, index) => (
        <Fragment
          key={index}
          {...fragment}
          index={index}
          progress={progress}
        />
      ))}
    </group>
  )
}

function Fragment({
  position,
  scale,
  speed,
  rotation,
  index,
  progress,
}: {
  position: THREE.Vector3
  scale: number
  speed: number
  rotation: THREE.Euler
  index: number
  progress: ProgressRef
}) {
  const mesh = useRef<THREE.Mesh>(null)

  useFrame(({ clock, pointer }, delta) => {
    if (!mesh.current) return
    mesh.current.rotation.x += delta * speed
    mesh.current.rotation.y += delta * speed * 1.35
    mesh.current.position.y =
      position.y + Math.sin(clock.elapsedTime * speed * 2 + index) * 0.18
    mesh.current.position.x =
      position.x + pointer.x * (0.05 + Math.abs(position.z) * 0.018)
    mesh.current.position.z =
      position.z + progress.current * ((index % 3) - 1) * 1.1
  })

  return (
    <mesh
      ref={mesh}
      position={position}
      rotation={rotation}
      scale={scale}
      castShadow
    >
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial
        color="#090807"
        roughness={0.26}
        metalness={0.78}
        emissive="#521204"
        emissiveIntensity={0.18}
      />
    </mesh>
  )
}

function EmberField() {
  const points = useRef<THREE.Points>(null)
  const positions = useMemo(() => {
    const data = new Float32Array(540 * 3)
    for (let index = 0; index < 540; index += 1) {
      data[index * 3] = (Math.random() - 0.5) * 12
      data[index * 3 + 1] = (Math.random() - 0.5) * 8
      data[index * 3 + 2] = (Math.random() - 0.5) * 8
    }
    return data
  }, [])

  useFrame((_, delta) => {
    if (points.current) points.current.rotation.y += delta * 0.012
  })

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#ff4b16"
        size={0.018}
        transparent
        opacity={0.42}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  )
}

function CoreAssembly({ progress }: { progress: ProgressRef }) {
  const root = useRef<THREE.Group>(null)
  const blackBlade = useRef<THREE.Mesh>(null)
  const ivoryBlade = useRef<THREE.Mesh>(null)
  const core = useRef<THREE.Group>(null)
  const glassRibbon = useRef<THREE.Group>(null)
  const bladeGeometry = useMemo(() => makeBladeGeometry(), [])
  const { viewport } = useThree()
  const isCompact = viewport.width < 7.6

  const ribbonCurves = useMemo(() => {
    return [0, 1, 2].map((index) => {
      const offset = (index - 1) * 0.11
      return new THREE.CatmullRomCurve3(
        [
          new THREE.Vector3(-2.25, -1.15 + offset, 0.25),
          new THREE.Vector3(-1.45, -1.9 + offset, 0.7),
          new THREE.Vector3(0.25, -1.65 + offset, 0.9),
          new THREE.Vector3(1.75, -0.65 + offset, 0.45),
          new THREE.Vector3(1.1, 0.3 + offset, 0.05),
          new THREE.Vector3(-0.65, 0.6 + offset, -0.3),
        ],
        false,
        'catmullrom',
        0.58,
      )
    })
  }, [])

  useFrame(({ clock, pointer }, delta) => {
    if (
      !root.current ||
      !blackBlade.current ||
      !ivoryBlade.current ||
      !core.current
    )
      return

    const p = progress.current
    const open = THREE.MathUtils.smoothstep(p, 0.08, 0.52)
    const settle = THREE.MathUtils.smoothstep(p, 0.58, 0.95)
    const targetX = isCompact ? 0 : 1.42 - settle * 1.25
    const targetY = isCompact
      ? -0.82 + p * 0.6
      : -0.02 + Math.sin(p * Math.PI) * 0.12
    const targetScale = isCompact
      ? 0.7
      : 0.94 + Math.sin(p * Math.PI) * 0.08

    root.current.position.x = THREE.MathUtils.damp(
      root.current.position.x,
      targetX + pointer.x * 0.16,
      3.2,
      delta,
    )
    root.current.position.y = THREE.MathUtils.damp(
      root.current.position.y,
      targetY + pointer.y * 0.08,
      3.2,
      delta,
    )
    root.current.rotation.y = THREE.MathUtils.damp(
      root.current.rotation.y,
      -0.22 + p * 1.55 + pointer.x * 0.12,
      3.1,
      delta,
    )
    root.current.rotation.x = THREE.MathUtils.damp(
      root.current.rotation.x,
      0.04 - p * 0.22 - pointer.y * 0.06,
      3.1,
      delta,
    )
    root.current.scale.setScalar(
      THREE.MathUtils.damp(root.current.scale.x, targetScale, 3, delta),
    )

    blackBlade.current.position.x = THREE.MathUtils.damp(
      blackBlade.current.position.x,
      -0.72 - open * 0.42,
      3.4,
      delta,
    )
    blackBlade.current.rotation.z = THREE.MathUtils.damp(
      blackBlade.current.rotation.z,
      0.34 + open * 0.17,
      3.4,
      delta,
    )
    ivoryBlade.current.position.x = THREE.MathUtils.damp(
      ivoryBlade.current.position.x,
      0.82 + open * 0.46,
      3.4,
      delta,
    )
    ivoryBlade.current.rotation.z = THREE.MathUtils.damp(
      ivoryBlade.current.rotation.z,
      -0.34 - open * 0.15,
      3.4,
      delta,
    )
    core.current.rotation.y += delta * (0.12 + p * 0.2)
    core.current.rotation.z = Math.sin(clock.elapsedTime * 0.24) * 0.035
    if (glassRibbon.current) glassRibbon.current.rotation.y -= delta * 0.045
  })

  return (
    <group ref={root} position={[1.4, 0, 0]}>
      <mesh
        ref={blackBlade}
        geometry={bladeGeometry}
        position={[-0.72, 0.15, -0.18]}
        rotation={[0.08, -0.2, 0.34]}
        castShadow
      >
        <meshStandardMaterial
          color="#0b0a09"
          roughness={0.2}
          metalness={0.86}
          emissive="#3e0b03"
          emissiveIntensity={0.16}
        />
        <Edges color="#873018" threshold={22} />
        {Array.from({ length: 6 }, (_, index) => (
          <mesh
            key={index}
            geometry={bladeGeometry}
            position={[0.025 * index, -0.018 * index, -0.11 - index * 0.055]}
            scale={[1 - index * 0.022, 1 - index * 0.015, 1]}
          >
            <meshStandardMaterial
              color={index % 2 === 0 ? '#16110f' : '#080706'}
              roughness={0.25}
              metalness={0.78}
            />
            <Edges color="#4d1a0d" threshold={25} />
          </mesh>
        ))}
      </mesh>

      <mesh
        ref={ivoryBlade}
        geometry={bladeGeometry}
        position={[0.82, 0.04, -0.04]}
        rotation={[-0.05, 0.25, -0.34]}
        castShadow
      >
        <meshStandardMaterial
          color="#eadfce"
          roughness={0.4}
          metalness={0.04}
          emissive="#6d2b16"
          emissiveIntensity={0.08}
        />
        <Edges color="#ffb188" threshold={24} />
        {Array.from({ length: 10 }, (_, index) => (
          <mesh
            key={index}
            geometry={bladeGeometry}
            position={[-0.022 * index, -0.014 * index, -0.1 - index * 0.065]}
            scale={[1 - index * 0.026, 1 - index * 0.012, 1]}
          >
            <meshStandardMaterial
              color={index % 3 === 0 ? '#fff2df' : '#cdbca7'}
              roughness={0.5}
              metalness={0.02}
            />
            <Edges color="#9d7560" threshold={22} />
          </mesh>
        ))}
      </mesh>

      <group ref={glassRibbon}>
        {ribbonCurves.map((curve, index) => (
          <mesh key={index}>
            <tubeGeometry
              args={[curve, 96, 0.095 - index * 0.018, 10, false]}
            />
            <MeshTransmissionMaterial
              color={index === 1 ? '#ff531d' : '#b51d08'}
              transmission={0.68}
              thickness={0.7}
              roughness={0.12}
              chromaticAberration={0.08}
              anisotropy={0.35}
              distortion={0.12}
              distortionScale={0.15}
              temporalDistortion={0.08}
              samples={4}
            />
          </mesh>
        ))}
      </group>

      <group ref={core}>
        <NeuralCoreShell />
        <mesh scale={0.82} rotation={[0.4, 0.2, -0.16]}>
          <dodecahedronGeometry args={[0.72, 1]} />
          <meshStandardMaterial
            color="#120504"
            emissive="#c72408"
            emissiveIntensity={0.32}
            roughness={0.25}
            metalness={0.72}
            wireframe
            transparent
            opacity={0.2}
          />
        </mesh>
        <CoreInterior />
        <pointLight
          color="#ff3d0b"
          intensity={11}
          distance={5.2}
          decay={2}
        />

        {modulePositions.map((position, index) => (
          <NeuralConnection
            key={`line-${index}`}
            end={position}
            index={index}
            active={Math.sin(index * 1.7) * 0.2 + 0.8}
          />
        ))}
        {modulePositions.map((position, index) => (
          <AutomationModule
            key={`module-${index}`}
            position={position}
            index={index}
            progress={progress}
          />
        ))}
      </group>
    </group>
  )
}

export function SynapticScene({ progress }: { progress: ProgressRef }) {
  return (
    <>
      <color attach="background" args={['#050403']} />
      <fog attach="fog" args={['#050403', 8, 22]} />
      <ambientLight intensity={0.24} color="#ffb28c" />
      <directionalLight
        position={[4, 5, 5]}
        intensity={3.4}
        color="#fff0df"
        castShadow
      />
      <spotLight
        position={[-4, -1, 5]}
        intensity={90}
        angle={0.48}
        penumbra={0.8}
        color="#ff3b0a"
      />

      <CoreAssembly progress={progress} />
      <ObsidianFragments progress={progress} />
      <EmberField />

      <Environment resolution={128}>
        <Lightformer
          intensity={4}
          color="#ff4b17"
          position={[-4, 0, 3]}
          scale={[3, 7, 1]}
        />
        <Lightformer
          intensity={2}
          color="#fff0df"
          position={[4, 4, 2]}
          scale={[4, 2, 1]}
        />
        <Lightformer
          intensity={1.5}
          color="#8b1305"
          position={[0, -4, 2]}
          scale={[7, 2, 1]}
        />
      </Environment>

      <EffectComposer multisampling={0}>
        <Bloom
          intensity={1.15}
          luminanceThreshold={0.78}
          luminanceSmoothing={0.4}
          mipmapBlur
        />
        <Noise opacity={0.025} />
        <Vignette eskil={false} offset={0.18} darkness={0.72} />
      </EffectComposer>
    </>
  )
}
