"use client";

import { useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
interface CharacterProps {
  modelPath: string;
  animationName?: string;
  isLookingDown?: boolean;
}

function Character({ modelPath, animationName = 'idle', isLookingDown = false }: CharacterProps) {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(modelPath, true);
  const { actions } = useAnimations(animations, group);

  // Ajout du suivi de la souris
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (group.current) {
        // Calculer la position relative de la souris par rapport au centre de l'écran
        const mouseX = (event.clientX - window.innerWidth / 2) / window.innerWidth;
        const mouseY = (event.clientY - window.innerHeight / 2) / window.innerHeight;

        // Limiter la rotation
        const maxRotation = 1;
        gsap.to(group.current.rotation, {
          y: mouseX * maxRotation,
          x: mouseY * maxRotation + 0.5,
          duration: 0.5,
          ease: 'power2.out',
          overwrite: true

        });
      }
    };

    // N'ajouter l'écouteur que sur les appareils de bureau
    if (window.matchMedia('(pointer: fine)').matches) {
      window.addEventListener('mousemove', handleMouseMove);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  // Animation de rotation
  useEffect(() => {
    if (group.current) {
      const targetRotation = isLookingDown ? Math.PI / 5 : 0;
      gsap.to(group.current.rotation, {
        x: targetRotation,
        duration: 0.5,
        ease: 'power2.inOut'
      });
    }
  }, [isLookingDown]);


  useEffect(() => {
    console.log('Animations disponibles:', Object.keys(actions));

    Object.values(actions).forEach(action => {
      if (action) {
        action.fadeOut(0.5);
      }
    });

    const targetAction = actions[animationName];
    if (targetAction) {
      if (animationName === 'CharacterArmature|Death') {
        targetAction.reset()
          .fadeIn(0.5)
          .play()
          .setLoop(THREE.LoopOnce, 1);
        targetAction.clampWhenFinished = true;
      } else if (animationName === 'CharacterArmature|Idle') {
        targetAction.reset()
          .fadeIn(0.5)
          .play();
        targetAction.timeScale = 0.5;
      } else {
        targetAction.reset()
          .fadeIn(0.5)
          .play();
      }
    }

    return () => {
      Object.values(actions).forEach(action => {
        if (action) {
          action.fadeOut(0.5);
        }
      });
    };
  }, [actions, animationName]);

  // Nettoyage uniquement lors du démontage complet
  useEffect(() => {
    return () => {
      if (group.current) {
        group.current.clear();
      }
    };
  }, []);

  return <mesh ref={group}>
    <primitive object={scene} position={[0, -0.7, 0]} scale={2} />
  </mesh>;
}

interface AvatarModelProps {
  className?: string;
  modelPath: string;
  animationName?: string;
  isLookingDown?: boolean;
}

export default function AvatarModel({ 
  className, 
  modelPath, 
  animationName = 'idle',
  isLookingDown = false
}: AvatarModelProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef} className={className}>
      <Canvas
        camera={{ position: [0, 0, 4], fov: 50 }}
        style={{ background: 'transparent' }}
        gl={{ 
          alpha: true,
          antialias: true,
          powerPreference: "default",
        }}
        // dpr={window.devicePixelRatio}
      >
        <ambientLight intensity={1} />
        <directionalLight position={[5, 5, 5]} intensity={5} />
        <Character 
          modelPath={modelPath} 
          animationName={animationName}
          isLookingDown={isLookingDown} 
        />
      </Canvas>
    </div>
  );
}

useGLTF.preload('/robot.glb');