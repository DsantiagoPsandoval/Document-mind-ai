/**
 * DOCUMENT-MIND AI — 3D COMPUTATIONAL AI CORE ENGINE
 * Three.js + WebGL Architecture (Responsive Mobile-First Edition v4.3)
 * Hierarchical Scene Graph:
 * scene
 * ├── environmentGroup (Physical Lights, Ambient 3D Cosmic Particles)
 * ├── coreSystem (Multi-Layer Reactor, Physical Metallic Glass Shell, 3 Torus Gimbals, Nano Particles)
 * ├── orbitSystem (4 Tilted Torus 3D Orbits with Travelling Satellite Meshes)
 * ├── nodeSystem (7 Faceted 3D Crystal Nodes: CODE, AST, DOCS, C4, API, DATABASE, SYNC)
 * ├── connectionSystem (3D Connection Lines & Flowing Data Packets with Ingestion/Generation Flow)
 * └── interactionSystem (Raycaster, Parallax, Touch/Tap Support, Boundary Tooltips, State Machine, HUD)
 */

(function() {
    'use strict';

    // Verify Three.js availability
    if (typeof THREE === 'undefined') {
        console.error('[DocuMind AI Core 3D] Three.js is required but not loaded.');
        return;
    }

    var canvas = document.getElementById('ai-core-canvas');
    var wrapper = document.getElementById('ai-core-wrapper');
    if (!canvas || !wrapper) {
        return;
    }

    // Palette Constants (Official WCAG-Compliant Identity)
    var PALETTE = {
        midnight: 0x090D16,
        deepSlate: 0x0F172A,
        techCyan: 0x38BDF8,
        emerald: 0x34D399,
        indigo: 0x818CF8,
        white: 0xF8FAFC,
        textMuted: 0x94A3B8
    };

    // Global App State
    var AICoreApp = {
        isPaused: false,
        performanceMode: false,
        isTouchDevice: false,
        currentStageIndex: 0,
        stageTimer: 0,
        hoveredNodeIndex: -1,
        selectedNodeData: null
    };

    // Detect touch and reduced motion
    if (('ontouchstart' in window) || (navigator.maxTouchPoints > 0)) {
        AICoreApp.isTouchDevice = true;
    }
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        AICoreApp.performanceMode = true;
    }

    // Stages / State Machine
    var STAGES = [
        { id: 'ANALYZING', label: 'ANALYZING REPOSITORY', color: '#38BDF8', hex: PALETTE.techCyan, active: ['code'] },
        { id: 'BUILDING_AST', label: 'BUILDING AST', color: '#818CF8', hex: PALETTE.indigo, active: ['ast'] },
        { id: 'MAPPING_ARCH', label: 'MAPPING ARCHITECTURE', color: '#818CF8', hex: PALETTE.indigo, active: ['c4', 'api', 'db'] },
        { id: 'GENERATING_DOCS', label: 'GENERATING DOCUMENTATION', color: '#38BDF8', hex: PALETTE.techCyan, active: ['docs'] },
        { id: 'SYNC_COMPLETE', label: 'SYNC COMPLETE', color: '#34D399', hex: PALETTE.emerald, active: ['sync'] }
    ];

    // Deliberate Spatial 3D Composition
    var NODES_DATA = [
        {
            id: 'code',
            tag: 'CODE',
            title: 'Source Code Ingestion',
            desc: 'Ingestión y análisis estático del árbol de directorios y archivos fuente sin compilar.',
            color: '#38BDF8',
            hex: PALETTE.techCyan,
            pos: [-5.2, 0.3, 0.8],
            flow: 'in',
            phase: 0.2
        },
        {
            id: 'ast',
            tag: 'AST',
            title: 'Abstract Syntax Tree',
            desc: 'Representación estructural del código utilizada para comprender clases, funciones, variables y relaciones.',
            color: '#818CF8',
            hex: PALETTE.indigo,
            pos: [-3.6, 3.4, -1.2],
            flow: 'out',
            phase: 1.4
        },
        {
            id: 'docs',
            tag: 'DOCS',
            title: 'Generated Documentation',
            desc: 'Portales Markdown vivos, especificaciones técnicas y documentación de onboarding sincronizada.',
            color: '#38BDF8',
            hex: PALETTE.techCyan,
            pos: [0.0, 4.4, 0.9],
            flow: 'out',
            phase: 2.6
        },
        {
            id: 'c4',
            tag: 'C4',
            title: 'Software Architecture',
            desc: 'Generación continua de diagramas arquitectónicos C4 interactivos (Contexto, Contenedores y Componentes).',
            color: '#818CF8',
            hex: PALETTE.indigo,
            pos: [3.6, 3.4, -1.4],
            flow: 'out',
            phase: 3.8
        },
        {
            id: 'api',
            tag: 'API',
            title: 'API Structure',
            desc: 'Detección automática de endpoints REST, routers, middlewares y contratos OpenAPI 3.1.',
            color: '#38BDF8',
            hex: PALETTE.techCyan,
            pos: [5.2, 0.3, 0.8],
            flow: 'out',
            phase: 5.0
        },
        {
            id: 'db',
            tag: 'DATABASE',
            title: 'Data Layer',
            desc: 'Mapeo de esquemas ORM, modelos relacionales, migraciones y entidades de base de datos.',
            color: '#818CF8',
            hex: PALETTE.indigo,
            pos: [-3.2, -3.0, 1.0],
            flow: 'out',
            phase: 2.2
        },
        {
            id: 'sync',
            tag: 'SYNC',
            title: 'Repository Synchronization',
            desc: 'Sincronización continua mediante webhooks de GitHub Actions en cada git push sin intervención manual.',
            color: '#34D399',
            hex: PALETTE.emerald,
            pos: [3.2, -3.0, -0.9],
            flow: 'out',
            phase: 0.8
        }
    ];

    // ==========================================
    // 1. THREE.JS SCENE, CAMERA & RENDERER SETUP
    // ==========================================
    var scene = new THREE.Scene();

    var camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0.5, 16);
    camera.lookAt(0, 0, 0);

    var isMobile = (wrapper.clientWidth || window.innerWidth) < 650;
    var renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance'
    });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, (AICoreApp.performanceMode || isMobile) ? 1.5 : 2));

    // Hierarchical Root Groups
    var environmentGroup = new THREE.Group();
    var coreSystem = new THREE.Group();
    var orbitSystem = new THREE.Group();
    var nodeSystem = new THREE.Group();
    var connectionSystem = new THREE.Group();

    scene.add(environmentGroup);
    scene.add(coreSystem);
    scene.add(orbitSystem);
    scene.add(nodeSystem);
    scene.add(connectionSystem);

    function getViewportDims() {
        var w = wrapper.clientWidth || 340;
        var h = wrapper.clientHeight || 340;
        return { width: w, height: h };
    }

    // Dynamic responsive viewport adjustment
    function handleResize() {
        var dims = getViewportDims();
        var w = dims.width;
        var h = dims.height;
        if (w === 0 || h === 0) return;

        camera.aspect = w / h;

        // Fluid camera distance & scale adjustment to avoid node clipping on mobile
        if (w < 340) {
            camera.position.z = 21.0;
            nodeSystem.scale.setScalar(0.72);
            orbitSystem.scale.setScalar(0.75);
            coreSystem.scale.setScalar(0.80);
            connectionSystem.scale.setScalar(0.72);
        } else if (w < 480) {
            camera.position.z = 19.5;
            nodeSystem.scale.setScalar(0.82);
            orbitSystem.scale.setScalar(0.85);
            coreSystem.scale.setScalar(0.88);
            connectionSystem.scale.setScalar(0.82);
        } else if (w < 768) {
            camera.position.z = 17.5;
            nodeSystem.scale.setScalar(0.92);
            orbitSystem.scale.setScalar(0.92);
            coreSystem.scale.setScalar(0.92);
            connectionSystem.scale.setScalar(0.92);
        } else {
            camera.position.z = 16.0;
            nodeSystem.scale.setScalar(1.0);
            orbitSystem.scale.setScalar(1.0);
            coreSystem.scale.setScalar(1.0);
            connectionSystem.scale.setScalar(1.0);
        }

        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
    }

    handleResize();
    window.addEventListener('resize', handleResize, { passive: true });

    // Use ResizeObserver for instant container-bound size changes
    if (window.ResizeObserver) {
        var ro = new ResizeObserver(function() {
            handleResize();
        });
        ro.observe(wrapper);
    }

    // ==========================================
    // 2. ENVIRONMENT GROUP: PHYSICAL LIGHTS & AMBIENT DUST
    // ==========================================
    var ambientLight = new THREE.AmbientLight(PALETTE.deepSlate, 2.6);
    environmentGroup.add(ambientLight);

    var keyLight = new THREE.DirectionalLight(0xffffff, 0.95);
    keyLight.position.set(10, 16, 14);
    environmentGroup.add(keyLight);

    var fillLight = new THREE.DirectionalLight(PALETTE.indigo, 0.75);
    fillLight.position.set(-12, -10, 8);
    environmentGroup.add(fillLight);

    // Cosmic Dust Particles (BufferGeometry + Points)
    var particleCount = (AICoreApp.performanceMode || isMobile) ? 50 : 130;
    var particlePositions = new Float32Array(particleCount * 3);
    for (var p = 0; p < particleCount; p++) {
        particlePositions[p * 3] = (Math.random() - 0.5) * 26;
        particlePositions[p * 3 + 1] = (Math.random() - 0.5) * 26;
        particlePositions[p * 3 + 2] = (Math.random() - 0.5) * 18;
    }
    var particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    var particleMat = new THREE.PointsMaterial({
        size: 0.12,
        color: PALETTE.techCyan,
        transparent: true,
        opacity: 0.40
    });
    var ambientPoints = new THREE.Points(particleGeo, particleMat);
    environmentGroup.add(ambientPoints);

    // ==========================================
    // 3. CORE SYSTEM: MULTI-LAYER 3D AI REACTOR
    // ==========================================
    // 3.1 Inner Pulsing Reactor Core
    var coreInnerGeo = new THREE.SphereGeometry(1.0, 32, 32);
    var coreInnerMat = new THREE.MeshBasicMaterial({
        color: PALETTE.techCyan,
        transparent: true,
        opacity: 0.45
    });
    var coreInner = new THREE.Mesh(coreInnerGeo, coreInnerMat);
    coreSystem.add(coreInner);

    // 3.2 Mid Reactor Core
    var coreMidGeo = new THREE.SphereGeometry(1.3, 32, 32);
    var coreMidMat = new THREE.MeshBasicMaterial({
        color: PALETTE.indigo,
        transparent: true,
        opacity: 0.25
    });
    var coreMid = new THREE.Mesh(coreMidGeo, coreMidMat);
    coreSystem.add(coreMid);

    // 3.3 Outer Dark Metallic-Glass Shell
    var coreSphereGeo = new THREE.SphereGeometry(1.68, 48, 48);
    var coreSphereMat = new THREE.MeshPhysicalMaterial({
        color: 0x0c1e36,
        emissive: 0x072844,
        emissiveIntensity: 0.65,
        roughness: 0.15,
        metalness: 0.85,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
        transmission: 0.45,
        ior: 1.5,
        transparent: true,
        opacity: 0.90
    });
    var coreSphere = new THREE.Mesh(coreSphereGeo, coreSphereMat);
    coreSystem.add(coreSphere);

    // 3.4 Inner Wireframe Cage
    var coreWireGeo = new THREE.IcosahedronGeometry(1.88, 2);
    var coreWireMat = new THREE.MeshBasicMaterial({
        color: PALETTE.techCyan,
        wireframe: true,
        transparent: true,
        opacity: 0.35
    });
    var coreWireframe = new THREE.Mesh(coreWireGeo, coreWireMat);
    coreSystem.add(coreWireframe);

    // 3.5 Outer Geometric Lattice
    var coreOuterLatticeGeo = new THREE.IcosahedronGeometry(2.1, 1);
    var coreOuterLatticeMat = new THREE.MeshBasicMaterial({
        color: PALETTE.indigo,
        wireframe: true,
        transparent: true,
        opacity: 0.22
    });
    var coreOuterLattice = new THREE.Mesh(coreOuterLatticeGeo, coreOuterLatticeMat);
    coreSystem.add(coreOuterLattice);

    // 3.6 Three Real 3D Torus Gimbal Rings with physical volume
    var gimbal1Geo = new THREE.TorusGeometry(1.98, 0.034, 16, 64);
    var gimbal1Mat = new THREE.MeshStandardMaterial({
        color: PALETTE.deepSlate,
        emissive: PALETTE.techCyan,
        emissiveIntensity: 0.55,
        metalness: 0.9,
        roughness: 0.2
    });
    var gimbal1 = new THREE.Mesh(gimbal1Geo, gimbal1Mat);
    gimbal1.rotation.x = Math.PI / 2.2;
    coreSystem.add(gimbal1);

    var gimbal2Geo = new THREE.TorusGeometry(2.18, 0.030, 16, 64);
    var gimbal2Mat = new THREE.MeshStandardMaterial({
        color: PALETTE.deepSlate,
        emissive: PALETTE.indigo,
        emissiveIntensity: 0.45,
        metalness: 0.9,
        roughness: 0.2
    });
    var gimbal2 = new THREE.Mesh(gimbal2Geo, gimbal2Mat);
    gimbal2.rotation.y = Math.PI / 2.4;
    coreSystem.add(gimbal2);

    var gimbal3Geo = new THREE.TorusGeometry(2.38, 0.026, 16, 64);
    var gimbal3Mat = new THREE.MeshStandardMaterial({
        color: PALETTE.deepSlate,
        emissive: PALETTE.emerald,
        emissiveIntensity: 0.40,
        metalness: 0.9,
        roughness: 0.2
    });
    var gimbal3 = new THREE.Mesh(gimbal3Geo, gimbal3Mat);
    gimbal3.rotation.z = Math.PI / 3.0;
    coreSystem.add(gimbal3);

    // 3.7 Core Point Light
    var corePointLight = new THREE.PointLight(PALETTE.techCyan, 4.5, 30);
    corePointLight.position.set(0, 0, 0);
    coreSystem.add(corePointLight);

    // 3.8 Swirling Core Nano Particles
    var corePartCount = (AICoreApp.performanceMode || isMobile) ? 30 : 65;
    var corePartPositions = new Float32Array(corePartCount * 3);
    for (var cp = 0; cp < corePartCount; cp++) {
        var theta = Math.random() * Math.PI * 2;
        var phi = Math.acos((Math.random() * 2) - 1);
        var rad = 2.2 + Math.random() * 0.4;
        corePartPositions[cp * 3] = rad * Math.sin(phi) * Math.cos(theta);
        corePartPositions[cp * 3 + 1] = rad * Math.sin(phi) * Math.sin(theta);
        corePartPositions[cp * 3 + 2] = rad * Math.cos(phi);
    }
    var corePartGeo = new THREE.BufferGeometry();
    corePartGeo.setAttribute('position', new THREE.BufferAttribute(corePartPositions, 3));
    var corePartMat = new THREE.PointsMaterial({
        size: 0.14,
        color: PALETTE.techCyan,
        transparent: true,
        opacity: 0.80,
        blending: THREE.AdditiveBlending
    });
    var coreParticles = new THREE.Points(corePartGeo, corePartMat);
    coreSystem.add(coreParticles);

    // ==========================================
    // 4. ORBIT SYSTEM: 4 REAL 3D TORUS ORBITS WITH SATELLITES
    // ==========================================
    var ORBIT_CONFIGS = [
        { radius: 2.8, tube: 0.024, rot: [0.75, 0.30, 0.45], color: PALETTE.techCyan, speed: 0.32 },
        { radius: 3.6, tube: 0.022, rot: [-0.85, 0.55, -0.40], color: PALETTE.indigo, speed: -0.25 },
        { radius: 4.4, tube: 0.024, rot: [1.10, -0.35, 0.75], color: PALETTE.emerald, speed: 0.20 },
        { radius: 5.2, tube: 0.020, rot: [-0.60, -0.80, -0.55], color: PALETTE.techCyan, speed: -0.15 }
    ];

    var orbits = [];
    ORBIT_CONFIGS.forEach(function(cfg, idx) {
        var torusGeo = new THREE.TorusGeometry(cfg.radius, cfg.tube, 16, 80);
        var torusMat = new THREE.MeshStandardMaterial({
            color: PALETTE.deepSlate,
            emissive: cfg.color,
            emissiveIntensity: 0.45,
            metalness: 0.9,
            roughness: 0.25,
            transparent: true,
            opacity: 0.80
        });
        var orbitMesh = new THREE.Mesh(torusGeo, torusMat);
        orbitMesh.rotation.set(cfg.rot[0], cfg.rot[1], cfg.rot[2]);
        orbitSystem.add(orbitMesh);

        // Faceted 3D Satellite Octahedron
        var satGeo = new THREE.OctahedronGeometry(0.14, 0);
        var satMat = new THREE.MeshStandardMaterial({
            color: cfg.color,
            emissive: cfg.color,
            emissiveIntensity: 1.2,
            metalness: 0.9,
            roughness: 0.1
        });
        var satellite = new THREE.Mesh(satGeo, satMat);
        orbitMesh.add(satellite);

        orbits.push({
            radius: cfg.radius,
            mesh: orbitMesh,
            satellite: satellite,
            speed: cfg.speed,
            offset: idx * 0.25
        });
    });

    // ==========================================
    // 5. NODE SYSTEM: 7 FACETED 3D CRYSTALS & PROJECTIONS
    // ==========================================
    var overlay = document.getElementById('ai-nodes-overlay');
    var nodes = [];
    var hitMeshes = [];

    NODES_DATA.forEach(function(data, idx) {
        var group = new THREE.Group();
        group.position.set(data.pos[0], data.pos[1], data.pos[2]);

        // 5.1 Faceted Technological 3D Crystal (Octahedron)
        var crystalGeo = new THREE.OctahedronGeometry(0.38, 0);
        var crystalMat = new THREE.MeshStandardMaterial({
            color: 0x0F172A,
            emissive: data.hex,
            emissiveIntensity: 0.85,
            roughness: 0.15,
            metalness: 0.90,
            flatShading: true
        });
        var crystalMesh = new THREE.Mesh(crystalGeo, crystalMat);
        group.add(crystalMesh);

        // 5.2 3D Orbital Ring around Node
        var ringGeo = new THREE.TorusGeometry(0.58, 0.026, 12, 32);
        var ringMat = new THREE.MeshBasicMaterial({
            color: data.hex,
            transparent: true,
            opacity: 0.65
        });
        var ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = Math.PI / 3;
        group.add(ringMesh);

        // 5.3 Invisible Raycaster Hit Sphere
        var hitGeo = new THREE.SphereGeometry(1.0, 16, 16);
        var hitMat = new THREE.MeshBasicMaterial({ visible: false });
        var hitMesh = new THREE.Mesh(hitGeo, hitMat);
        hitMesh.userData = { nodeIndex: idx, type: data.id, nodeData: data };
        group.add(hitMesh);
        hitMeshes.push(hitMesh);

        nodeSystem.add(group);

        // 5.4 Projected HTML Label positioned below the crystal
        var labelEl = null;
        if (overlay) {
            labelEl = document.createElement('div');
            labelEl.className = 'ai-3d-node-label';
            labelEl.setAttribute('data-node-id', data.id);
            labelEl.innerHTML = '<span class="node-dot" style="background:' + data.color + ';box-shadow:0 0 8px ' + data.color + ';"></span>' +
                                '<span class="node-name">' + data.tag + '</span>';
            overlay.appendChild(labelEl);

            labelEl.addEventListener('click', function(e) {
                e.stopPropagation();
                openNodeModal(data);
            });
            labelEl.addEventListener('mouseenter', function() {
                setHoveredNode(idx);
            });
            labelEl.addEventListener('mouseleave', function() {
                clearHoveredNode();
            });
        }

        nodes.push({
            data: data,
            basePos: new THREE.Vector3(data.pos[0], data.pos[1], data.pos[2]),
            group: group,
            crystal: crystalMesh,
            ring: ringMesh,
            labelEl: labelEl
        });
    });

    // ==========================================
    // 6. CONNECTION SYSTEM: 3D LINES & FLOWING PACKETS
    // ==========================================
    var connections = [];
    nodes.forEach(function(node) {
        var lineGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            node.group.position
        ]);
        var lineMat = new THREE.LineBasicMaterial({
            color: node.data.hex,
            transparent: true,
            opacity: 0.25
        });
        var line = new THREE.Line(lineGeo, lineMat);
        connectionSystem.add(line);

        // Glowing 3D Data Packets (2 per line)
        var packets = [];
        for (var pk = 0; pk < 2; pk++) {
            var pktGeo = new THREE.SphereGeometry(0.11, 14, 14);
            var pktMat = new THREE.MeshBasicMaterial({ color: node.data.hex });
            var pktMesh = new THREE.Mesh(pktGeo, pktMat);
            connectionSystem.add(pktMesh);
            packets.push({
                mesh: pktMesh,
                offset: pk * 0.5
            });
        }

        connections.push({
            node: node,
            line: line,
            packets: packets
        });
    });

    // ==========================================
    // 7. INTERACTION: RAYCASTER, TOUCH & PARALLAX
    // ==========================================
    var raycaster = new THREE.Raycaster();
    var pointer = new THREE.Vector2(-999, -999);
    var targetCam = new THREE.Vector2(0, 0);

    var tooltip = document.getElementById('ai-tooltip');
    var tooltipTag = document.getElementById('ai-tooltip-tag');
    var tooltipDesc = document.getElementById('ai-tooltip-desc');

    function updatePointer(e) {
        var rect = wrapper.getBoundingClientRect();
        var clientX = e.clientX;
        var clientY = e.clientY;
        if (e.touches && e.touches[0]) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        }
        pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -(((clientY - rect.top) / rect.height) * 2 - 1);

        // In mobile touch mode, disable camera parallax to keep scrolling smooth
        if (e.pointerType !== 'touch' && !AICoreApp.isTouchDevice) {
            targetCam.x = pointer.x * 1.5;
            targetCam.y = pointer.y * 1.2;
        }
    }

    // Pointer events for mouse and touch
    wrapper.addEventListener('pointermove', updatePointer, { passive: true });
    wrapper.addEventListener('pointerleave', function() {
        pointer.x = -999;
        pointer.y = -999;
        targetCam.x = 0;
        targetCam.y = 0;
        clearHoveredNode();
    });

    // Touch tap / click handler
    var pointerStartX = 0;
    var pointerStartY = 0;
    wrapper.addEventListener('pointerdown', function(e) {
        pointerStartX = e.clientX;
        pointerStartY = e.clientY;
        updatePointer(e);
    }, { passive: true });

    wrapper.addEventListener('pointerup', function(e) {
        var dx = Math.abs(e.clientX - pointerStartX);
        var dy = Math.abs(e.clientY - pointerStartY);
        // Only trigger if it was a distinct tap (not a drag/scroll)
        if (dx < 8 && dy < 8 && pointer.x > -900) {
            raycaster.setFromCamera(pointer, camera);
            var hits = raycaster.intersectObjects(hitMeshes);
            if (hits.length > 0) {
                var nodeData = hits[0].object.userData.nodeData;
                var nIdx = hits[0].object.userData.nodeIndex;
                setHoveredNode(nIdx);
                // In touch mode, tapping also triggers the modal
                if (e.pointerType === 'touch' || AICoreApp.isTouchDevice) {
                    openNodeModal(nodeData);
                }
            } else {
                clearHoveredNode();
            }
        }
    });

    function setHoveredNode(idx) {
        if (AICoreApp.hoveredNodeIndex === idx) return;
        AICoreApp.hoveredNodeIndex = idx;
        var n = nodes[idx];
        canvas.style.cursor = 'pointer';

        if (tooltip && tooltipTag && tooltipDesc) {
            tooltipTag.textContent = n.data.tag;
            tooltipTag.style.color = n.data.color;
            tooltipDesc.textContent = n.data.title;
            tooltip.style.borderColor = n.data.color;
            tooltip.style.display = 'block';
        }
        if (n.labelEl) n.labelEl.classList.add('active');
    }

    function clearHoveredNode() {
        if (AICoreApp.hoveredNodeIndex === -1) return;
        var prevNode = nodes[AICoreApp.hoveredNodeIndex];
        if (prevNode && prevNode.labelEl) {
            prevNode.labelEl.classList.remove('active');
        }
        AICoreApp.hoveredNodeIndex = -1;
        canvas.style.cursor = 'default';
        if (tooltip) tooltip.style.display = 'none';
    }

    // Boundary-aware tooltip positioning
    function positionTooltip(lx, ly) {
        if (!tooltip) return;
        var wrapRect = wrapper.getBoundingClientRect();
        var tipRect = tooltip.getBoundingClientRect();
        var halfW = (tipRect.width || 120) / 2;

        var absX = wrapRect.left + lx;
        var absY = wrapRect.top + ly;

        var clampedX = lx;
        if (absX - halfW < 10) {
            clampedX += (10 - (absX - halfW));
        } else if (absX + halfW > window.innerWidth - 10) {
            clampedX -= ((absX + halfW) - (window.innerWidth - 10));
        }

        var clampedY = ly - 26;
        if (absY - 45 < 10) {
            clampedY = ly + 36;
        }

        tooltip.style.transform = 'translate(-50%, -100%) translate(' + clampedX.toFixed(1) + 'px, ' + clampedY.toFixed(1) + 'px)';
    }

    // ==========================================
    // 8. MODAL, HUD & ACTIONS
    // ==========================================
    var modal = document.getElementById('ai-node-modal');
    var modalTitle = document.getElementById('ai-modal-title');
    var modalTag = document.getElementById('ai-modal-tag');
    var modalDesc = document.getElementById('ai-modal-desc');
    var modalClose = document.getElementById('ai-modal-close');

    function openNodeModal(data) {
        if (!data || !modal) return;
        AICoreApp.selectedNodeData = data;
        if (modalTitle) modalTitle.textContent = data.title;
        if (modalTag) {
            modalTag.textContent = data.tag;
            modalTag.style.color = data.color;
            modalTag.style.borderColor = data.color;
        }
        if (modalDesc) modalDesc.textContent = data.desc;
        modal.style.display = 'flex';
    }

    if (modalClose) {
        modalClose.addEventListener('click', function() {
            if (modal) modal.style.display = 'none';
        });
    }

    var hudStatusLabel = document.getElementById('ai-hud-status-label');
    var hudDot = document.getElementById('ai-hud-dot');

    function updateHUDStatus(stage) {
        if (hudStatusLabel) hudStatusLabel.textContent = stage.label;
        if (hudDot) {
            hudDot.style.background = stage.color;
            hudDot.style.boxShadow = '0 0 10px ' + stage.color;
        }
    }

    var btnPauseResume = document.getElementById('ai-btn-pause');
    if (btnPauseResume) {
        btnPauseResume.addEventListener('click', function() {
            AICoreApp.isPaused = !AICoreApp.isPaused;
            btnPauseResume.innerHTML = AICoreApp.isPaused ?
                '<i class="fa-solid fa-play"></i> RESUME' :
                '<i class="fa-solid fa-pause"></i> PAUSE';
        });
    }

    var btnResetView = document.getElementById('ai-btn-reset');
    if (btnResetView) {
        btnResetView.addEventListener('click', function() {
            targetCam.set(0, 0);
            camera.position.set(0, 0.5, isMobile ? 18.5 : 16);
            camera.lookAt(0, 0, 0);
            clearHoveredNode();
        });
    }

    var btnRunHeroAnalysis = document.getElementById('btn-hero-analyze');
    if (btnRunHeroAnalysis) {
        btnRunHeroAnalysis.addEventListener('click', function() {
            triggerAnalysisSequence();
        });
    }

    function triggerAnalysisSequence() {
        AICoreApp.currentStageIndex = 0;
        AICoreApp.stageTimer = performance.now();
        updateHUDStatus(STAGES[0]);
        corePointLight.intensity = 8.0;
        setTimeout(function() { corePointLight.intensity = 4.5; }, 1200);
    }

    // ==========================================
    // 9. ANIMATION LOOP
    // ==========================================
    var clock = new THREE.Clock();
    var lastStageSwitch = performance.now();

    function animate() {
        requestAnimationFrame(animate);

        if (AICoreApp.isPaused) return;

        var delta = clock.getDelta();
        var t = clock.getElapsedTime();

        // 9.1 Cycle Stages Every 4.2 Seconds
        var now = performance.now();
        if (now - lastStageSwitch > 4200) {
            AICoreApp.currentStageIndex = (AICoreApp.currentStageIndex + 1) % STAGES.length;
            lastStageSwitch = now;
            updateHUDStatus(STAGES[AICoreApp.currentStageIndex]);
        }

        var currentStage = STAGES[AICoreApp.currentStageIndex];

        // 9.2 Camera Parallax
        if (!AICoreApp.isTouchDevice) {
            camera.position.x += (targetCam.x - camera.position.x) * 0.05;
            camera.position.y += (targetCam.y - camera.position.y) * 0.05;
            camera.lookAt(0, 0, 0);
        }

        // 9.3 Raycaster Test (Desktop Mousemove)
        if (!AICoreApp.isTouchDevice && pointer.x > -900) {
            raycaster.setFromCamera(pointer, camera);
            var intersects = raycaster.intersectObjects(hitMeshes);
            if (intersects.length > 0) {
                setHoveredNode(intersects[0].object.userData.nodeIndex);
            } else {
                clearHoveredNode();
            }
        }

        // 9.4 Core Rotations & Pulsation
        coreSphere.rotation.y = t * 0.20;
        coreInner.scale.setScalar(1.0 + 0.08 * Math.sin(t * 2.8));
        coreWireframe.rotation.x = -t * 0.30;
        coreWireframe.rotation.y = t * 0.38;
        coreOuterLattice.rotation.y = -t * 0.16;
        coreOuterLattice.rotation.z = t * 0.12;

        gimbal1.rotation.z = t * 0.40;
        gimbal2.rotation.x = -t * 0.32;
        gimbal3.rotation.y = t * 0.28;

        coreParticles.rotation.y = t * 0.25;
        coreParticles.rotation.x = t * 0.14;
        ambientPoints.rotation.y = t * 0.03;

        // 9.5 Orbits & Travelling Satellites
        orbits.forEach(function(orb) {
            var angle = t * orb.speed + orb.offset;
            orb.satellite.position.set(
                orb.radius * Math.cos(angle),
                orb.radius * Math.sin(angle),
                0
            );
        });

        // 9.6 Node System Updates & Projected Coordinates
        var dims = getViewportDims();
        var w = dims.width;
        var h = dims.height;

        nodes.forEach(function(node, idx) {
            var isHovered = (AICoreApp.hoveredNodeIndex === idx);
            var isStageActive = currentStage.active.indexOf(node.data.id) !== -1;

            // Harmonic float
            var fy = node.basePos.y + Math.sin(t * 1.3 + node.data.phase) * 0.18;
            var fz = node.basePos.z + Math.cos(t * 1.1 + node.data.phase) * 0.15;
            node.group.position.set(node.basePos.x, fy, fz);

            // Spin crystal and ring
            node.crystal.rotation.y = t * 0.85 + idx;
            node.crystal.rotation.x = t * 0.45;
            node.ring.rotation.z = -t * 0.60;

            // Scale & Emissive Lerp
            var targetScale = isHovered ? 1.35 : (isStageActive ? 1.15 : 1.0);
            node.group.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.14);

            var targetEmissive = isHovered ? 2.0 : (isStageActive ? 1.35 : 0.85);
            node.crystal.material.emissiveIntensity += (targetEmissive - node.crystal.material.emissiveIntensity) * 0.14;

            // Project 3D coordinate to HTML Label (positioned 26px below the crystal)
            if (node.labelEl) {
                var screenPos = node.group.position.clone().project(camera);
                var lx = (screenPos.x * 0.5 + 0.5) * w;
                var ly = (-(screenPos.y * 0.5) + 0.5) * h;
                node.labelEl.style.transform = 'translate(-50%, 26px) translate(' + lx.toFixed(1) + 'px, ' + ly.toFixed(1) + 'px)';
                node.labelEl.style.opacity = screenPos.z > 1.0 ? '0' : '1';

                if (isStageActive && !isHovered) {
                    node.labelEl.style.borderColor = node.data.color;
                    node.labelEl.style.boxShadow = '0 0 14px ' + node.data.color;
                } else if (!isHovered) {
                    node.labelEl.style.borderColor = 'rgba(129, 140, 248, 0.32)';
                    node.labelEl.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.45)';
                }

                if (isHovered && tooltip) {
                    positionTooltip(lx, ly);
                }
            }
        });

        // 9.7 Connection Lines & Flowing Data Packets
        var coreOrigin = new THREE.Vector3(0, 0, 0);
        connections.forEach(function(conn, cIdx) {
            var n = conn.node;
            var isHovered = (AICoreApp.hoveredNodeIndex === cIdx);
            var isStageActive = currentStage.active.indexOf(n.data.id) !== -1;

            var posAttr = conn.line.geometry.attributes.position;
            posAttr.setXYZ(0, 0, 0, 0);
            posAttr.setXYZ(1, n.group.position.x, n.group.position.y, n.group.position.z);
            posAttr.needsUpdate = true;

            var targetLineOpacity = isHovered ? 0.90 : (isStageActive ? 0.65 : 0.25);
            conn.line.material.opacity += (targetLineOpacity - conn.line.material.opacity) * 0.14;

            // Travel speed
            var speedMultiplier = isStageActive ? 0.55 : 0.32;
            conn.packets.forEach(function(pkt) {
                var prog = (t * speedMultiplier + pkt.offset) % 1.0;
                var start = (n.data.flow === 'in') ? n.group.position : coreOrigin;
                var end   = (n.data.flow === 'in') ? coreOrigin : n.group.position;
                pkt.mesh.position.copy(start).lerp(end, prog);
            });
        });

        // 9.8 Render Scene
        renderer.render(scene, camera);
    }

    // Start Animation Loop
    animate();

    // Trigger Initial Boot Animation
    triggerAnalysisSequence();

    // Expose API
    window.AICore3D = {
        app: AICoreApp,
        triggerAnalysis: triggerAnalysisSequence,
        openNode: openNodeModal,
        stages: STAGES
    };

})();
