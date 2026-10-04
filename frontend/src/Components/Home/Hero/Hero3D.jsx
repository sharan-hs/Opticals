import React from "react";
import { Canvas } from "@react-three/fiber";
import { Bounds, OrbitControls } from "@react-three/drei";

import { Model } from "../../Model/Model";

// Loaded lazily by HeroSection so three.js stays out of the main bundle.
const Hero3D = ({ color, active, interactive, autoRotate }) => (
  <Canvas
    className="canvasModel"
    dpr={[1, 1.75]}
    frameloop={active ? "always" : "never"}
    camera={{ position: [0, 0.4, 6], fov: 40 }}
    gl={{ antialias: true, powerPreference: "low-power" }}
    // Without orbit controls, vertical swipes over the model scroll the page.
    style={interactive ? undefined : { touchAction: "pan-y" }}
  >
    <ambientLight intensity={0.5} />
    <directionalLight position={[10, 10, 5]} intensity={2.5} />
    <Bounds fit clip observe margin={1.15}>
      <Model color={color} autoRotate={autoRotate} />
    </Bounds>
    {interactive && (
      <OrbitControls
        makeDefault
        enableZoom={false}
        enablePan={false}
        minPolarAngle={Math.PI / 2}
        maxPolarAngle={Math.PI / 2}
      />
    )}
  </Canvas>
);

export default Hero3D;
