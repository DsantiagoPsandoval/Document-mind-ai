// DocuMind AI - High-Tech Interactive Application Logic

document.addEventListener("DOMContentLoaded", () => {
    // 1. Dynamic Cursor Spotlight Glow
    const spotlight = document.getElementById("cursor-spotlight");
    if (spotlight) {
        window.addEventListener("mousemove", (e) => {
            spotlight.style.left = `${e.clientX}px`;
            spotlight.style.top = `${e.clientY}px`;
        });
    }

    // 2. Dynamic Card Spotlight Glow on Mousemove
    const glowCards = document.querySelectorAll(".glow-card");
    glowCards.forEach((card) => {
        card.addEventListener("mousemove", (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            card.style.setProperty("--mouse-x", `${x}px`);
            card.style.setProperty("--mouse-y", `${y}px`);
        });
    });

    // 3. Toast Notification Helper
    const toastContainer = document.getElementById("toast-container");
    function showToast(message, type = "info") {
        if (!toastContainer) return;
        const toast = document.createElement("div");
        toast.className = `px-4 py-3 rounded-xl border text-xs font-semibold shadow-2xl flex items-center space-x-2 transition-all duration-300 transform translate-y-4 opacity-0 pointer-events-auto ${
            type === "success" 
                ? "bg-emerald-950/90 border-emerald-500 text-emerald-200 shadow-emerald-950/50" 
                : "bg-slate-900/90 border-cyan-500 text-cyan-200 shadow-cyan-950/50"
        }`;
        
        const icon = type === "success" ? "fa-circle-check text-emerald-400" : "fa-bell text-cyan-400";
        toast.innerHTML = `<i class="fa-solid ${icon}"></i><span>${message}</span>`;
        
        toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.classList.remove("translate-y-4", "opacity-0");
        }, 50);

        setTimeout(() => {
            toast.classList.add("opacity-0", "translate-y-2");
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    // 4. Mobile Menu Toggle
    const mobileMenuBtn = document.getElementById("mobile-menu-btn");
    const mobileMenu = document.getElementById("mobile-menu");

    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener("click", () => {
            mobileMenu.classList.toggle("hidden");
        });

        mobileMenu.querySelectorAll("a").forEach(link => {
            link.addEventListener("click", () => {
                mobileMenu.classList.add("hidden");
            });
        });
    }

    // 5. Dynamic Visitor & Early Adopter Counters
    const visitorCounter = document.getElementById("visitor-counter");
    const registeredCounter = document.getElementById("registered-counter");
    const spotsLeft = document.getElementById("spots-left");

    let visitors = parseInt(localStorage.getItem("documind_visitors") || "1250", 10);
    let registered = parseInt(localStorage.getItem("documind_registered") || "186", 10);
    let availableSpots = Math.max(2, 200 - registered);

    visitors += Math.floor(Math.random() * 3) + 1;
    localStorage.setItem("documind_visitors", visitors.toString());

    if (visitorCounter) visitorCounter.textContent = visitors.toLocaleString("es-CO");
    if (registeredCounter) registeredCounter.textContent = registered.toLocaleString("es-CO");
    if (spotsLeft) spotsLeft.textContent = `🔥 ${availableSpots} cupos restantes`;

    // Live tick simulator
    setInterval(() => {
        if (Math.random() > 0.65) {
            visitors += 1;
            if (visitorCounter) visitorCounter.textContent = visitors.toLocaleString("es-CO");
            localStorage.setItem("documind_visitors", visitors.toString());
        }
    }, 10000);

    // 6. Interactive AST & LLM Simulator
    const btnRunAnalysis = document.getElementById("btn-run-analysis");
    const repoInput = document.getElementById("repo-input");
    const langSelect = document.getElementById("lang-select");
    const terminalLog = document.getElementById("terminal-log");
    const docPreview = document.getElementById("doc-preview");

    const analysisTemplates = {
        ts: {
            files: "142 archivos parseados (TypeScript AST Tree)",
            endpoints: "28 endpoints REST y 14 esquemas DTO detectados",
            diagram: "Diagrama de flujo de autenticación JWT renderizado",
            title: "Arquitectura: Auth & User Service (TypeScript)",
            desc: "Este módulo expone la API de autenticación distribuida bajo arquitectura hexagonal. Las llamadas entrantes validan tokens firmados con RSA-256 contra la entidad UserSecurityContext.",
            endpointsHtml: `
                <p class="text-purple-300 font-bold">Endpoints detectados:</p>
                <p><span class="text-emerald-400 font-bold">POST</span> /api/v1/auth/login <span class="text-slate-500">-> AuthHandler.ts:L42</span></p>
                <p><span class="text-emerald-400 font-bold">POST</span> /api/v1/auth/refresh <span class="text-slate-500">-> TokenService.ts:L89</span></p>
                <p><span class="text-sky-400 font-bold">GET</span>  /api/v1/user/profile <span class="text-slate-500">-> Bearer Auth Protected</span></p>
            `,
            onboarding: "Para correr localmente, ejecuta <code>docker compose up db redis</code> y configura la variable <code>JWT_SECRET</code>."
        },
        py: {
            files: "98 archivos parseados (FastAPI Python AST Tree)",
            endpoints: "19 routers asíncronos y 32 modelos Pydantic v2",
            diagram: "Grafo de dependencias Celery + Redis Task Queue",
            title: "Arquitectura: Async Worker & Analytics API (Python)",
            desc: "Servicio de alta concurrencia para procesamiento de datos analíticos. Implementa inyección de dependencias nativa de FastAPI y pool asíncrono con SQLAlchemy 2.0.",
            endpointsHtml: `
                <p class="text-purple-300 font-bold">Endpoints detectados:</p>
                <p><span class="text-emerald-400 font-bold">POST</span> /v2/analytics/stream <span class="text-slate-500">-> events.py:L24</span></p>
                <p><span class="text-sky-400 font-bold">GET</span>  /v2/metrics/summary <span class="text-slate-500">-> reporting.py:L110</span></p>
                <p><span class="text-rose-400 font-bold">DELETE</span> /v2/cache/flush <span class="text-slate-500">-> AdminOnly</span></p>
            `,
            onboarding: "Instala dependencias con <code>poetry install</code> y levanta el worker con <code>celery -A worker.celery_app worker -l info</code>."
        },
        go: {
            files: "64 paquetes Go parseados (AST Struct & Interface Graph)",
            endpoints: "35 gRPC services y 12 HTTP Handlers con Gin",
            diagram: "Topología de comunicación Inter-Service mTLS",
            title: "Arquitectura: Core Gateway Service (Golang)",
            desc: "Microservicio de alto rendimiento encargado del enrutamiento perimetral, rate limiting con token bucket y balanceo de carga gRPC bidireccional.",
            endpointsHtml: `
                <p class="text-purple-300 font-bold">Servicios detectados:</p>
                <p><span class="text-indigo-400 font-bold">gRPC</span> PaymentService.ProcessTransaction <span class="text-slate-500">-> proto/payment.pb.go</span></p>
                <p><span class="text-emerald-400 font-bold">POST</span> /gateway/v1/checkout <span class="text-slate-500">-> checkout.go:L55</span></p>
                <p><span class="text-sky-400 font-bold">GET</span>  /healthz <span class="text-slate-500">-> Probe: Readiness & Liveness</span></p>
            `,
            onboarding: "Compila el binario con <code>go build -o server cmd/main.go</code> y valida la configuración con <code>./server --config=dev.yaml</code>."
        },
        java: {
            files: "210 clases Java parseadas (Spring AST & Annotations)",
            endpoints: "42 @RestController endpoints y 18 Repositorios JPA",
            diagram: "Diagrama C4 Nivel 2: Spring Security + Hibernate + Kafka",
            title: "Arquitectura: Enterprise Core Service (Java Spring Boot)",
            desc: "Arquitectura orientada a dominio (DDD) con capa de persistencia transaccional y consumidores de eventos Kafka para eventos de integración B2B.",
            endpointsHtml: `
                <p class="text-purple-300 font-bold">Endpoints detectados:</p>
                <p><span class="text-emerald-400 font-bold">POST</span> /api/enterprise/v1/invoices <span class="text-slate-500">-> @PostMapping InvoiceController</span></p>
                <p><span class="text-sky-400 font-bold">GET</span>  /api/enterprise/v1/reports <span class="text-slate-500">-> @GetMapping ReportService</span></p>
                <p><span class="text-amber-400 font-bold">PUT</span>  /api/enterprise/v1/status <span class="text-slate-500">-> @PutMapping StatusManager</span></p>
            `,
            onboarding: "Ejecuta con <code>./mvnw spring-boot:run</code> y consulta Swagger en <code>/swagger-ui.html</code>."
        }
    };

    if (btnRunAnalysis) {
        btnRunAnalysis.addEventListener("click", () => {
            const repo = repoInput ? repoInput.value.trim() : "github.com/organization/repo";
            const lang = langSelect ? langSelect.value : "ts";
            const tpl = analysisTemplates[lang] || analysisTemplates.ts;

            btnRunAnalysis.disabled = true;
            btnRunAnalysis.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-2"></i> Analizando Repositorio...`;

            if (terminalLog) {
                terminalLog.innerHTML = `
                    <p class="text-slate-500">$ documind analyze --repo ${repo}</p>
                    <p class="text-cyan-400 animate-pulse">[1/4] Parseando AST de archivos fuente en ${lang.toUpperCase()}...</p>
                `;
            }

            setTimeout(() => {
                if (terminalLog) {
                    terminalLog.innerHTML += `
                        <p class="text-slate-400">✔ ${tpl.files}</p>
                        <p class="text-cyan-400 animate-pulse">[2/4] Mapeando grafo de llamadas y dependencias...</p>
                    `;
                    terminalLog.scrollTop = terminalLog.scrollHeight;
                }
            }, 500);

            setTimeout(() => {
                if (terminalLog) {
                    terminalLog.innerHTML += `
                        <p class="text-slate-400">✔ ${tpl.endpoints}</p>
                        <p class="text-cyan-400 animate-pulse">[3/4] Generando especificación OpenAPI & Diagramas C4...</p>
                    `;
                    terminalLog.scrollTop = terminalLog.scrollHeight;
                }
            }, 1000);

            setTimeout(() => {
                if (terminalLog) {
                    terminalLog.innerHTML += `
                        <p class="text-slate-400">✔ ${tpl.diagram}</p>
                        <p class="text-emerald-400 font-semibold">[4/4] Sincronización completa. Documentación viva generada en 1.2s.</p>
                    `;
                    terminalLog.scrollTop = terminalLog.scrollHeight;
                }

                if (docPreview) {
                    docPreview.innerHTML = `
                        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h4 class="font-bold text-white text-sm flex items-center">
                                <i class="fa-solid fa-book-open text-cyan-400 mr-2"></i>
                                <span>${tpl.title}</span>
                            </h4>
                            <span class="bg-emerald-950 text-emerald-400 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border border-emerald-800/60">En Tiempo Real</span>
                        </div>
                        <p class="text-slate-300 leading-relaxed">${tpl.desc}</p>
                        <div class="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800 font-mono text-[11px] space-y-1 text-slate-300">
                            ${tpl.endpointsHtml}
                        </div>
                        <div class="p-3 bg-cyan-950/40 rounded-xl border border-cyan-800/50 text-cyan-200">
                            <span class="font-bold">💡 Guía de Onboarding:</span> ${tpl.onboarding}
                        </div>
                    `;
                }

                btnRunAnalysis.disabled = false;
                btnRunAnalysis.innerHTML = `<i class="fa-solid fa-rotate-right mr-2 text-xs"></i> Re-ejecutar Análisis`;
                showToast("¡Análisis AST completado y documentación sincronizada!", "success");
            }, 1500);
        });
    }

    // 7. Interactive Role Chips Selection
    const roleChips = document.querySelectorAll(".role-chip");
    const selectedRoleInput = document.getElementById("selected-role");

    roleChips.forEach(chip => {
        chip.addEventListener("click", () => {
            roleChips.forEach(c => c.classList.remove("active"));
            chip.classList.add("active");
            if (selectedRoleInput) {
                selectedRoleInput.value = chip.getAttribute("data-role");
            }
        });
    });

    // 8. Early Adopters Lead Form & VIP Pass Generator
    const leadForm = document.getElementById("lead-form");
    const vipPassResult = document.getElementById("vip-pass-result");
    const passHolderName = document.getElementById("pass-holder-name");
    const passIdCode = document.getElementById("pass-id-code");
    const passInviteLink = document.getElementById("pass-invite-link");
    const btnCopyPass = document.getElementById("btn-copy-pass");

    if (leadForm) {
        leadForm.addEventListener("submit", (e) => {
            e.preventDefault();

            const name = document.getElementById("name").value.trim();
            const email = document.getElementById("email").value.trim();
            const role = selectedRoleInput ? selectedRoleInput.value : "tech_lead";
            const repoSize = document.getElementById("repo_size").value;
            const ciCdTool = document.getElementById("ci_cd_tool").value;
            const comments = document.getElementById("comments").value.trim();

            const passId = "DOCU-2026-" + Math.random().toString(36).substring(2, 7).toUpperCase();

            const leadData = {
                id: Date.now(),
                passId,
                name,
                email,
                role,
                repoSize,
                ciCdTool,
                comments,
                createdAt: new Date().toISOString()
            };

            // Save in localStorage
            const existingLeads = JSON.parse(localStorage.getItem("documind_leads") || "[]");
            existingLeads.push(leadData);
            localStorage.setItem("documind_leads", JSON.stringify(existingLeads));

            // Update registered counter and spots
            registered += 1;
            localStorage.setItem("documind_registered", registered.toString());
            if (registeredCounter) registeredCounter.textContent = registered.toLocaleString("es-CO");
            
            availableSpots = Math.max(1, availableSpots - 1);
            if (spotsLeft) spotsLeft.textContent = `🔥 ${availableSpots} cupos restantes`;

            // Display VIP Pass
            if (passHolderName) passHolderName.textContent = name;
            if (passIdCode) passIdCode.textContent = passId;
            if (passInviteLink) passInviteLink.textContent = `https://documind-ai.unilibrebog.edu.co/?pass=${passId}`;

            if (vipPassResult) {
                vipPassResult.classList.remove("hidden");
                vipPassResult.scrollIntoView({ behavior: "smooth", block: "center" });
            }

            showToast(`¡Pase VIP ${passId} generado con éxito!`, "success");
            leadForm.reset();
        });
    }

    // 9. Copy VIP Pass Link
    if (btnCopyPass && passInviteLink) {
        btnCopyPass.addEventListener("click", () => {
            navigator.clipboard.writeText(passInviteLink.textContent).then(() => {
                btnCopyPass.innerHTML = `<i class="fa-solid fa-check mr-1"></i> ¡Copiado!`;
                showToast("Enlace de pase copiado al portapapeles", "success");
                setTimeout(() => {
                    btnCopyPass.innerHTML = `<i class="fa-solid fa-copy mr-1"></i> Copiar`;
                }, 2500);
            });
        });
    }
});
