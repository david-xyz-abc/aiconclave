import { Canvas } from '@react-three/fiber'
import { SynapticScene } from './SynapticScene'

type ProgressRef = { current: number }

export default function WebGLStage({ progress }: { progress: ProgressRef }) {
  return (
    <Canvas
      dpr={[1, 1.7]}
      camera={{ position: [0, 0.15, 8.8], fov: 38, near: 0.1, far: 80 }}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      }}
    >
      <SynapticScene progress={progress} />
    </Canvas>
  )
}
