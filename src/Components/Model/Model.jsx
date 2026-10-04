import React, { useEffect, useMemo, useRef } from "react";
import { Center, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";

export const MODEL_URL = "/models/glasses.glb";

// Frame parts; the translucent "glass" lenses keep their own colour.
const FRAME_MATERIALS = ["Material.001", "glass.001"];

const ROTATION_SPEED = 0.6; // radians per second

export function Model({ color, autoRotate = true }) {
  const { scene } = useGLTF(MODEL_URL);
  const rotatingRef = useRef();

  // Own copy of the scene and materials, so tinting never leaks into the
  // shared useGLTF cache.
  const model = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((object) => {
      if (object.isMesh) object.material = object.material.clone();
    });
    return clone;
  }, [scene]);

  useEffect(() => {
    if (!color) return;
    model.traverse((object) => {
      if (object.isMesh && FRAME_MATERIALS.includes(object.material.name)) {
        object.material.color.set(color);
      }
    });
  }, [model, color]);

  useFrame((_, delta) => {
    if (autoRotate && rotatingRef.current) {
      rotatingRef.current.rotation.y += delta * ROTATION_SPEED;
    }
  });

  return (
    <group ref={rotatingRef}>
      <Center>
        <primitive object={model} />
      </Center>
    </group>
  );
}

// This module is only loaded with the lazy hero chunk, so the model is
// fetched on the home page only.
useGLTF.preload(MODEL_URL);
