import React, { useRef, useEffect, useState } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";

export function Model({ color, ...props }) {
  const { nodes, materials } = useGLTF("/scene.gltf");
  const modelRef = useRef();

  const [scale, setScale] = useState([1, 1, 1]);
  const [position, setPosition] = useState([0, 0, 0]);

  // Responsive scale and position
  useEffect(() => {
    function updateScale() {
      const width = window.innerWidth;
      if (width < 600) {
        setScale([1, 1, 1]);
        setPosition([0, -1, 0]);
      } else if (width >= 600 && width < 1200) {
        setScale([1, 1, 1]);
        setPosition([0, -0.5, 0]);
      } else {
        setScale([1, 1, 1]);
        setPosition([0, 0, 0]);
      }
    }

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  // Rotate the model
  useFrame(() => {
    if (modelRef.current) {
      modelRef.current.rotation.y += 0.01;
    }
  });

  // Apply color to materials
  useEffect(() => {
    if (!color) return;
    Object.values(materials).forEach((material) => {
      if (material?.color) {
        material.color.set(color);
      }
    });
  }, [color, materials]);

  return (
    <group {...props} dispose={null}>
      <group ref={modelRef} scale={scale} position={position}>
        <group
          position={[1, 1.2, 0.9]}
          rotation={[-Math.PI / 2, 0, -Math.PI / 2]}
        >
          <group rotation={[Math.PI / 2, 0, 0]}>
            <group
              position={[-0.058, 0.874, -0.024]}
              rotation={[Math.PI / 2, 0, 0]}
              scale={0.073}
            >
              <mesh
                castShadow
                receiveShadow
                geometry={nodes.Object_6.geometry}
                material={materials.glass}
              />
              <mesh
                castShadow
                receiveShadow
                geometry={nodes.Object_7.geometry}
                material={materials.glass}
              />
            </group>
            <mesh
              castShadow
              receiveShadow
              geometry={nodes.Object_4.geometry}
              material={materials["Material.001"]}
              position={[-0.071, 0.866, 0]}
              rotation={[Math.PI / 2, 0, 0]}
              scale={0.071}
            />
            <mesh
              castShadow
              receiveShadow
              geometry={nodes.Object_9.geometry}
              material={materials["glass.001"]}
              position={[1.42, 0.902, -0.003]}
              rotation={[0, 0, -Math.PI / 2]}
              scale={0.043}
            />
          </group>
        </group>
      </group>
    </group>
  );
}

useGLTF.preload("/scene.gltf");
