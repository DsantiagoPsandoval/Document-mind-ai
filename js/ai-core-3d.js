/**
 * DOCUMENT-MIND AI — 3D COMPUTATIONAL AI CORE ENGINE (ENTERPRISE EDITION v5.0)
 * Three.js + WebGL Architecture with Sci-Fi Holographic HUD & Quantum Interactions
 *
 * Hierarchical Scene Graph:
 * scene
 * ├── environmentGroup (Physical Lights, Ambient 3D Cosmic Particles)
 * ├── coreSystem (Multi-Layer Reactor, Metallic Glass Shell, 3 Gimbal Toruses, Swirling Nano Particles)
 * ├── orbitSystem (4 Tilted Torus 3D Orbits with Travelling Satellite Meshes)
 * ├── nodeSystem (7 Faceted 3D Crystals + Inner Glowing Cores + Holographic Reticles + Sonar Rings)
 * ├── connectionSystem (3D Connection Laser Lines & Multi-Speed Flowing Data Packets)
 * └── interactionSystem (Raycaster, Parallax Micro-Tilt, Holographic HUD Tooltip, Subsystem Modes)
 */

(function() {
    'use strict';

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
        amber: 0xF59E0B,
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
        selectedNodeData: null,
        activeSubsystemMode: 'all', // 'all', 'ast', 'c4', 'sec'
        pulseTriggeredAt: 0
    };

    if (('ontouchstart' in window) || (navigator.maxTouchPoints > 0)) {
        AICoreApp.isTouchDevice = true;
    }
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        AICoreApp.performanceMode = true;
    }

    // Stages / State Machine
    var STAGES = [
        { id: 'ANALYZING', label: 'ANÁLISIS DE REPOSITORIO', color: '#38BDF8', hex: PALETTE.techCyan, active: ['code'] },
        { id: 'BUILDING_AST', label: 'CONSTRUCCIÓN DE AST', color: '#818CF8', hex: PALETTE.indigo, active: ['ast'] },
        { id: 'MAPPING_ARCH', label: 'MAPEADO DE ARQUITECTURA', color: '#818CF8', hex: PALETTE.indigo, active: ['c4', 'api', 'db'] },
        { id: 'GENERATING_DOCS', label: 'GENERACIÓN DOCUMENTAL', color: '#38BDF8', hex: PALETTE.techCyan, active: ['docs'] },
        { id: 'SYNC_COMPLETE', label: 'SINCRONIZACIÓN COMPLETA', color: '#34D399', hex: PALETTE.emerald, active: ['sync'] }
    ];

    // Deliberate Spatial 3D Composition with Rich Engineering Metadata
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
            phase: 0.2,
            latency: '0.8 ms',
            throughput: '64 MB/s',
            specs: 'Clasificación multiextensión de 40+ lenguajes sin compilar.',
            code: '// Ingestión de árbol en memoria RAM (Zero-Retention)\nconst tree = await scanSourceTree(repoBuffer, {\n  ignore: [".git", "node_modules", "dist"],\n  maxFileSizeMb: 10\n});'
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
            phase: 1.4,
            latency: '1.2 ms',
            throughput: '48 MB/s',
            specs: 'Parsing semántico políglota (Babel, AST TypeScript, Python AST).',
            code: '// Extracción AST profunda políglota\nconst ast = parseSourceTree(sourceCode, {\n  plugins: ["typescript", "jsx", "decorators"],\n  tokens: true,\n  depth: 12\n});'
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
            phase: 2.6,
            latency: '2.4 ms',
            throughput: '120 docs/min',
            specs: 'Generación con plantillas IEEE 830, PRD y Word editorial.',
            code: '// Generador documental empresarial\nconst docx = await generateDocxSuite({\n  template: "IEEE_830_SRS",\n  includeC4Diagrams: true,\n  format: "a4_editorial"\n});'
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
            phase: 3.8,
            latency: '1.6 ms',
            throughput: '32 diagrams/s',
            specs: 'Modelos C4 de Simon Brown exportables a Mermaid y SVG.',
            code: '// Diagrama C4 Contenedores y Servicios\nconst c4Model = buildC4Model({\n  boundaries: ["Frontend", "Gateway", "Core", "Workers"],\n  format: "mermaid_c4"\n});'
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
            phase: 5.0,
            latency: '0.9 ms',
            throughput: '85 endpoints/s',
            specs: 'Extracción estática de rutas Express, FastAPI, Django y NestJS.',
            code: '// Extracción estática de contratos OpenAPI 3.1\nconst openapi = extractRoutesFromAST(ast, {\n  basePath: "/api/v1",\n  includeSchemas: true\n});'
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
            phase: 2.2,
            latency: '1.4 ms',
            throughput: '40 models/s',
            specs: 'Detección de Prisma, TypeORM, SQLAlchemy y Mongoose.',
            code: '// Mapeo relacional de entidades y esquemas ORM\nconst erDiagram = mapOrmEntities(files, {\n  detectForeignKeys: true,\n  outputFormat: "mermaid_er"\n});'
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
            phase: 0.8,
            latency: '0.5 ms',
            throughput: '100% Zero-Drift',
            specs: 'Webhooks idempotentes validados con HMAC SHA-256.',
            code: '// Despachador de sincronización continua CI/CD\nconst verified = verifyHmacSha256(payload, signature, secret);\nif (verified) await syncDocumentation(payload.ref);'
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

    function handleResize() {
        var dims = getViewportDims();
        var w = dims.width;
        var h = dims.height;
        if (w === 0 || h === 0) return;

        camera.aspect = w / h;

        if (w < 340) {
            camera.position.z = 21.5;
            nodeSystem.scale.setScalar(0.68);
            orbitSystem.scale.setScalar(0.70);
            coreSystem.scale.setScalar(0.74);
            connectionSystem.scale.setScalar(0.68);
        } else if (w < 480) {
            camera.position.z = 20.0;
            nodeSystem.scale.setScalar(0.76);
            orbitSystem.scale.setScalar(0.78);
            coreSystem.scale.setScalar(0.82);
            connectionSystem.scale.setScalar(0.76);
        } else if (w < 768) {
            camera.position.z = 18.5;
            nodeSystem.scale.setScalar(0.84);
            orbitSystem.scale.setScalar(0.84);
            coreSystem.scale.setScalar(0.86);
            connectionSystem.scale.setScalar(0.84);
        } else {
            camera.position.z = 18.0;
            nodeSystem.scale.setScalar(0.85);
            orbitSystem.scale.setScalar(0.85);
            coreSystem.scale.setScalar(0.88);
            connectionSystem.scale.setScalar(0.85);
        }

        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
    }

    handleResize();
    window.addEventListener('resize', handleResize, { passive: true });
    if (window.ResizeObserver) {
        var ro = new ResizeObserver(function() { handleResize(); });
        ro.observe(wrapper);
    }

    // ==========================================
    // 2. ENVIRONMENT GROUP: PHYSICAL LIGHTS & AMBIENT DUST
    // ==========================================
    var ambientLight = new THREE.AmbientLight(PALETTE.deepSlate, 2.6);
    environmentGroup.add(ambientLight);

    var keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
    keyLight.position.set(10, 16, 14);
    environmentGroup.add(keyLight);

    var fillLight = new THREE.DirectionalLight(PALETTE.indigo, 0.85);
    fillLight.position.set(-12, -10, 8);
    environmentGroup.add(fillLight);

    // Cosmic Dust Particles
    var particleCount = (AICoreApp.performanceMode || isMobile) ? 55 : 140;
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
    // 3. CORE SYSTEM: MULTI-LAYER 3D AI REACTOR
    // ==========================================
    var coreInnerGeo = new THREE.SphereGeometry(1.0, 32, 32);
    var coreInnerMat = new THREE.MeshBasicMaterial({
        color: PALETTE.techCyan,
        transparent: true,
        opacity: 0.45
    });
    var coreInner = new THREE.Mesh(coreInnerGeo, coreInnerMat);
    coreSystem.add(coreInner);

    var coreMidGeo = new THREE.SphereGeometry(1.3, 32, 32);
    var coreMidMat = new THREE.MeshBasicMaterial({
        color: PALETTE.indigo,
        transparent: true,
        opacity: 0.28
    });
    var coreMid = new THREE.Mesh(coreMidGeo, coreMidMat);
    coreSystem.add(coreMid);

    var coreSphereGeo = new THREE.SphereGeometry(1.68, 48, 48);
    var coreSphereMat = new THREE.MeshPhysicalMaterial({
        color: 0x0c1e36,
        emissive: 0x072844,
        emissiveIntensity: 0.70,
        roughness: 0.12,
        metalness: 0.88,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
        transmission: 0.45,
        ior: 1.5,
        transparent: true,
        opacity: 0.92
    });
    var coreSphere = new THREE.Mesh(coreSphereGeo, coreSphereMat);
    coreSystem.add(coreSphere);

    var coreWireGeo = new THREE.IcosahedronGeometry(1.88, 2);
    var coreWireMat = new THREE.MeshBasicMaterial({
        color: PALETTE.techCyan,
        wireframe: true,
        transparent: true,
        opacity: 0.35
    });
    var coreWireframe = new THREE.Mesh(coreWireGeo, coreWireMat);
    coreSystem.add(coreWireframe);

    var coreOuterLatticeGeo = new THREE.IcosahedronGeometry(2.1, 1);
    var coreOuterLatticeMat = new THREE.MeshBasicMaterial({
        color: PALETTE.indigo,
        wireframe: true,
        transparent: true,
        opacity: 0.22
    });
    var coreOuterLattice = new THREE.Mesh(coreOuterLatticeGeo, coreOuterLatticeMat);
    coreSystem.add(coreOuterLattice);

    // Three Real 3D Torus Gimbal Rings
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

    var corePointLight = new THREE.PointLight(PALETTE.techCyan, 4.5, 30);
    corePointLight.position.set(0, 0, 0);
    coreSystem.add(corePointLight);

    var corePartCount = (AICoreApp.performanceMode || isMobile) ? 35 : 70;
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
        opacity: 0.85,
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
    // 5. NODE SYSTEM: ENHANCED 3D NODES & HOLOGRAPHIC RETICLES
    // ==========================================
    var overlay = document.getElementById('ai-nodes-overlay');
    var nodes = [];
    var hitMeshes = [];

    NODES_DATA.forEach(function(data, idx) {
        var group = new THREE.Group();
        group.position.set(data.pos[0], data.pos[1], data.pos[2]);

        // 5.1 Faceted Technological 3D Crystal
        var crystalGeo = new THREE.OctahedronGeometry(0.40, 0);
        var crystalMat = new THREE.MeshPhysicalMaterial({
            color: 0x0F172A,
            emissive: data.hex,
            emissiveIntensity: 0.95,
            roughness: 0.12,
            metalness: 0.92,
            clearcoat: 1.0,
            clearcoatRoughness: 0.1,
            flatShading: true
        });
        var crystalMesh = new THREE.Mesh(crystalGeo, crystalMat);
        group.add(crystalMesh);

        // 5.2 Glowing Inner Core Refraction
        var innerCoreGeo = new THREE.OctahedronGeometry(0.19, 0);
        var innerCoreMat = new THREE.MeshBasicMaterial({
            color: data.hex,
            wireframe: true,
            transparent: true,
            opacity: 0.85
        });
        var innerCoreMesh = new THREE.Mesh(innerCoreGeo, innerCoreMat);
        group.add(innerCoreMesh);

        // 5.3 Inner Orbital Ring around Node
        var ringGeo = new THREE.TorusGeometry(0.62, 0.026, 12, 36);
        var ringMat = new THREE.MeshBasicMaterial({
            color: data.hex,
            transparent: true,
            opacity: 0.70
        });
        var ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = Math.PI / 3;
        group.add(ringMesh);

        // 5.4 Outer Holographic HUD Reticle (Target Bracket)
        var reticleGeo = new THREE.TorusGeometry(0.85, 0.016, 8, 36, Math.PI * 1.75);
        var reticleMat = new THREE.MeshBasicMaterial({
            color: data.hex,
            transparent: true,
            opacity: 0.18
        });
        var reticleMesh = new THREE.Mesh(reticleGeo, reticleMat);
        reticleMesh.rotation.z = Math.PI / 4;
        group.add(reticleMesh);

        // 5.5 Concentric Sonar Expanding Ripple Wave
        var sonarGeo = new THREE.TorusGeometry(0.65, 0.024, 8, 36);
        var sonarMat = new THREE.MeshBasicMaterial({
            color: data.hex,
            transparent: true,
            opacity: 0.0,
            blending: THREE.AdditiveBlending
        });
        var sonarMesh = new THREE.Mesh(sonarGeo, sonarMat);
        sonarMesh.rotation.x = Math.PI / 2;
        group.add(sonarMesh);

        // 5.6 Invisible Hit Mesh for raycasting
        var hitGeo = new THREE.SphereGeometry(1.2, 16, 16);
        var hitMat = new THREE.MeshBasicMaterial({ visible: false });
        var hitMesh = new THREE.Mesh(hitGeo, hitMat);
        hitMesh.userData = { nodeIndex: idx, type: data.id, nodeData: data };
        group.add(hitMesh);
        hitMeshes.push(hitMesh);

        nodeSystem.add(group);

        // 5.7 Projected HTML Label
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
            innerCore: innerCoreMesh,
            ring: ringMesh,
            reticle: reticleMesh,
            sonar: sonarMesh,
            sonarScale: 1.0,
            sonarOpacity: 0.0,
            labelEl: labelEl
        });
    });

    // ==========================================
    // 6. CONNECTION SYSTEM: 3D LASER LINES & DATA PACKETS
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

        // 4 Fast Glowing Data Packets per line
        var packets = [];
        for (var pk = 0; pk < 4; pk++) {
            var pktGeo = new THREE.SphereGeometry(0.12, 14, 14);
            var pktMat = new THREE.MeshBasicMaterial({ color: node.data.hex });
            var pktMesh = new THREE.Mesh(pktGeo, pktMat);
            connectionSystem.add(pktMesh);
            packets.push({
                mesh: pktMesh,
                offset: pk * 0.25
            });
        }

        connections.push({
            node: node,
            line: line,
            packets: packets
        });
    });

    // ==========================================
    // 7. INTERACTION: RAYCASTER, TOUCH, HOVER & PARALLAX
    // ==========================================
    var raycaster = new THREE.Raycaster();
    var pointer = new THREE.Vector2(-999, -999);
    var targetCam = new THREE.Vector2(0, 0);

    var tooltip = document.getElementById('ai-tooltip');
    var tooltipTag = document.getElementById('ai-tooltip-tag');
    var tooltipTitle = document.getElementById('ai-tooltip-title');
    var tooltipDesc = document.getElementById('ai-tooltip-desc');
    var tooltipStatus = document.getElementById('ai-tooltip-status');
    var tooltipSpec1 = document.getElementById('ai-tooltip-spec1');
    var tooltipSpec2 = document.getElementById('ai-tooltip-spec2');
    var tooltipSpec3 = document.getElementById('ai-tooltip-spec3');

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

        if (e.pointerType !== 'touch' && !AICoreApp.isTouchDevice) {
            targetCam.x = pointer.x * 1.5;
            targetCam.y = pointer.y * 1.2;
        }
    }

    wrapper.addEventListener('pointermove', updatePointer, { passive: true });
    wrapper.addEventListener('pointerleave', function() {
        pointer.x = -999;
        pointer.y = -999;
        targetCam.x = 0;
        targetCam.y = 0;
        clearHoveredNode();
    });

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
        if (dx < 8 && dy < 8 && pointer.x > -900) {
            raycaster.setFromCamera(pointer, camera);
            var hits = raycaster.intersectObjects(hitMeshes);
            if (hits.length > 0) {
                var nodeData = hits[0].object.userData.nodeData;
                var nIdx = hits[0].object.userData.nodeIndex;
                setHoveredNode(nIdx);
                openNodeModal(nodeData);
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

        // Trigger Sonar Pulse wave
        n.sonarScale = 0.5;
        n.sonarOpacity = 1.0;

        // Camera micro-tilt towards hovered node
        if (!AICoreApp.isTouchDevice) {
            targetCam.x = pointer.x * 1.5 + (n.basePos.x * 0.16);
            targetCam.y = pointer.y * 1.2 + (n.basePos.y * 0.16);
        }

        // Fill Hologram HUD Tooltip
        if (tooltip) {
            if (tooltipTag) {
                tooltipTag.textContent = n.data.tag;
                tooltipTag.style.color = n.data.color;
                tooltipTag.style.borderColor = n.data.color;
            }
            if (tooltipTitle) tooltipTitle.textContent = n.data.title;
            if (tooltipDesc) tooltipDesc.textContent = n.data.desc;
            if (tooltipStatus) tooltipStatus.textContent = 'PIPELINE ACTIVO';
            if (tooltipSpec1) tooltipSpec1.textContent = n.data.latency;
            if (tooltipSpec2) tooltipSpec2.textContent = 'Zero-Retention';
            if (tooltipSpec3) tooltipSpec3.textContent = n.data.throughput;

            var innerCard = tooltip.querySelector('.ai-hologram-inner');
            if (innerCard) {
                innerCard.style.borderColor = n.data.color;
                innerCard.style.boxShadow = '0 12px 35px rgba(0,0,0,0.7), 0 0 25px ' + n.data.color + '44';
            }
            tooltip.style.display = 'block';
        }

        if (n.labelEl) n.labelEl.classList.add('active');

        // Central Reactor Sympathetic Reaction
        corePointLight.color.setHex(n.data.hex);
        corePointLight.intensity = 8.5;
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

        // Reset light to cyan default unless a manual state is active
        if (!AICoreApp.manualState) {
            corePointLight.color.setHex(PALETTE.techCyan);
            corePointLight.intensity = 4.5;
        }
    }

    function positionTooltip(lx, ly) {
        if (!tooltip) return;
        var wrapRect = wrapper.getBoundingClientRect();
        var tipRect = tooltip.getBoundingClientRect();
        var tipW = tipRect.width || 250;
        var tipH = tipRect.height || 140;
        var halfW = tipW / 2;

        var wrapW = wrapRect.width || 440;
        var wrapH = wrapRect.height || 440;

        // Horizontally clamp inside canvas with 12px margin
        var clampedX = Math.max(halfW + 12, Math.min(wrapW - halfW - 12, lx));

        // Vertically: prefer above node
        var clampedY = ly - 36;
        // If it goes above top edge, place below node
        if (clampedY - tipH < 12) {
            clampedY = ly + tipH + 36;
        }
        // If it still goes beyond bottom, clamp to bottom edge
        if (clampedY > wrapH - 12) {
            clampedY = wrapH - 12;
        }

        tooltip.style.left = '0px';
        tooltip.style.top = '0px';
        tooltip.style.transform = 'translate(-50%, -100%) translate(' + clampedX.toFixed(1) + 'px, ' + clampedY.toFixed(1) + 'px)';
    }

    // ==========================================
    // 8. MODAL, HUD TABS & QUANTUM PULSE
    // ==========================================
    var modal = document.getElementById('ai-node-modal');
    var modalTitle = document.getElementById('ai-modal-title');
    var modalTag = document.getElementById('ai-modal-tag');
    var modalDesc = document.getElementById('ai-modal-desc');
    var modalClose = document.getElementById('ai-modal-close');
    var modalFlow = document.getElementById('ai-modal-flow');
    var modalLat = document.getElementById('ai-modal-lat');
    var modalThru = document.getElementById('ai-modal-thru');
    var modalCode = document.getElementById('ai-modal-code');
    var modalTryBtn = document.getElementById('ai-modal-try-btn');

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
        if (modalFlow) modalFlow.textContent = data.flow === 'in' ? 'Ingestión In-Memory (Zero-Retention)' : 'Generación Directa (Zero-Drift)';
        if (modalLat) modalLat.textContent = data.latency || '1.2 ms';
        if (modalThru) modalThru.textContent = data.throughput || '48 MB/s';
        if (modalCode) modalCode.textContent = data.code || '// Contrato de arquitectura DocuMind AI';

        // Reset to specs tab
        switchModalTab('specs');
        modal.style.display = 'flex';
    }

    function switchModalTab(tabId) {
        document.querySelectorAll('.ai-modal-tab-btn').forEach(function(b) {
            b.classList.toggle('active', b.dataset.tab === tabId);
        });
        document.querySelectorAll('.ai-modal-tab-pane').forEach(function(p) {
            p.style.display = (p.id === 'ai-tab-' + tabId) ? 'block' : 'none';
        });
    }

    document.querySelectorAll('.ai-modal-tab-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            switchModalTab(this.dataset.tab);
        });
    });

    if (modalClose) {
        modalClose.addEventListener('click', function() {
            if (modal) modal.style.display = 'none';
        });
    }

    if (modalTryBtn) {
        modalTryBtn.addEventListener('click', function() {
            if (modal) modal.style.display = 'none';
            var analizadorSection = document.getElementById('analizador');
            if (analizadorSection) {
                analizadorSection.scrollIntoView({ behavior: 'smooth' });
                // Trigger analysis sequence on 3D core
                triggerAnalysisSequence();
            }
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
            AICoreApp.activeSubsystemMode = 'all';
            document.querySelectorAll('.ai-mode-btn').forEach(function(b) {
                b.classList.toggle('active', b.dataset.mode === 'all');
            });
        });
    }

    // Subsystem Quick Filter Buttons
    document.querySelectorAll('.ai-mode-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.ai-mode-btn').forEach(function(b) { b.classList.remove('active'); });
            this.classList.add('active');
            var mode = this.dataset.mode;
            AICoreApp.activeSubsystemMode = mode;

            if (mode === 'ast') {
                setProcessingState('ANALYZING_CODE', 'SUBSISTEMA: AST & CODE');
            } else if (mode === 'c4') {
                setProcessingState('DETECTING_ARCH', 'SUBSISTEMA: C4 MODEL');
            } else if (mode === 'sec') {
                setProcessingState('SUCCESS', 'SUBSISTEMA: DEVSECOPS & SYNC');
            } else {
                AICoreApp.manualState = null;
                updateHUDStatus(STAGES[AICoreApp.currentStageIndex]);
            }
        });
    });

    // Quantum Pulse Trigger
    var btnQuantumPulse = document.getElementById('ai-btn-quantum-pulse');
    if (btnQuantumPulse) {
        btnQuantumPulse.addEventListener('click', function() {
            triggerQuantumPulse();
        });
    }

    function triggerQuantumPulse() {
        AICoreApp.pulseTriggeredAt = performance.now();
        corePointLight.intensity = 12.0;
        corePointLight.color.setHex(0xFFFFFF);

        nodes.forEach(function(n) {
            n.sonarScale = 0.4;
            n.sonarOpacity = 1.0;
        });

        if (hudStatusLabel) hudStatusLabel.textContent = '⚡ PULSO CUÁNTICO EJECUTADO';

        setTimeout(function() {
            corePointLight.color.setHex(PALETTE.techCyan);
            corePointLight.intensity = 4.5;
            if (!AICoreApp.manualState) updateHUDStatus(STAGES[AICoreApp.currentStageIndex]);
        }, 1200);
    }

    var btnRunHeroAnalysis = document.getElementById('btn-hero-analyze');
    if (btnRunHeroAnalysis) {
        btnRunHeroAnalysis.addEventListener('click', function() {
            triggerAnalysisSequence();
        });
    }

    function triggerAnalysisSequence() {
        AICoreApp.manualState = null;
        AICoreApp.currentStageIndex = 0;
        AICoreApp.stageTimer = performance.now();
        updateHUDStatus(STAGES[0]);
        triggerQuantumPulse();
    }

    var PROCESSING_STATES = {
        IDLE: { label: 'AI CORE • LISTO PARA ANÁLISIS', color: '#38BDF8', hex: PALETTE.techCyan, active: ['code', 'docs'], speed: 1.0, light: 4.5 },
        ANALYZING_PROJECT: { label: 'Analizando proyecto...', color: '#38BDF8', hex: PALETTE.techCyan, active: ['code'], speed: 1.5, light: 5.5 },
        DETECTING_ARCH: { label: 'Detectando arquitectura...', color: '#818CF8', hex: PALETTE.indigo, active: ['c4'], speed: 1.7, light: 6.5 },
        ANALYZING_CODE: { label: 'Analizando componentes...', color: '#818CF8', hex: PALETTE.indigo, active: ['ast', 'api'], speed: 2.0, light: 7.2 },
        ANALYZING_DATA: { label: 'Construyendo modelo de datos...', color: '#818CF8', hex: PALETTE.indigo, active: ['db'], speed: 1.9, light: 7.0 },
        GENERATING_DIAGRAMS: { label: 'Generando diagramas...', color: '#38BDF8', hex: PALETTE.techCyan, active: ['c4', 'db', 'ast'], speed: 2.2, light: 8.0 },
        GENERATING_DOCS: { label: 'Generando documentación...', color: '#38BDF8', hex: PALETTE.techCyan, active: ['docs'], speed: 2.1, light: 7.5 },
        SUCCESS: { label: 'Documentación completada', color: '#34D399', hex: PALETTE.emerald, active: ['sync', 'docs'], speed: 1.2, light: 5.5 },
        ERROR: { label: 'NÚCLEO EN ESPERA (LISTO)', color: '#38BDF8', hex: PALETTE.techCyan, active: ['code'], speed: 1.0, light: 4.5 },
        LOADING: { label: 'Analizando proyecto...', color: '#38BDF8', hex: PALETTE.techCyan, active: ['code'], speed: 1.5, light: 5.5 },
        PROCESSING: { label: 'Detectando arquitectura...', color: '#818CF8', hex: PALETTE.indigo, active: ['c4'], speed: 1.7, light: 6.5 },
        ANALYZING: { label: 'Generando documentación...', color: '#38BDF8', hex: PALETTE.techCyan, active: ['docs'], speed: 2.1, light: 7.5 }
    };

    function setProcessingState(stateName, customLabel) {
        var stateConfig = PROCESSING_STATES[stateName] || PROCESSING_STATES.IDLE;
        AICoreApp.manualState = {
            id: stateName,
            label: customLabel || stateConfig.label,
            color: stateConfig.color,
            hex: stateConfig.hex,
            active: stateConfig.active,
            speed: stateConfig.speed
        };
        updateHUDStatus(AICoreApp.manualState);
        corePointLight.color.setHex(stateConfig.hex);
        corePointLight.intensity = stateConfig.light;

        if (stateName === 'SUCCESS') {
            setTimeout(function() {
                corePointLight.color.setHex(PALETTE.techCyan);
                corePointLight.intensity = 4.5;
            }, 4000);
        }
    }

    // ==========================================
    // 9. ANIMATION LOOP & SCI-FI RENDERING
    // ==========================================
    var clock = new THREE.Clock();
    var lastStageSwitch = performance.now();

    function animate() {
        requestAnimationFrame(animate);

        if (AICoreApp.isPaused) return;

        var delta = clock.getDelta();
        var t = clock.getElapsedTime();

        // 9.1 Stage Cycle
        var now = performance.now();
        if (!AICoreApp.manualState && now - lastStageSwitch > 4400) {
            AICoreApp.currentStageIndex = (AICoreApp.currentStageIndex + 1) % STAGES.length;
            lastStageSwitch = now;
            updateHUDStatus(STAGES[AICoreApp.currentStageIndex]);
        }

        var currentStage = AICoreApp.manualState || STAGES[AICoreApp.currentStageIndex];

        // 9.2 Camera Parallax
        if (!AICoreApp.isTouchDevice) {
            camera.position.x += (targetCam.x - camera.position.x) * 0.05;
            camera.position.y += (targetCam.y - camera.position.y) * 0.05;
            camera.lookAt(0, 0, 0);
        }

        // 9.3 Raycaster Test
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
        var coreSpeed = (AICoreApp.hoveredNodeIndex !== -1) ? 2.2 : 1.0;
        coreSphere.rotation.y = t * 0.20 * coreSpeed;
        coreInner.scale.setScalar(1.0 + 0.08 * Math.sin(t * 2.8 * coreSpeed));
        coreWireframe.rotation.x = -t * 0.30 * coreSpeed;
        coreWireframe.rotation.y = t * 0.38 * coreSpeed;
        coreOuterLattice.rotation.y = -t * 0.16 * coreSpeed;
        coreOuterLattice.rotation.z = t * 0.12 * coreSpeed;

        gimbal1.rotation.z = t * 0.40 * coreSpeed;
        gimbal2.rotation.x = -t * 0.32 * coreSpeed;
        gimbal3.rotation.y = t * 0.28 * coreSpeed;

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

            // Subsystem filtering mode
            var modeMatches = true;
            if (AICoreApp.activeSubsystemMode === 'ast') {
                modeMatches = (node.data.id === 'code' || node.data.id === 'ast');
            } else if (AICoreApp.activeSubsystemMode === 'c4') {
                modeMatches = (node.data.id === 'c4' || node.data.id === 'docs');
            } else if (AICoreApp.activeSubsystemMode === 'sec') {
                modeMatches = (node.data.id === 'sync' || node.data.id === 'db' || node.data.id === 'api');
            }

            // Harmonic float
            var fy = node.basePos.y + Math.sin(t * 1.3 + node.data.phase) * 0.18;
            var fz = node.basePos.z + Math.cos(t * 1.1 + node.data.phase) * 0.15;
            node.group.position.set(node.basePos.x, fy, fz);

            // Spin crystal and inner core
            var spinMultiplier = isHovered ? 2.5 : 1.0;
            node.crystal.rotation.y = t * 0.85 * spinMultiplier + idx;
            node.crystal.rotation.x = t * 0.45 * spinMultiplier;
            node.innerCore.rotation.y = -t * 1.2 * spinMultiplier;
            node.ring.rotation.z = -t * 0.60 * spinMultiplier;

            // Animate Reticle
            var reticleTargetScale = isHovered ? 1.35 : 1.0;
            node.reticle.scale.lerp(new THREE.Vector3(reticleTargetScale, reticleTargetScale, reticleTargetScale), 0.15);
            node.reticle.rotation.z = t * (isHovered ? -3.5 : -0.8);
            var reticleTargetOpacity = isHovered ? 0.95 : (isStageActive ? 0.45 : 0.15);
            node.reticle.material.opacity += (reticleTargetOpacity - node.reticle.material.opacity) * 0.15;

            // Animate Sonar Pulse
            if (node.sonarOpacity > 0.01) {
                node.sonarScale += delta * 2.8;
                node.sonarOpacity -= delta * 1.4;
                node.sonar.scale.setScalar(node.sonarScale);
                node.sonar.material.opacity = Math.max(0, node.sonarOpacity);
            } else {
                node.sonar.material.opacity = 0;
            }

            // Scale & Emissive Lerp
            var baseScale = isHovered ? 1.45 : (isStageActive ? 1.18 : (modeMatches ? 1.0 : 0.75));
            node.group.scale.lerp(new THREE.Vector3(baseScale, baseScale, baseScale), 0.15);

            var targetEmissive = isHovered ? 2.8 : (isStageActive ? 1.45 : (modeMatches ? 0.90 : 0.25));
            node.crystal.material.emissiveIntensity += (targetEmissive - node.crystal.material.emissiveIntensity) * 0.15;

            // Project 3D coordinate to HTML Label
            if (node.labelEl) {
                var screenPos = node.group.position.clone().project(camera);
                var lx = (screenPos.x * 0.5 + 0.5) * w;
                var ly = (-(screenPos.y * 0.5) + 0.5) * h;
                var isNodeActive = isHovered || (node.labelEl && node.labelEl.classList.contains('active'));
                var scaleCss = isNodeActive ? ' scale(1.10)' : '';
                node.labelEl.style.transform = 'translate(-50%, 28px) translate(' + lx.toFixed(1) + 'px, ' + ly.toFixed(1) + 'px)' + scaleCss;
                node.labelEl.style.opacity = (screenPos.z > 1.0 || !modeMatches) ? '0.2' : '1';

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
        var hasAnyHover = (AICoreApp.hoveredNodeIndex !== -1);

        connections.forEach(function(conn, cIdx) {
            var n = conn.node;
            var isHovered = (AICoreApp.hoveredNodeIndex === cIdx);
            var isStageActive = currentStage.active.indexOf(n.data.id) !== -1;

            var posAttr = conn.line.geometry.attributes.position;
            posAttr.setXYZ(0, 0, 0, 0);
            posAttr.setXYZ(1, n.group.position.x, n.group.position.y, n.group.position.z);
            posAttr.needsUpdate = true;

            var targetLineOpacity;
            if (isHovered) {
                targetLineOpacity = 1.0;
            } else if (hasAnyHover) {
                targetLineOpacity = 0.08; // Dims other lines to spotlight active link
            } else if (isStageActive) {
                targetLineOpacity = 0.70;
            } else {
                targetLineOpacity = 0.25;
            }

            conn.line.material.opacity += (targetLineOpacity - conn.line.material.opacity) * 0.16;

            // Travel speed & packet scaling
            var speedMultiplier = isHovered ? 1.6 : (isStageActive ? 0.65 : 0.35);
            var pktScale = isHovered ? 1.65 : 1.0;

            conn.packets.forEach(function(pkt) {
                var prog = (t * speedMultiplier + pkt.offset) % 1.0;
                var start = (n.data.flow === 'in') ? n.group.position : coreOrigin;
                var end   = (n.data.flow === 'in') ? coreOrigin : n.group.position;
                pkt.mesh.position.copy(start).lerp(end, prog);
                pkt.mesh.scale.setScalar(pktScale);
            });
        });

        renderer.render(scene, camera);
    }

    if (window.IntersectionObserver && wrapper) {
        var coreVisObserver = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                AICoreApp.isPaused = !entry.isIntersecting || document.hidden;
            });
        }, { threshold: 0.05 });
        coreVisObserver.observe(wrapper);
    }
    document.addEventListener('visibilitychange', function() {
        AICoreApp.isPaused = document.hidden;
    });

    animate();
    triggerAnalysisSequence();

    // ==========================================
    // 10. GLOBAL PAGE INTERACTIVITY: SPOTLIGHT TRACKING
    // ==========================================
    if (!AICoreApp.isTouchDevice) {
        document.addEventListener('mousemove', function(e) {
            var cards = document.querySelectorAll('.glow-card, .solucion-card-premium, .card-enterprise, .pricing-card, .como-funciona-card, .card-spotlight');
            cards.forEach(function(card) {
                var rect = card.getBoundingClientRect();
                if (e.clientX >= rect.left - 60 && e.clientX <= rect.right + 60 &&
                    e.clientY >= rect.top - 60 && e.clientY <= rect.bottom + 60) {
                    var x = e.clientX - rect.left;
                    var y = e.clientY - rect.top;
                    card.style.setProperty('--mouse-x', x + 'px');
                    card.style.setProperty('--mouse-y', y + 'px');
                    card.classList.add('card-spotlight');
                }
            });
        }, { passive: true });
    }

    // Expose API
    window.AICore3D = {
        app: AICoreApp,
        triggerAnalysis: triggerAnalysisSequence,
        triggerPulse: triggerQuantumPulse,
        setProcessingState: setProcessingState,
        openNode: openNodeModal,
        stages: STAGES
    };

})();
