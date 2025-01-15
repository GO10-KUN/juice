import Head from "next/head";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, useTexture } from "@react-three/drei";
import { Geist, Geist_Mono } from "next/font/google";
import styles from "@/styles/Home.module.css";
import { Suspense, useState, useRef, useEffect } from "react";
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import { useLoader, useFrame } from '@react-three/fiber';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import gsap from 'gsap';
import * as THREE from 'three';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

function Lights() {
  return (
    <>
      {/* Brighter ambient light */}
      <ambientLight intensity={0.6} />
      
      {/* Brighter key light */}
      <directionalLight
        position={[5, 8, 3]}
        intensity={1.5}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      
      {/* Stronger fill light */}
      <pointLight position={[-5, 2, -5]} intensity={0.8} color="#ffffff" />
      
      {/* Additional front light for better visibility */}
      <pointLight position={[0, 2, 8]} intensity={0.8} color="#ffffff" />
      
      {/* Softer rim light */}
      <spotLight
        position={[0, 10, -10]}
        intensity={0.4}
        angle={0.6}
        penumbra={1}
        color="#ffffff"
      />
    </>
  );
}

function Wall() {
  return (
    <mesh 
      position={[0, 0, -5]} 
      receiveShadow
    >
      <planeGeometry args={[100, 50]} />
      <meshStandardMaterial 
        color="#f0f0f0"
        roughness={0.8}
        metalness={0.1}
      />
    </mesh>
  );
}

function Desk() {
  return (
    <mesh 
      position={[0, -6.75, -2]} 
      receiveShadow
      castShadow
    >
      <boxGeometry args={[40, 0.75, 20]} /> {/* width, height, depth */}
      <meshStandardMaterial 
        color="#8B4513"  // A wood-like brown color
        roughness={0.7}
        metalness={0.1}
      />
    </mesh>
  );
}

function MacModel() {
  const fbx = useLoader(FBXLoader, '/models/mac_classic.fbx');
  const colorTexture = useTexture('/textures/Mac.TriSurface_Color.png');

  fbx.traverse((child) => {
    if (child.isMesh) {
      child.material.map = colorTexture;
      child.material.needsUpdate = true;
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return (
    <primitive 
      object={fbx} 
      scale={0.01}
      position={[0, -1.4, 0]} // Adjusted to sit on the desk
    />
  );
}

function Disk({ onInserted }) {
  const obj = useLoader(OBJLoader, '/models/disk.obj');
  const diskTexture = useTexture('/textures/D.tga.png');
  const meshRef = useRef();
  const outlineRef = useRef();
  const [isClicked, setIsClicked] = useState(false);
  const bootSound = useRef(null);

  // Initialize sound
  useEffect(() => {
    bootSound.current = new Audio('/sounds/bootSound.mp3');
  }, []);

  // Create outline geometry from the original geometry
  useEffect(() => {
    if (obj && meshRef.current) {
      // Set initial rotation
      meshRef.current.rotation.y = Math.PI / 4;
      
      obj.traverse((child) => {
        if (child.isMesh) {
          // Create outline mesh with yellow color
          const outlineMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffa0,  // Subtle yellow color
            transparent: true,
            opacity: 0,
            side: THREE.BackSide
          });

          const outlineMesh = child.clone();
          outlineMesh.material = outlineMaterial;
          // Scale slightly larger to create outline effect
          outlineMesh.scale.multiplyScalar(1.05);
          
          outlineRef.current = outlineMesh;
          meshRef.current.add(outlineMesh);
        }

        // Original material setup
        if (child.isMesh) {
          child.material.map = diskTexture;
          child.material.needsUpdate = true;
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
    }
  }, [obj]);

  // Update outline based on cursor position
  const handlePointerMove = (event) => {
    if (outlineRef.current && !isClicked) {  // Only update when not animating
      const x = (event.clientX / window.innerWidth) * 2 - 1;
      const y = -(event.clientY / window.innerHeight) * 2 + 1;

      const distance = Math.sqrt(
        Math.pow(x - (meshRef.current.position.x / 10), 2) + 
        Math.pow(y - (meshRef.current.position.y / 10), 2)
      );

      const intensity = Math.max(0, 1 - distance);
      outlineRef.current.material.opacity = intensity * 0.8;
    }
  };

  useEffect(() => {
    window.addEventListener('mousemove', handlePointerMove);
    return () => window.removeEventListener('mousemove', handlePointerMove);
  }, [isClicked]);

  const handleClick = () => {
    if (!isClicked && meshRef.current) {
      setIsClicked(true);
      if (outlineRef.current) {
        outlineRef.current.material.opacity = 0.8;
      }
      
      gsap.timeline()
        .to(meshRef.current.rotation, {
          y: -Math.PI / 2,
          duration: 0.75,
          ease: "power1.out"
        }, 0)
        .to(meshRef.current.position, {
          y: meshRef.current.position.y + 2.75,
          duration: 0.75,
          ease: "power1.out"
        }, 0)
        .to(meshRef.current.position, {
          z: meshRef.current.position.z - 3.2,
          duration: 2.5,
          ease: "power2.out",
          onUpdate: function() {
            if (this.progress() > 0.75 && bootSound.current) {
              bootSound.current.play();
              this.onUpdate = null;
            }
          },
          onComplete: () => {
            setIsClicked(false);
            onInserted();
            
            if (meshRef.current) {
              gsap.to(meshRef.current.material, {
                opacity: 0,
                duration: 0.3
              });
            }
            if (outlineRef.current) {
              outlineRef.current.material.opacity = 0;
            }
          }
        }, 0);
    }
  };

  return (
    <primitive 
      ref={meshRef}
      object={obj} 
      scale={0.5}
      position={[1, -6.3, 6]}
      onClick={handleClick}
      onPointerOver={() => {
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'default';
      }}
    />
  );
}

export default function Home() {
  const [stage, setStage] = useState('mac'); // 'mac', 'loading', or 'computer'
  const progressRef = useRef(0);

  useEffect(() => {
    if (stage === 'loading') {
      const startTime = Date.now();
      const duration = 12500;
      let animationFrame;

      // Easing function for smooth acceleration and deceleration
      const easeInOutCubic = (x) => {
        return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
      };

      const updateProgress = () => {
        const elapsed = Date.now() - startTime;
        const rawProgress = Math.min(elapsed / duration, 1);
        // Apply easing to the raw progress
        const easedProgress = easeInOutCubic(rawProgress) * 100;
        
        const progressBar = document.getElementById('progress-bar');
        if (progressBar) {
          progressBar.style.width = `${easedProgress}%`;
        }

        if (rawProgress < 1) {
          animationFrame = requestAnimationFrame(updateProgress);
        } else {
          setStage('computer');
        }
      };

      animationFrame = requestAnimationFrame(updateProgress);
      
      return () => {
        if (animationFrame) {
          cancelAnimationFrame(animationFrame);
        }
      };
    }
  }, [stage]);

  if (stage === 'mac') {
    return (
      <>
        <Head>
          <title>Juice</title>
          <meta name="description" content="juice" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="icon" href="/favicon.ico" />
        </Head>
        <main className={styles.main}>
          <div style={{ width: "100vw", height: "100vh" }}>
            <Canvas 
              camera={{ 
                position: [0, -1.0, 17.5],
                fov: 70
              }}
              shadows
            >
              <color attach="background" args={['#ffffff']} />
              <Lights />
              <Suspense fallback={null}>
                <Wall />
                <Desk />
                <MacModel />
                <Disk onInserted={() => setStage('loading')} />
              </Suspense>
            </Canvas>
          </div>
        </main>
      </>
    );
  }

  if (stage === 'loading') {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: 'black',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '20px'
      }}>
        <div style={{ fontSize: '32px' }}>Juice</div>
        <div style={{
          width: '300px',
          height: '4px',
          backgroundColor: '#333',
          borderRadius: '2px'
        }}>
          <div 
            id="progress-bar"
            style={{
              width: '0%',
              height: '100%',
              backgroundColor: 'white',
              transition: 'width 0.1s linear',
              borderRadius: '2px'
            }}
          />
        </div>
      </div>
    );
  }

  // Computer view (final stage)
  return <p>Hello World</p>;
}
