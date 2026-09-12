/**
 * DOCUMENT-MIND AI — 3D COMPUTATIONAL AI CORE
 * Three.js + WebGL Architecture
 * Hierarchical Scene Structure:
 * scene
 * ├── environmentGroup (Lights, Ambient 3D Particles)
 * ├── coreSystem (Sphere, Inner Glow, Wireframe, Energy Rings, Orbiting Points)
 * ├── orbitSystem (4 Tilted 3D Elliptical Orbits with Satellites)
 * ├── nodeSystem (7 3D Nodes: CODE, AST, DOCS, C4, API, DATABASE, SYNC)
 * ├── connectionSystem (3D Connection Lines & Flowing Data Packets)
 * └── interactionSystem (Raycaster, Parallax, Tooltips, State Machine, HUD)
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

    // Palette Constants
    var PALETTE = {
        midnight: 0x090D16,
        deepSlate: 0x0F172A,
        techCyan: 0x38BDF8,
        emerald: 0x34D399,
        indigo: 0x818CF8,
        white: 0xF8FAFC,
        textMuted: 0x94A3B8
    };

    // Global App Object
    var AICoreApp = {
        isPaused: false,
        performanceMode: false,
        currentStageIndex: 0,
        stageTimer: 0,
        hoveredNodeIndex: -1,
        selectedNodeData: null
    };

    // Stages / State Machine
    var STAGES = [
        { id: 'ANALYZING', label: 'ANALYZING REPOSITORY', color: '#38BDF8', hex: PALETTE.techCyan, active: ['code'] },
        { id: 'BUILDING_AST', label: 'BUILDING AST', color: '#818CF8', hex: PALETTE.indigo, active: ['ast'] },
        { id: 'MAPPING_ARCH', label: 'MAPPING ARCHITECTURE', color: '#818CF8', hex: PALETTE.indigo, active: ['c4', 'api', 'db'] },
        { id: 'GENERATING_DOCS', label: 'GENERATING DOCUMENTATION', color: '#38BDF8', hex: PALETTE.techCyan, active: ['docs'] },
        { id: 'SYNC_COMPLETE', label: 'SYNC COMPLETE', color: '#34D399', hex: PALETTE.emerald, active: ['sync'] }
    ];

    // Node Definitions with Deliberate Spatial Composition
    var NODES_DATA = [
        {
            id: 'code',
            tag: 'CODE',
            title: 'Source Code Repository',
            desc: 'Ingestión y análisis estático del árbol de directorios y archivos fuente sin compilar.',
            color: '#38BDF8',
            hex: PALETTE.techCyan,
            pos: [-5.4, 0.2, 0.8],
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
            pos: [-3.8, 3.4, -1.2],
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
            pos: [0.2, 4.4, 1.2],
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
            pos: [3.8, 3.2, -1.6],
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
            pos: [5.4, 0.2, 0.6],
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
            pos: [-3.2, -3.2, 1.0],
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
            pos: [3.4, -3.2, -1.0],
            flow: 'out',
            phase: 0.8
        }
    ];

    // Check reduced motion
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        AICoreApp.performanceMode = true;
    }

    // ==========================================
    // 1. THREE.JS SCENE, RENDERER, CAMERA SETUP
    // ==========================================
    var scene = new THREE.Scene();

    var camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0.5, 16);
    camera.lookAt(0, 0, 0);

    var renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance'
    });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, AICoreApp.performanceMode ? 1.5 : 2));

    function getViewportDims() {
        var w = wrapper.clientWidth || 540;
        var h = wrapper.clientHeight || 540;
        return { width: w, height: h };
    }

    function handleResize() {
        var dims = getViewportDims();
        camera.aspect = dims.width / dims.height;
        // Responsive camera distance adjustment for small screens
        if (dims.width < 450) {
            camera.position.z = 20.5;
        } else if (dims.width < 650) {
            camera.position.z = 18;
        } else {
            camera.position.z = 16;
        }
        camera.updateProjectionMatrix();
        renderer.setSize(dims.width, dims.height, false);
    }
    handleResize();
    window.addEventListener('resize', handleResize, { passive: true });

    // ==========================================
    // 2. HIERARCHICAL GROUPS
    // ==========================================
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

    // ==========================================
    // 3. ENVIRONMENT GROUP: LIGHTS & AMBIENT PARTICLES
    // ==========================================
    var ambientLight = new THREE.AmbientLight(PALETTE.deepSlate, 2.8);
    environmentGroup.add(ambientLight);

    var keyLight = new THREE.DirectionalLight(0xffffff, 0.85);
    keyLight.position.set(10, 16, 14);
    environmentGroup.add(keyLight);

    var fillLight = new THREE.DirectionalLight(PALETTE.indigo, 0.7);
    fillLight.position.set(-12, -10, 8);
    environmentGroup.add(fillLight);

    // Ambient floating 3D dust particles (BufferGeometry)
    var particleCount = AICoreApp.performanceMode ? 60 : 150;
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
        opacity: 0.45
    });
    var ambientPoints = new THREE.Points(particleGeo, particleMat);
    environmentGroup.add(ambientPoints);

    // ==========================================
    // 4. CORE SYSTEM: 3D COMPUTATIONAL AI CORE
    // ==========================================
    // 4.1 Outer Dark Spherical Shell
    var coreSphereGeo = new THREE.SphereGeometry(1.65, 48, 48);
    var coreSphereMat = new THREE.MeshPhysicalMaterial({
        color: PALETTE.midnight,
        emissive: 0x071b2d,
        roughness: 0.22,
        metalness: 0.88,
        transmission: 0.15,
        transparent: true,
        opacity: 0.95
    });
    var coreSphere = new THREE.Mesh(coreSphereGeo, coreSphereMat);
    coreSystem.add(coreSphere);

    // 4.2 Inner Glowing Energy Core
    var coreInnerGeo = new THREE.SphereGeometry(1.2, 32, 32);
    var coreInnerMat = new THREE.MeshBasicMaterial({
        color: PALETTE.techCyan,
        transparent: true,
        opacity: 0.35
    });
    var coreInner = new THREE.Mesh(coreInnerGeo, coreInnerMat);
    coreSystem.add(coreInner);

    // 4.3 Spherical Wireframe
    var coreWireGeo = new THREE.IcosahedronGeometry(1.82, 2);
    var coreWireMat = new THREE.MeshBasicMaterial({
        color: PALETTE.techCyan,
        wireframe: true,
        transparent: true,
        opacity: 0.32
    });
    var coreWireframe = new THREE.Mesh(coreWireGeo, coreWireMat);
    coreSystem.add(coreWireframe);

    // 4.4 Outer Energy Lattice
    var coreOuterLatticeGeo = new THREE.IcosahedronGeometry(2.05, 1);
    var coreOuterLatticeMat = new THREE.MeshBasicMaterial({
        color: PALETTE.indigo,
        wireframe: true,
        transparent: true,
        opacity: 0.20
    });
    var coreOuterLattice = new THREE.Mesh(coreOuterLatticeGeo, coreOuterLatticeMat);
    coreSystem.add(coreOuterLattice);

    // 4.5 Dual Rotational Torus Energy Rings
    // 4.5 Core Equatorial Ring Disc (RingGeometry) & Torus Rings
    var ringDiscGeo = new THREE.RingGeometry(1.68, 2.15, 48);
    var ringDiscMat = new THREE.MeshBasicMaterial({
        color: PALETTE.techCyan,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.22
    });
    var energyRingDisc = new THREE.Mesh(ringDiscGeo, ringDiscMat);
    energyRingDisc.rotation.x = Math.PI / 2;
    coreSystem.add(energyRingDisc);

    var ring1Geo = new THREE.TorusGeometry(1.9, 0.024, 16, 64);
    var ringMat = new THREE.MeshBasicMaterial({
        color: PALETTE.techCyan,
        transparent: true,
        opacity: 0.55
    });
    var energyRing1 = new THREE.Mesh(ring1Geo, ringMat);
    energyRing1.rotation.x = Math.PI / 2.2;
    coreSystem.add(energyRing1);

    var ring2Geo = new THREE.TorusGeometry(2.1, 0.02, 16, 64);
    var ring2Mat = new THREE.MeshBasicMaterial({
        color: PALETTE.indigo,
        transparent: true,
        opacity: 0.40
    });
    var energyRing2 = new THREE.Mesh(ring2Geo, ring2Mat);
    energyRing2.rotation.y = Math.PI / 2.4;
    coreSystem.add(energyRing2);

    // 4.6 Core Radiating Point Light
    var corePointLight = new THREE.PointLight(PALETTE.techCyan, 4.5, 30);
    corePointLight.position.set(0, 0, 0);
    coreSystem.add(corePointLight);

    // 4.7 Core Orbiting Nano Particles
    var corePartCount = AICoreApp.performanceMode ? 35 : 70;
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
        opacity: 0.75,
        blending: THREE.AdditiveBlending
    });
    var coreParticles = new THREE.Points(corePartGeo, corePartMat);
    coreSystem.add(coreParticles);

    // ==========================================
    // 5. ORBIT SYSTEM: 4 REAL 3D TILTED ORBITS WITH SATELLITES
    // ==========================================
    var ORBIT_CONFIGS = [
        { rx: 4.0, ry: 2.3, rot: [0.70, 0.25, 0.40], color: PALETTE.techCyan, speed: 0.30 },
        { rx: 5.2, ry: 2.8, rot: [-0.80, 0.60, -0.45], color: PALETTE.indigo, speed: -0.24 },
        { rx: 6.5, ry: 3.4, rot: [1.15, -0.40, 0.85], color: PALETTE.emerald, speed: 0.18 },
        { rx: 7.8, ry: 4.1, rot: [-0.55, -0.85, -0.60], color: PALETTE.techCyan, speed: -0.14 }
    ];

    var orbits = [];
    ORBIT_CONFIGS.forEach(function(cfg, idx) {
        var curve = new THREE.EllipseCurve(0, 0, cfg.rx, cfg.ry, 0, 2 * Math.PI, false, 0);
        var pts = curve.getPoints(96);
        var lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
        var lineMat = new THREE.LineBasicMaterial({
            color: cfg.color,
            transparent: true,
            opacity: 0.28
        });
        var orbitLine = new THREE.LineLoop(lineGeo, lineMat);
        orbitLine.rotation.set(cfg.rot[0], cfg.rot[1], cfg.rot[2]);
        orbitSystem.add(orbitLine);

        // Traveling Satellite 3D Object
        var satGeo = new THREE.SphereGeometry(0.13, 16, 16);
        var satMat = new THREE.MeshBasicMaterial({ color: cfg.color });
        var satellite = new THREE.Mesh(satGeo, satMat);
        orbitLine.add(satellite);

        orbits.push({
            curve: curve,
            line: orbitLine,
            satellite: satellite,
            speed: cfg.speed,
            offset: idx * 0.25
        });
    });

    // ==========================================
    // 6. NODE SYSTEM & HTML LABELS OVERLAY
    // ==========================================
    var overlay = document.getElementById('ai-nodes-overlay');
    var nodes = [];
    var hitMeshes = [];

    NODES_DATA.forEach(function(data, idx) {
        var group = new THREE.Group();
        group.position.set(data.pos[0], data.pos[1], data.pos[2]);

        // 6.1 Technological Node Core Mesh
        var sphereGeo = new THREE.SphereGeometry(0.35, 24, 24);
        var sphereMat = new THREE.MeshStandardMaterial({
            color: PALETTE.deepSlate,
            emissive: data.hex,
            emissiveIntensity: 0.70,
            roughness: 0.25,
            metalness: 0.85
        });
        var sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
        group.add(sphereMesh);

        // 6.2 Orbital Ring around Node
        var torusGeo = new THREE.TorusGeometry(0.52, 0.03, 16, 32);
        var torusMat = new THREE.MeshBasicMaterial({
            color: data.hex,
            transparent: true,
            opacity: 0.65
        });
        var torusMesh = new THREE.Mesh(torusGeo, torusMat);
        group.add(torusMesh);

        // 6.3 Invisible Raycaster Hit Sphere
        var hitGeo = new THREE.SphereGeometry(0.95, 16, 16);
        var hitMat = new THREE.MeshBasicMaterial({ visible: false });
        var hitMesh = new THREE.Mesh(hitGeo, hitMat);
        hitMesh.userData = { nodeIndex: idx, type: data.id, nodeData: data };
        group.add(hitMesh);
        hitMeshes.push(hitMesh);

        nodeSystem.add(group);

        // 6.4 HTML Label overlay element
        var labelEl = null;
        if (overlay) {
            labelEl = document.createElement('div');
            labelEl.className = 'ai-3d-node-label';
            labelEl.setAttribute('data-node-id', data.id);
            labelEl.innerHTML = '<span class="node-dot" style="background:' + data.color + ';box-shadow:0 0 8px ' + data.color + ';"></span>' +
                                '<span class="node-name">' + data.tag + '</span>';
            overlay.appendChild(labelEl);

            // Click on label opens details
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
            sphere: sphereMesh,
            torus: torusMesh,
            labelEl: labelEl
        });
    });

    // ==========================================
    // 7. CONNECTION SYSTEM: 3D LINES & PROGRESS PACKETS
    // ==========================================
    var connections = [];
    nodes.forEach(function(node) {
        // 3D Line Geometry
        var lineGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            node.group.position
        ]);
        var lineMat = new THREE.LineBasicMaterial({
            color: node.data.hex,
            transparent: true,
            opacity: 0.24,
            linewidth: 1
        });
        var line = new THREE.Line(lineGeo, lineMat);
        connectionSystem.add(line);

        // Flowing Data Packets (2 per connection)
        var packets = [];
        for (var pk = 0; pk < 2; pk++) {
            var pktGeo = new THREE.SphereGeometry(0.095, 12, 12);
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
    // 8. RAYCASTER, INTERACTION & PARALLAX
    // ==========================================
    var raycaster = new THREE.Raycaster();
    var mouse = new THREE.Vector2(-999, -999);
    var targetCam = new THREE.Vector2(0, 0);

    var tooltip = document.getElementById('ai-tooltip');
    var tooltipTag = document.getElementById('ai-tooltip-tag');
    var tooltipDesc = document.getElementById('ai-tooltip-desc');

    function updatePointer(e) {
        var rect = wrapper.getBoundingClientRect();
        var clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
        var clientY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
        mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -(((clientY - rect.top) / rect.height) * 2 - 1);
        targetCam.x = mouse.x * 1.5;
        targetCam.y = mouse.y * 1.2;
    }

    wrapper.addEventListener('mousemove', updatePointer, { passive: true });
    wrapper.addEventListener('mouseleave', function() {
        mouse.x = -999;
        mouse.y = -999;
        targetCam.x = 0;
        targetCam.y = 0;
        clearHoveredNode();
    });

    // Click on 3D canvas (Raycaster click)
    wrapper.addEventListener('click', function(e) {
        if (mouse.x > -900) {
            raycaster.setFromCamera(mouse, camera);
            var hits = raycaster.intersectObjects(hitMeshes);
            if (hits.length > 0) {
                var nodeData = hits[0].object.userData.nodeData;
                openNodeModal(nodeData);
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

    // ==========================================
    // 9. CONTEXTUAL NODE MODAL & HUD CONTROLS
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

    // HUD Status Indicator
    var hudStatusLabel = document.getElementById('ai-hud-status-label');
    var hudDot = document.getElementById('ai-hud-dot');

    function updateHUDStatus(stage) {
        if (hudStatusLabel) hudStatusLabel.textContent = stage.label;
        if (hudDot) {
            hudDot.style.background = stage.color;
            hudDot.style.boxShadow = '0 0 10px ' + stage.color;
        }
    }

    // HUD Pause / Resume
    var btnPauseResume = document.getElementById('ai-btn-pause');
    if (btnPauseResume) {
        btnPauseResume.addEventListener('click', function() {
            AICoreApp.isPaused = !AICoreApp.isPaused;
            btnPauseResume.innerHTML = AICoreApp.isPaused ?
                '<i class="fa-solid fa-play"></i> RESUME SYSTEM' :
                '<i class="fa-solid fa-pause"></i> PAUSE SYSTEM';
        });
    }

    // HUD Reset View
    var btnResetView = document.getElementById('ai-btn-reset');
    if (btnResetView) {
        btnResetView.addEventListener('click', function() {
            targetCam.set(0, 0);
            camera.position.set(0, 0.5, 16);
            camera.lookAt(0, 0, 0);
            clearHoveredNode();
        });
    }

    // Hero "RUN ANALYSIS" Button Trigger
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
        // Boost core glow temporarily
        corePointLight.intensity = 8.0;
        setTimeout(function() { corePointLight.intensity = 4.5; }, 1200);
    }

    // ==========================================
    // 10. MAIN ANIMATION LOOP
    // ==========================================
    var clock = new THREE.Clock();
    var lastStageSwitch = performance.now();

    function animate() {
        requestAnimationFrame(animate);

        if (AICoreApp.isPaused) return;

        var delta = clock.getDelta();
        var t = clock.getElapsedTime();

        // 10.1 Automatic Stage Cycling (Every 4 seconds)
        var now = performance.now();
        if (now - lastStageSwitch > 4200) {
            AICoreApp.currentStageIndex = (AICoreApp.currentStageIndex + 1) % STAGES.length;
            lastStageSwitch = now;
            updateHUDStatus(STAGES[AICoreApp.currentStageIndex]);
        }

        var currentStage = STAGES[AICoreApp.currentStageIndex];

        // 10.2 Smooth Camera Parallax Lerp
        camera.position.x += (targetCam.x - camera.position.x) * 0.05;
        camera.position.y += (targetCam.y - camera.position.y) * 0.05;
        camera.lookAt(0, 0, 0);

        // 10.3 Raycaster Test
        if (mouse.x > -900) {
            raycaster.setFromCamera(mouse, camera);
            var intersects = raycaster.intersectObjects(hitMeshes);
            if (intersects.length > 0) {
                setHoveredNode(intersects[0].object.userData.nodeIndex);
            } else {
                clearHoveredNode();
            }
        }

        // 10.4 Core System Rotation & Pulsation
        coreSphere.rotation.y = t * 0.20;
        coreWireframe.rotation.x = -t * 0.32;
        coreWireframe.rotation.y = t * 0.40;
        coreOuterLattice.rotation.y = -t * 0.16;
        coreOuterLattice.rotation.z = t * 0.12;

        energyRing1.rotation.z = t * 0.45;
        energyRing2.rotation.x = -t * 0.38;

        var pulseScale = 1.0 + 0.018 * Math.sin(t * 1.8);
        coreSystem.scale.set(pulseScale, pulseScale, pulseScale);

        coreParticles.rotation.y = t * 0.28;
        coreParticles.rotation.x = t * 0.15;

        // Ambient particles drift
        ambientPoints.rotation.y = t * 0.03;

        // 10.5 Orbit System Updates
        orbits.forEach(function(orb) {
            var prog = (t * orb.speed + orb.offset) % 1.0;
            if (prog < 0) prog += 1.0;
            var pt = orb.curve.getPointAt(prog);
            orb.satellite.position.set(pt.x, pt.y, 0);
        });

        // 10.6 Node System Updates (Floating & HTML Projections)
        var dims = getViewportDims();
        var w = dims.width;
        var h = dims.height;

        nodes.forEach(function(node, idx) {
            var isHovered = (AICoreApp.hoveredNodeIndex === idx);
            var isStageActive = currentStage.active.indexOf(node.data.id) !== -1;

            // Organic 3D harmonic float
            var fy = node.basePos.y + Math.sin(t * 1.3 + node.data.phase) * 0.18;
            var fz = node.basePos.z + Math.cos(t * 1.1 + node.data.phase) * 0.15;
            node.group.position.set(node.basePos.x, fy, fz);

            // Torus spin
            node.torus.rotation.x = t * 0.75 + idx;
            node.torus.rotation.y = t * 0.55;

            // Scale & Emissive Lerp
            var targetScale = isHovered ? 1.30 : (isStageActive ? 1.14 : 1.0);
            node.group.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.12);

            var targetEmissive = isHovered ? 1.8 : (isStageActive ? 1.3 : 0.70);
            node.sphere.material.emissiveIntensity += (targetEmissive - node.sphere.material.emissiveIntensity) * 0.12;

            // Project 3D coordinate to HTML Overlay Label
            if (node.labelEl) {
                var screenPos = node.group.position.clone().project(camera);
                var lx = (screenPos.x * 0.5 + 0.5) * w;
                var ly = (-(screenPos.y * 0.5) + 0.5) * h;
                node.labelEl.style.transform = 'translate(-50%, -50%) translate(' + lx.toFixed(1) + 'px, ' + ly.toFixed(1) + 'px)';
                node.labelEl.style.opacity = screenPos.z > 1.0 ? '0' : '1';

                if (isStageActive && !isHovered) {
                    node.labelEl.style.borderColor = node.data.color;
                    node.labelEl.style.boxShadow = '0 0 14px ' + node.data.color;
                } else if (!isHovered) {
                    node.labelEl.style.borderColor = 'rgba(129, 140, 248, 0.32)';
                    node.labelEl.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.45)';
                }

                // Tooltip follow hovered node
                if (isHovered && tooltip) {
                    tooltip.style.transform = 'translate(-50%, -100%) translate(' + lx.toFixed(1) + 'px, ' + (ly - 24).toFixed(1) + 'px)';
                }
            }
        });

        // 10.7 Connection System Updates (Line Vertices & Data Packets)
        var coreOrigin = new THREE.Vector3(0, 0, 0);
        connections.forEach(function(conn, cIdx) {
            var n = conn.node;
            var isHovered = (AICoreApp.hoveredNodeIndex === cIdx);
            var isStageActive = currentStage.active.indexOf(n.data.id) !== -1;

            // Update line coordinates
            var posAttr = conn.line.geometry.attributes.position;
            posAttr.setXYZ(0, 0, 0, 0);
            posAttr.setXYZ(1, n.group.position.x, n.group.position.y, n.group.position.z);
            posAttr.needsUpdate = true;

            var targetLineOpacity = isHovered ? 0.85 : (isStageActive ? 0.60 : 0.24);
            conn.line.material.opacity += (targetLineOpacity - conn.line.material.opacity) * 0.12;

            // Animate 2 data packets per connection
            var speedMultiplier = isStageActive ? 0.55 : 0.32;
            conn.packets.forEach(function(pkt) {
                var prog = (t * speedMultiplier + pkt.offset) % 1.0;
                var start = (n.data.flow === 'in') ? n.group.position : coreOrigin;
                var end   = (n.data.flow === 'in') ? coreOrigin : n.group.position;
                pkt.mesh.position.copy(start).lerp(end, prog);
            });
        });

        // Render Scene
        renderer.render(scene, camera);
    }

    // Start Animation Loop
    animate();

    // Trigger Initial Boot Animation
    triggerAnalysisSequence();

    // Expose API on window for external control
    window.AICore3D = {
        app: AICoreApp,
        triggerAnalysis: triggerAnalysisSequence,
        openNode: openNodeModal,
        stages: STAGES
    };

})();
