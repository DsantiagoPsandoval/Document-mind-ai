// ============================================================
// DOCUMENT-MIND AI — CLIENT APPLICATION CONTROLLER
// Complete functional integration with real backend API, dual pipeline,
// contextual chat, 3D AI Core state machine, and persistent history.
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
    // ------------------------------------------------------------
    // 1. Dynamic Cursor Spotlight Glow (Passive + rAF throttled)
    // ------------------------------------------------------------
    const spotlight = document.getElementById("cursor-spotlight");
    if (spotlight) {
        let spotRaf = false;
        window.addEventListener("mousemove", (e) => {
            if (!spotRaf) {
                spotRaf = true;
                requestAnimationFrame(() => {
                    spotlight.style.left = `${e.clientX}px`;
                    spotlight.style.top = `${e.clientY}px`;
                    spotRaf = false;
                });
            }
        }, { passive: true });
    }

    // ------------------------------------------------------------
    // 2. Dynamic Card Spotlight Glow on Mousemove (Passive)
    // ------------------------------------------------------------
    const glowCards = document.querySelectorAll(".glow-card");
    glowCards.forEach((card) => {
        card.addEventListener("mousemove", (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            card.style.setProperty("--mouse-x", `${x}px`);
            card.style.setProperty("--mouse-y", `${y}px`);
        }, { passive: true });
    });

    // ------------------------------------------------------------
    // 3. Toast Notification Helper
    // ------------------------------------------------------------
    const toastContainer = document.getElementById("toast-container");
    function showToast(message, type = "info") {
        if (!toastContainer) return;
        const toast = document.createElement("div");
        toast.className = `px-4 py-3 rounded-xl border text-xs font-semibold shadow-2xl flex items-center space-x-2 transition-all duration-300 transform translate-y-4 opacity-0 pointer-events-auto ${
            type === "success" 
                ? "bg-emerald-950/90 border-emerald-500 text-emerald-200 shadow-emerald-950/50" 
                : type === "error"
                ? "bg-rose-950/90 border-rose-500 text-rose-200 shadow-rose-950/50"
                : "bg-slate-900/90 border-cyan-500 text-cyan-200 shadow-cyan-950/50"
        }`;
        
        const icon = type === "success" 
            ? "fa-circle-check text-emerald-400" 
            : type === "error"
            ? "fa-circle-xmark text-rose-400"
            : "fa-bell text-cyan-400";

        toast.innerHTML = `<i class="fa-solid ${icon}" style="margin-right:.4rem;"></i><span>${message}</span>`;
        
        toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.classList.remove("translate-y-4", "opacity-0");
        }, 50);

        setTimeout(() => {
            toast.classList.add("opacity-0", "translate-y-2");
            setTimeout(() => toast.remove(), 300);
        }, 4500);
    }

    // ============================================================
    // SUPABASE AUTHENTICATION & DATABASE CONTROLLER
    // ============================================================
    let supabaseClient = null;
    let currentUser = null;
    let isSupabaseConfigured = false;
    let authMode = "login"; // "login" | "signup"

    // DOM Elements - Nav & User Capsule
    const navAuthGuest = document.getElementById("nav-auth-guest");
    const btnOpenAuthModal = document.getElementById("btn-open-auth-modal");
    const navAuthUser = document.getElementById("nav-auth-user");
    const userMenuBtn = document.getElementById("user-menu-btn");
    const navUserAvatar = document.getElementById("nav-user-avatar");
    const navUserEmail = document.getElementById("nav-user-email");
    const userDropdownMenu = document.getElementById("user-dropdown-menu");
    const dropdownUserEmail = document.getElementById("dropdown-user-email");
    const btnUserHistory = document.getElementById("btn-user-history");
    const btnLogout = document.getElementById("btn-logout");

    // DOM Elements - Mobile Menu Auth
    const mobileAuthGuest = document.getElementById("mobile-auth-guest");
    const mobileAuthUser = document.getElementById("mobile-auth-user");
    const btnMobileOpenAuth = document.getElementById("btn-mobile-open-auth");
    const mobileUserEmail = document.getElementById("mobile-user-email");
    const btnMobileLogout = document.getElementById("btn-mobile-logout");

    // DOM Elements - Modal
    const authModal = document.getElementById("auth-modal");
    const authModalBackdrop = document.getElementById("auth-modal-backdrop");
    const btnCloseAuthModal = document.getElementById("btn-close-auth-modal");
    const authUnconfiguredAlert = document.getElementById("auth-unconfigured-alert");
    const authTabLogin = document.getElementById("auth-tab-login");
    const authTabSignup = document.getElementById("auth-tab-signup");
    const authAlertBox = document.getElementById("auth-alert-box");
    const authForm = document.getElementById("auth-form");
    const authFieldFullname = document.getElementById("auth-field-fullname");
    const authFullname = document.getElementById("auth-fullname");
    const authEmail = document.getElementById("auth-email");
    const authPassword = document.getElementById("auth-password");
    const btnTogglePwd = document.getElementById("btn-toggle-pwd");
    const btnToggleForgot = document.getElementById("btn-toggle-forgot");
    const btnAuthSubmit = document.getElementById("btn-auth-submit");
    const authSubmitLabel = document.getElementById("auth-submit-label");
    const forgotForm = document.getElementById("forgot-form");
    const forgotEmail = document.getElementById("forgot-email");
    const btnCancelForgot = document.getElementById("btn-cancel-forgot");

    function setAuthAlert(message, type = "error") {
        if (!authAlertBox) return;
        if (!message) {
            authAlertBox.style.display = "none";
            authAlertBox.innerHTML = "";
            return;
        }
        authAlertBox.style.display = "block";
        if (type === "error") {
            authAlertBox.style.background = "rgba(244, 63, 94, 0.12)";
            authAlertBox.style.border = "1px solid rgba(244, 63, 94, 0.35)";
            authAlertBox.style.color = "#FB7185";
            authAlertBox.innerHTML = `<i class="fa-solid fa-circle-exclamation" style="margin-right:.4rem;"></i>${message}`;
        } else if (type === "success") {
            authAlertBox.style.background = "rgba(52, 211, 153, 0.12)";
            authAlertBox.style.border = "1px solid rgba(52, 211, 153, 0.35)";
            authAlertBox.style.color = "#34D399";
            authAlertBox.innerHTML = `<i class="fa-solid fa-circle-check" style="margin-right:.4rem;"></i>${message}`;
        } else {
            authAlertBox.style.background = "rgba(56, 189, 248, 0.12)";
            authAlertBox.style.border = "1px solid rgba(56, 189, 248, 0.35)";
            authAlertBox.style.color = "#38BDF8";
            authAlertBox.innerHTML = `<i class="fa-solid fa-circle-info" style="margin-right:.4rem;"></i>${message}`;
        }
    }

    function openAuthModal(mode = "login") {
        if (!authModal) return;
        setAuthAlert("");
        authMode = mode;
        switchAuthTab(mode);
        if (forgotForm) forgotForm.style.display = "none";
        if (authForm) authForm.style.display = "block";
        if (authUnconfiguredAlert) {
            authUnconfiguredAlert.style.display = isSupabaseConfigured ? "none" : "block";
        }
        authModal.classList.remove("hidden");
        document.body.style.overflow = "hidden";
        setTimeout(() => {
            if (authEmail) authEmail.focus();
        }, 150);
    }

    function closeAuthModal() {
        if (!authModal) return;
        authModal.classList.add("hidden");
        document.body.style.overflow = "";
        setAuthAlert("");
    }

    function switchAuthTab(mode) {
        authMode = mode;
        setAuthAlert("");
        if (mode === "login") {
            if (authTabLogin) authTabLogin.classList.add("active");
            if (authTabSignup) authTabSignup.classList.remove("active");
            if (authFieldFullname) authFieldFullname.style.display = "none";
            if (authSubmitLabel) authSubmitLabel.textContent = "Iniciar Sesión";
        } else {
            if (authTabLogin) authTabLogin.classList.remove("active");
            if (authTabSignup) authTabSignup.classList.add("active");
            if (authFieldFullname) authFieldFullname.style.display = "block";
            if (authSubmitLabel) authSubmitLabel.textContent = "Crear Cuenta";
        }
    }

    function updateAuthUI(user) {
        currentUser = user;
        if (user) {
            if (navAuthGuest) navAuthGuest.style.display = "none";
            if (navAuthUser) navAuthUser.style.display = "inline-flex";
            if (mobileAuthGuest) mobileAuthGuest.style.display = "none";
            if (mobileAuthUser) mobileAuthUser.style.display = "flex";

            const email = user.email || "usuario";
            const name = (user.user_metadata && user.user_metadata.full_name) || email;
            const initials = name.substring(0, 2).toUpperCase();

            if (navUserAvatar) navUserAvatar.textContent = initials;
            if (navUserEmail) navUserEmail.textContent = email;
            if (dropdownUserEmail) dropdownUserEmail.textContent = email;
            if (mobileUserEmail) mobileUserEmail.textContent = email;
        } else {
            if (navAuthGuest) navAuthGuest.style.display = "inline-flex";
            if (navAuthUser) navAuthUser.style.display = "none";
            if (mobileAuthGuest) mobileAuthGuest.style.display = "block";
            if (mobileAuthUser) mobileAuthUser.style.display = "none";
            if (userDropdownMenu) userDropdownMenu.classList.add("hidden");
        }
    }

    // Initialize Supabase from Server API Config
    async function initSupabase() {
        try {
            const res = await fetch("/api/config/supabase");
            const config = await res.json();
            if (config.configured && window.supabase) {
                supabaseClient = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
                isSupabaseConfigured = true;

                // Check active session
                const { data: { session } } = await supabaseClient.auth.getSession();
                if (session && session.user) {
                    updateAuthUI(session.user);
                    loadSupabaseHistory();
                } else {
                    updateAuthUI(null);
                }

                // Listen to Auth state transitions
                supabaseClient.auth.onAuthStateChange(async (event, session) => {
                    const user = session ? session.user : null;
                    updateAuthUI(user);
                    if (event === "SIGNED_IN") {
                        showToast(`¡Sesión iniciada con éxito!`, "success");
                        loadSupabaseHistory();
                    } else if (event === "SIGNED_OUT") {
                        showToast("Sesión finalizada.", "info");
                        renderHistoryList();
                    }
                });
            } else {
                updateAuthUI(null);
            }
        } catch (err) {
            console.warn("Supabase initialization note:", err);
            updateAuthUI(null);
        }
    }
    initSupabase();

    // Event Listeners for Auth Modal
    if (btnOpenAuthModal) btnOpenAuthModal.addEventListener("click", () => openAuthModal("login"));
    if (btnMobileOpenAuth) btnMobileOpenAuth.addEventListener("click", () => {
        if (mobileMenu) mobileMenu.classList.add("hidden");
        openAuthModal("login");
    });
    if (btnCloseAuthModal) btnCloseAuthModal.addEventListener("click", closeAuthModal);
    if (authModalBackdrop) authModalBackdrop.addEventListener("click", closeAuthModal);

    window.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && authModal && !authModal.classList.contains("hidden")) {
            closeAuthModal();
        }
    });

    if (authTabLogin) authTabLogin.addEventListener("click", () => switchAuthTab("login"));
    if (authTabSignup) authTabSignup.addEventListener("click", () => switchAuthTab("signup"));

    // Password Toggle
    if (btnTogglePwd && authPassword) {
        btnTogglePwd.addEventListener("click", () => {
            const isPwd = authPassword.type === "password";
            authPassword.type = isPwd ? "text" : "password";
            btnTogglePwd.innerHTML = isPwd ? '<i class="fa-solid fa-eye-slash"></i>' : '<i class="fa-solid fa-eye"></i>';
        });
    }

    // Toggle Forgot Password Form
    if (btnToggleForgot) {
        btnToggleForgot.addEventListener("click", () => {
            if (authForm) authForm.style.display = "none";
            if (forgotForm) forgotForm.style.display = "block";
            setAuthAlert("");
        });
    }
    if (btnCancelForgot) {
        btnCancelForgot.addEventListener("click", () => {
            if (forgotForm) forgotForm.style.display = "none";
            if (authForm) authForm.style.display = "block";
            setAuthAlert("");
        });
    }

    // User Dropdown in Navbar
    if (userMenuBtn && userDropdownMenu) {
        userMenuBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            userDropdownMenu.classList.toggle("hidden");
        });
        document.addEventListener("click", (e) => {
            if (!userDropdownMenu.contains(e.target) && !userMenuBtn.contains(e.target)) {
                userDropdownMenu.classList.add("hidden");
            }
        });
    }

    if (btnUserHistory) {
        btnUserHistory.addEventListener("click", () => {
            if (userDropdownMenu) userDropdownMenu.classList.add("hidden");
            switchTab("history");
            const analizadorSection = document.getElementById("analizador");
            if (analizadorSection) analizadorSection.scrollIntoView({ behavior: "smooth" });
        });
    }

    // Logout Handlers
    async function handleLogout() {
        if (supabaseClient) {
            try {
                await supabaseClient.auth.signOut();
            } catch (err) {
                console.error("Logout error:", err);
            }
        }
        updateAuthUI(null);
        showToast("Sesión cerrada.", "info");
    }
    if (btnLogout) btnLogout.addEventListener("click", handleLogout);
    if (btnMobileLogout) btnMobileLogout.addEventListener("click", () => {
        if (mobileMenu) mobileMenu.classList.add("hidden");
        handleLogout();
    });

    // Submit Auth Form (Login or Signup)
    if (authForm) {
        authForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const email = authEmail ? authEmail.value.trim() : "";
            const password = authPassword ? authPassword.value : "";
            const fullname = authFullname ? authFullname.value.trim() : "";

            if (!email || !password) {
                setAuthAlert("Por favor ingresa tu correo y contraseña.");
                return;
            }

            if (!supabaseClient) {
                setAuthAlert("Supabase no está conectado todavía. Define SUPABASE_URL y SUPABASE_ANON_KEY en tu archivo .env.");
                return;
            }

            const originalBtnHtml = btnAuthSubmit.innerHTML;
            btnAuthSubmit.disabled = true;
            btnAuthSubmit.innerHTML = `<i class="fa-solid fa-spinner fa-spin" style="margin-right:.45rem;"></i>Procesando...`;
            setAuthAlert("");

            try {
                if (authMode === "login") {
                    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
                    if (error) throw error;
                    showToast(`¡Bienvenido de nuevo, ${email}!`, "success");
                    closeAuthModal();
                    authForm.reset();
                } else {
                    const { data, error } = await supabaseClient.auth.signUp({
                        email,
                        password,
                        options: {
                            data: { full_name: fullname }
                        }
                    });
                    if (error) throw error;
                    if (data && data.session) {
                        showToast("¡Cuenta creada exitosamente!", "success");
                        closeAuthModal();
                        authForm.reset();
                    } else {
                        setAuthAlert("¡Registro exitoso! Si se requiere confirmación, revisa el correo de activación.", "info");
                        authForm.reset();
                    }
                }
            } catch (err) {
                setAuthAlert(err.message || "Error al procesar la solicitud de autenticación.");
            } finally {
                btnAuthSubmit.disabled = false;
                btnAuthSubmit.innerHTML = originalBtnHtml;
            }
        });
    }

    // Submit Forgot Password Form
    if (forgotForm) {
        forgotForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const email = forgotEmail ? forgotEmail.value.trim() : "";
            if (!email) {
                setAuthAlert("Por favor ingresa tu correo registrado.");
                return;
            }
            if (!supabaseClient) {
                setAuthAlert("Supabase no está conectado todavía. Define SUPABASE_URL y SUPABASE_ANON_KEY en .env.");
                return;
            }

            const btn = document.getElementById("btn-forgot-submit");
            const originalBtnHtml = btn ? btn.innerHTML : "";
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin" style="margin-right:.45rem;"></i>Enviando...`;
            }

            try {
                const { error } = await supabaseClient.auth.resetPasswordForEmail(email);
                if (error) throw error;
                setAuthAlert("Se ha enviado un enlace de restablecimiento a tu correo.", "success");
                forgotForm.reset();
            } catch (err) {
                setAuthAlert(err.message || "Error al solicitar restablecimiento de contraseña.");
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = originalBtnHtml;
                }
            }
        });
    }

    // ------------------------------------------------------------
    // 4. Mobile Menu Toggle
    // ------------------------------------------------------------
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

    // ------------------------------------------------------------
    // 5. Counters
    // ------------------------------------------------------------
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

    // ------------------------------------------------------------
    // 6. Safe 3D AI Core State Helper
    // ------------------------------------------------------------
    function set3DCoreState(stateName, label) {
        if (window.AICore3D && typeof window.AICore3D.setProcessingState === 'function') {
            window.AICore3D.setProcessingState(stateName, label);
        }
    }

    // ------------------------------------------------------------
    // ------------------------------------------------------------
    // 7. Tab & Mode Switching (GitHub vs Archivos vs Manual vs Historial)
    // ------------------------------------------------------------
    const tabGhBtn = document.getElementById("tab-gh-btn");
    const tabDocBtn = document.getElementById("tab-doc-btn");
    const tabManualBtn = document.getElementById("tab-manual-btn");
    const tabHistoryBtn = document.getElementById("tab-history-btn");

    const panelGh = document.getElementById("panel-gh");
    const panelDoc = document.getElementById("panel-doc");
    const panelManual = document.getElementById("panel-manual");
    const panelHistory = document.getElementById("panel-history");

    let currentInputMode = "gh"; // "gh" | "doc" | "manual" | "history"

    function switchInputMode(mode) {
        currentInputMode = mode;
        [tabGhBtn, tabDocBtn, tabManualBtn, tabHistoryBtn].forEach(b => b && b.classList.remove("active"));
        [panelGh, panelDoc, panelManual, panelHistory].forEach(p => p && (p.style.display = "none"));

        const inputContainer = document.getElementById("project-input-container");
        if (inputContainer) {
            inputContainer.style.display = (mode === "history") ? "none" : "block";
        }

        if (mode === "gh") {
            if (tabGhBtn) tabGhBtn.classList.add("active");
            if (panelGh) panelGh.style.display = "block";
        } else if (mode === "doc") {
            if (tabDocBtn) tabDocBtn.classList.add("active");
            if (panelDoc) panelDoc.style.display = "block";
        } else if (mode === "manual") {
            if (tabManualBtn) tabManualBtn.classList.add("active");
            if (panelManual) panelManual.style.display = "block";
        } else if (mode === "history") {
            if (tabHistoryBtn) tabHistoryBtn.classList.add("active");
            if (panelHistory) panelHistory.style.display = "block";
            renderHistoryList();
        }
    }

    if (tabGhBtn) tabGhBtn.addEventListener("click", () => switchInputMode("gh"));
    if (tabDocBtn) tabDocBtn.addEventListener("click", () => switchInputMode("doc"));
    if (tabManualBtn) tabManualBtn.addEventListener("click", () => switchInputMode("manual"));
    if (tabHistoryBtn) tabHistoryBtn.addEventListener("click", () => switchInputMode("history"));

    // Hero action button hooks
    const btnHeroAnalyze = document.getElementById("btn-hero-analyze");
    if (btnHeroAnalyze) {
        btnHeroAnalyze.addEventListener("click", () => {
            switchInputMode("gh");
            const analizadorSec = document.getElementById("analizador");
            if (analizadorSec) {
                analizadorSec.scrollIntoView({ behavior: "smooth", block: "start" });
            }
            const repoInput = document.getElementById("repo-input");
            if (repoInput) repoInput.focus();
        });
    }

    // ------------------------------------------------------------
    // 8. File Upload & Dropzone Management
    // ------------------------------------------------------------
    const docDropzone = document.getElementById("doc-dropzone");
    const docFileInput = document.getElementById("doc-file-input");
    const btnBrowseFile = document.getElementById("btn-browse-file");
    const selectedFilesList = document.getElementById("selected-files-list");
    let uploadedFiles = [];

    if (btnBrowseFile && docFileInput) {
        btnBrowseFile.addEventListener("click", () => docFileInput.click());
    }

    if (docFileInput) {
        docFileInput.addEventListener("change", (e) => {
            handleSelectedFiles(Array.from(e.target.files));
        });
    }

    if (docDropzone) {
        ['dragenter', 'dragover'].forEach(evt => {
            docDropzone.addEventListener(evt, (e) => {
                e.preventDefault();
                docDropzone.classList.add('dragover');
            });
        });

        ['dragleave', 'drop'].forEach(evt => {
            docDropzone.addEventListener(evt, (e) => {
                e.preventDefault();
                docDropzone.classList.remove('dragover');
            });
        });

        docDropzone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            if (dt && dt.files && dt.files.length > 0) {
                handleSelectedFiles(Array.from(dt.files));
            }
        });
    }

    function handleSelectedFiles(newFiles) {
        newFiles.forEach(nf => {
            if (!uploadedFiles.some(f => f.name === nf.name && f.size === nf.size)) {
                uploadedFiles.push(nf);
            }
        });
        renderSelectedFiles();
    }

    function renderSelectedFiles() {
        if (!selectedFilesList) return;
        selectedFilesList.innerHTML = '';
        uploadedFiles.forEach((file, idx) => {
            const pill = document.createElement('div');
            pill.style.cssText = 'display:inline-flex;align-items:center;gap:.4rem;padding:.3rem .75rem;border-radius:999px;background:rgba(56,189,248,.12);border:1px solid rgba(56,189,248,.3);font-size:.74rem;color:#E2E8F0;font-family:monospace;';
            pill.innerHTML = `
                <i class="fa-solid fa-file" style="color:var(--tech-cyan);"></i>
                <span>${file.name} (${(file.size / 1024).toFixed(1)} KB)</span>
                <button type="button" style="background:none;border:none;color:#FB7185;cursor:pointer;margin-left:.25rem;" title="Eliminar"><i class="fa-solid fa-xmark"></i></button>
            `;
            pill.querySelector('button').addEventListener('click', (e) => {
                e.stopPropagation();
                uploadedFiles.splice(idx, 1);
                renderSelectedFiles();
            });
            selectedFilesList.appendChild(pill);
        });
    }

    // ------------------------------------------------------------
    // 9. Category Selection Checkbox Synchronizer
    // ------------------------------------------------------------
    const categoryCheckboxes = document.querySelectorAll('.category-check-card input[type="checkbox"]');
    categoryCheckboxes.forEach(cb => {
        cb.addEventListener('change', () => {
            const card = cb.closest('.category-check-card');
            if (card) {
                if (cb.checked) card.classList.add('checked');
                else card.classList.remove('checked');
            }
        });
    });

    function getSelectedCategories() {
        return {
            product: document.getElementById('cat-product')?.checked ?? true,
            architecture: document.getElementById('cat-architecture')?.checked ?? true,
            diagrams: document.getElementById('cat-diagrams')?.checked ?? true,
            database: document.getElementById('cat-database')?.checked ?? true,
            api: document.getElementById('cat-api')?.checked ?? true,
            development: document.getElementById('cat-development')?.checked ?? true,
            devops: document.getElementById('cat-devops')?.checked ?? true,
            qa: document.getElementById('cat-qa')?.checked ?? true,
            security: document.getElementById('cat-security')?.checked ?? true,
            adr: document.getElementById('cat-adr')?.checked ?? true,
            user: document.getElementById('cat-user')?.checked ?? true,
            readme: true
        };
    }

    // ------------------------------------------------------------
    // 10. Unified Project Analysis Execution Pipeline
    // ------------------------------------------------------------
    const btnRunAnalysis = document.getElementById("btn-run-analysis");
    const progressContainer = document.getElementById("project-progress-container");
    const progressStatus = document.getElementById("project-progress-status");
    const progressPct = document.getElementById("project-progress-pct");
    const progressFill = document.getElementById("project-progress-fill");
    const projectResults = document.getElementById("project-results");

    let currentAnalysisData = null;
    let currentProjectId = null;
    let projectChatHistory = [];
    let currentDiagramZoom = 1.0;

    const STAGE_CONFIGS = [
        { pct: 10, label: 'Iniciando ingestión y sanitización de secretos...', state: 'ANALYZING_PROJECT', step: 1 },
        { pct: 25, label: 'Analizando estructura, árbol de código y dependencias...', state: 'ANALYZING_PROJECT', step: 2 },
        { pct: 40, label: 'Detectando arquitectura y capas del sistema...', state: 'DETECTING_ARCH', step: 3 },
        { pct: 55, label: 'Analizando componentes, servicios y controladores...', state: 'ANALYZING_CODE', step: 4 },
        { pct: 70, label: 'Construyendo modelo de datos y esquemas...', state: 'ANALYZING_DATA', step: 5 },
        { pct: 82, label: 'Extrayendo endpoints y contratos de API...', state: 'ANALYZING_CODE', step: 6 },
        { pct: 92, label: 'Generando diagramas estructurados (Mermaid)...', state: 'GENERATING_DIAGRAMS', step: 7 },
        { pct: 98, label: 'Sintetizando documentación técnica completa...', state: 'GENERATING_DOCS', step: 8 }
    ];

    function setStageProgress(stageIdx) {
        const config = STAGE_CONFIGS[stageIdx] || STAGE_CONFIGS[0];
        if (progressFill) progressFill.style.width = `${config.pct}%`;
        if (progressPct) progressPct.textContent = `${config.pct}%`;
        if (progressStatus) progressStatus.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> ${config.label}`;
        
        set3DCoreState(config.state, config.label);

        // Update step pills
        for (let i = 1; i <= 8; i++) {
            const pill = document.getElementById(`step-${i}`);
            if (pill) {
                if (i < config.step) {
                    pill.className = 'stage-step-pill completed';
                } else if (i === config.step) {
                    pill.className = 'stage-step-pill active';
                } else {
                    pill.className = 'stage-step-pill';
                }
            }
        }
    }

    if (btnRunAnalysis) {
        btnRunAnalysis.addEventListener("click", executeDocumentationGeneration);
    }

    async function executeDocumentationGeneration() {
        const categories = getSelectedCategories();
        let payload = null;
        let isMultipart = false;

        if (currentInputMode === "gh") {
            const repoInput = document.getElementById("repo-input");
            const repoUrl = repoInput ? repoInput.value.trim() : "";
            if (!repoUrl) {
                showToast("Por favor ingresa la URL de un repositorio de GitHub.", "error");
                return;
            }
            payload = JSON.stringify({ repoUrl, categories });
        } else if (currentInputMode === "doc") {
            if (uploadedFiles.length === 0) {
                showToast("Por favor selecciona o arrastra al menos un archivo o ZIP del proyecto.", "error");
                return;
            }
            const fd = new FormData();
            uploadedFiles.forEach(f => fd.append('files', f));
            fd.append('projectName', uploadedFiles[0].name.replace(/\.[^/.]+$/, ""));
            fd.append('categories', JSON.stringify(categories));
            payload = fd;
            isMultipart = true;
        } else if (currentInputMode === "manual") {
            const manualInput = document.getElementById("manual-text-input");
            const manualText = manualInput ? manualInput.value.trim() : "";
            if (manualText.length < 20) {
                showToast("Por favor escribe una descripción técnica de al menos 20 caracteres.", "error");
                return;
            }
            payload = JSON.stringify({ manualText, projectName: "Especificación-Manual", categories });
        }

        // Lock button and start progress animation
        btnRunAnalysis.disabled = true;
        btnRunAnalysis.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> GENERANDO DOCUMENTACIÓN...';
        if (progressContainer) progressContainer.style.display = 'block';
        if (projectResults) projectResults.style.display = 'none';

        // Animate initial stages
        setStageProgress(0);
        let stageTimer = setInterval(() => {
            const currentW = parseInt(progressFill.style.width || '10');
            const nextIdx = STAGE_CONFIGS.findIndex(s => s.pct > currentW);
            if (nextIdx !== -1 && nextIdx < STAGE_CONFIGS.length - 1) {
                setStageProgress(nextIdx);
            }
        }, 1200);

        try {
            const fetchOptions = {
                method: 'POST',
                body: payload
            };
            if (!isMultipart) {
                fetchOptions.headers = { 'Content-Type': 'application/json' };
            }

            const res = await fetch('/api/project/analyze', fetchOptions);
            clearInterval(stageTimer);

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'No fue posible completar la generación.');
            }

            // Finish 100%
            if (progressFill) progressFill.style.width = '100%';
            if (progressPct) progressPct.textContent = '100%';
            if (progressStatus) progressStatus.innerHTML = '<i class="fa-solid fa-check"></i> Documentación completada con éxito';
            set3DCoreState('SUCCESS', 'Documentación completada');

            // Complete all pills
            for (let i = 1; i <= 8; i++) {
                const pill = document.getElementById(`step-${i}`);
                if (pill) pill.className = 'stage-step-pill completed';
            }

            currentAnalysisData = data;
            currentProjectId = data.projectId;
            projectChatHistory = [];

            setTimeout(() => {
                if (progressContainer) progressContainer.style.display = 'none';
                renderProjectResults(data);
                saveAnalysisToLocalHistory(data);
                showToast("¡Documentación técnica generada con éxito!", "success");
            }, 600);

        } catch (err) {
            clearInterval(stageTimer);
            set3DCoreState('ERROR', 'Error en el procesamiento');
            if (progressStatus) progressStatus.innerHTML = `<i class="fa-solid fa-circle-exclamation" style="color:#FB7185;"></i> ${err.message}`;
            showToast(err.message, "error");
        } finally {
            btnRunAnalysis.disabled = false;
            btnRunAnalysis.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles" style="margin-right:.5rem;"></i> GENERAR DOCUMENTACIÓN';
        }
    }

    // ------------------------------------------------------------
    // 11. Render Comprehensive Results Dashboard
    // ------------------------------------------------------------
    function renderProjectResults(data) {
        if (!projectResults) return;
        projectResults.style.display = 'block';
        projectResults.scrollIntoView({ behavior: 'smooth', block: 'start' });

        const repo = data.repository || {};
        const stats = data.stats || {};
        const doc = data.documentation || {};

        // 1. Header & Badges
        const resName = document.getElementById("res-project-name");
        if (resName) resName.textContent = repo.fullName || repo.name || 'Proyecto';

        const resBranch = document.getElementById("res-branch");
        if (resBranch) resBranch.textContent = repo.defaultBranch || 'main';

        const resLang = document.getElementById("res-lang");
        if (resLang) resLang.textContent = repo.primaryLanguage || 'Multi-lenguaje';

        const resFiles = document.getElementById("res-files-count");
        if (resFiles) resFiles.textContent = stats.relevantFilesCount || stats.totalFiles || 0;

        const resModeBadge = document.getElementById("res-mode-badge");
        if (resModeBadge) {
            resModeBadge.textContent = doc.isAiGenerated ? 'Gemini 2.5 Flash Cognition' : 'Análisis Estático Factual';
            resModeBadge.className = doc.isAiGenerated ? 'badge badge-cyan' : 'badge badge-emerald';
        }

        // 2. Summary KPI Cards
        setKpiText("kpi-lang", repo.primaryLanguage || 'Multi-lenguaje');
        setKpiText("kpi-frameworks", (data.detectedTechnologies || []).slice(0, 3).join(', ') || 'Nativo');
        setKpiText("kpi-db", (data.dataModels && data.dataModels.length > 0) ? `${data.dataModels.length} modelos` : (data.detectedTechnologies?.find(t => t.includes('SQL') || t.includes('Mongo') || t.includes('Supabase')) || 'No detectada'));
        setKpiText("kpi-arch", (doc.architecture && doc.architecture.c4Container) ? 'C4 Modular' : 'Modular');
        setKpiText("kpi-api", (data.endpoints || []).length);
        setKpiText("kpi-auth", (data.projectMap?.auth?.detected) ? 'Detectada' : 'No detectada');
        setKpiText("kpi-qa", (data.projectMap?.tests?.detected) ? `${data.projectMap.tests.testFilesCount} tests` : 'Plan Diseñado');
        setKpiText("kpi-devops", (data.projectMap?.devops?.detected) ? 'Configurado' : 'No detectado');

        // 3. Render Project Map
        renderProjectMap(data.projectMap, data.detectedTechnologies);

        // 4. Render File Explorer
        renderFileExplorer(data.relevantFilesList || []);

        // 5. Render Documentation Tabs
        renderProductTab(doc.product);
        renderArchitectureTab(doc.architecture);
        renderDiagramsTab(doc.diagrams);
        renderDatabaseTab(doc.database, data.dataModels);
        renderApiTab(doc.api, data.endpoints);
        renderDevelopmentTab(doc.development);
        renderDevOpsTab(doc.devops);
        renderQaTab(doc.qa);
        renderSecurityTab(data.security, doc.security);
        renderAdrTab(doc.adrs);
        renderUserGuideTab(doc.userGuide);

        // Default open product tab
        switchDocTab('product');
    }

    function setKpiText(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text || '-';
    }

    // ------------------------------------------------------------
    // 12. Project Map Visualizer
    // ------------------------------------------------------------
    function renderProjectMap(map, techs) {
        const grid = document.getElementById("project-map-grid");
        if (!grid) return;
        grid.innerHTML = '';

        const layers = [
            { id: 'frontend', title: 'FRONTEND', icon: 'fa-desktop', active: map?.frontend?.detected, detail: `${map?.frontend?.componentsCount || 0} componentes` },
            { id: 'backend', title: 'BACKEND', icon: 'fa-server', active: map?.backend?.detected, detail: `${(map?.backend?.controllersCount || 0) + (map?.backend?.servicesCount || 0)} módulos` },
            { id: 'api', title: 'API', icon: 'fa-network-wired', active: map?.api?.detected, detail: `${map?.api?.endpointsCount || 0} endpoints` },
            { id: 'database', title: 'DATABASE', icon: 'fa-database', active: map?.database?.detected, detail: `${map?.database?.modelsCount || 0} entidades` },
            { id: 'auth', title: 'AUTH', icon: 'fa-shield-halved', active: map?.auth?.detected, detail: map?.auth?.detected ? 'Activo' : 'No detectado' },
            { id: 'tests', title: 'TESTS', icon: 'fa-vial-circle-check', active: map?.tests?.detected, detail: `${map?.tests?.testFilesCount || 0} suites` },
            { id: 'devops', title: 'DEVOPS', icon: 'fa-gears', active: map?.devops?.detected, detail: map?.devops?.detected ? 'Detectado' : 'No detectado' }
        ];

        layers.forEach(l => {
            const card = document.createElement('div');
            card.className = `project-map-node ${l.active ? 'active' : ''}`;
            card.innerHTML = `
                <div class="project-map-icon"><i class="fa-solid ${l.icon}"></i></div>
                <strong style="font-size:.78rem;color:#fff;display:block;margin-bottom:.2rem;">${l.title}</strong>
                <span style="font-size:.68rem;color:${l.active ? 'var(--tech-cyan)' : '#64748B'};font-family:'JetBrains Mono',monospace;">${l.detail}</span>
            `;
            grid.appendChild(card);
        });
    }

    // ------------------------------------------------------------
    // 13. File Explorer with Classification & Search Filter
    // ------------------------------------------------------------
    let allRelevantFiles = [];

    function renderFileExplorer(files) {
        allRelevantFiles = files || [];
        const countBadge = document.getElementById("files-count-badge");
        if (countBadge) countBadge.textContent = `${allRelevantFiles.length} archivos`;

        filterAndDisplayFiles();

        const searchInput = document.getElementById("file-search-input");
        const catFilter = document.getElementById("file-cat-filter");

        if (searchInput) searchInput.oninput = filterAndDisplayFiles;
        if (catFilter) catFilter.onchange = filterAndDisplayFiles;
    }

    function filterAndDisplayFiles() {
        const searchInput = document.getElementById("file-search-input");
        const catFilter = document.getElementById("file-cat-filter");
        const list = document.getElementById("file-tree-list");
        if (!list) return;

        const q = (searchInput?.value || '').toLowerCase();
        const cat = catFilter?.value || 'ALL';

        const filtered = allRelevantFiles.filter(f => {
            const matchesQuery = f.path.toLowerCase().includes(q);
            const matchesCat = (cat === 'ALL') || (f.category === cat);
            return matchesQuery && matchesCat;
        });

        list.innerHTML = '';
        if (filtered.length === 0) {
            list.innerHTML = '<p style="padding:1.5rem;text-align:center;color:#64748B;font-size:.8rem;">No se encontraron archivos coincidentes.</p>';
            return;
        }

        filtered.forEach(file => {
            const row = document.createElement('div');
            row.className = 'file-tree-row';
            
            const badgeClass = getBadgeClassForCat(file.category);
            row.innerHTML = `
                <div style="display:flex;align-items:center;gap:.6rem;min-width:0;">
                    <i class="fa-solid fa-file-code" style="color:#818CF8;font-size:.85rem;"></i>
                    <span style="color:#E2E8F0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${file.path}</span>
                </div>
                <div style="display:flex;align-items:center;gap:.75rem;flex-shrink:0;">
                    <span class="file-category-badge ${badgeClass}">${file.category || 'CODE'}</span>
                    <span style="color:#64748B;font-size:.72rem;">${(file.size / 1024).toFixed(1)} KB</span>
                </div>
            `;
            list.appendChild(row);
        });
    }

    function getBadgeClassForCat(cat) {
        switch (cat) {
            case 'API': return 'badge-cat-api';
            case 'DATABASE': case 'MODEL': return 'badge-cat-db';
            case 'AUTHENTICATION': return 'badge-cat-auth';
            case 'DEVOPS': return 'badge-cat-devops';
            case 'TEST': return 'badge-cat-test';
            case 'DOCUMENTATION': return 'badge-cat-doc';
            default: return 'badge-cat-code';
        }
    }

    // ------------------------------------------------------------
    // 14. Documentation Tabs Navigation & Content Renderers
    // ------------------------------------------------------------
    const docTabs = document.querySelectorAll('.doc-nav-tab');
    docTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.docTab;
            switchDocTab(target);
        });
    });

    function switchDocTab(tabName) {
        docTabs.forEach(t => {
            if (t.dataset.docTab === tabName) t.classList.add('active');
            else t.classList.remove('active');
        });

        const panels = document.querySelectorAll('.doc-tab-panel');
        panels.forEach(p => {
            if (p.id === `doc-panel-${tabName}`) p.classList.add('active');
            else p.classList.remove('active');
        });

        if (tabName === 'diagrams') {
            renderActiveMermaid();
        }
    }

    function safeMarkdown(text) {
        if (!text) return 'Información no provista.';
        if (typeof marked !== 'undefined' && typeof marked.parse === 'function') {
            return marked.parse(text);
        }
        return text.replace(/\n/g, '<br>');
    }

    function renderProductTab(prod = {}) {
        const prdEl = document.getElementById("content-prd");
        if (prdEl) prdEl.innerHTML = safeMarkdown(prod.prd);

        const srsEl = document.getElementById("content-srs");
        if (srsEl) srsEl.innerHTML = safeMarkdown(prod.srs);

        const usEl = document.getElementById("content-user-stories");
        if (usEl) {
            usEl.innerHTML = '';
            (prod.userStories || []).forEach(us => {
                const card = document.createElement('div');
                card.style.cssText = 'background:rgba(9,13,22,.65);border:1px solid rgba(129,140,248,.15);border-radius:.65rem;padding:1.1rem;';
                card.innerHTML = `
                    <div style="font-size:.85rem;color:#fff;margin-bottom:.5rem;">
                        <strong>Como</strong> ${us.role}, <strong>quiero</strong> ${us.action}, <strong>para</strong> ${us.goal}.
                    </div>
                    <div style="font-size:.78rem;color:#94A3B8;background:rgba(15,23,42,.8);padding:.65rem .85rem;border-radius:.45rem;border-left:3px solid var(--emerald-sync);font-family:'JetBrains Mono',monospace;white-space:pre-wrap;">${us.acceptanceCriteria}</div>
                `;
                usEl.appendChild(card);
            });
        }
    }

    function renderArchitectureTab(arch = {}) {
        const ovEl = document.getElementById("content-arch-overview");
        if (ovEl) ovEl.textContent = arch.overview || 'Arquitectura modular adaptada a los archivos analizados.';

        const c1El = document.getElementById("content-c4-context");
        if (c1El) c1El.textContent = arch.c4Context || 'No determinado a partir del código analizado.';

        const c2El = document.getElementById("content-c4-container");
        if (c2El) c2El.textContent = arch.c4Container || 'No determinado a partir del código analizado.';

        const c3El = document.getElementById("content-c4-component");
        if (c3El) c3El.textContent = arch.c4Component || 'No determinado a partir del código analizado.';
    }

    // ------------------------------------------------------------
    // 15. Mermaid Diagrams Engine (Pan, Zoom, Export)
    // ------------------------------------------------------------
    const diagramTypeSelect = document.getElementById("diagram-type-select");
    if (diagramTypeSelect) {
        diagramTypeSelect.addEventListener("change", renderActiveMermaid);
    }

    const btnZoomIn = document.getElementById("btn-zoom-in");
    const btnZoomOut = document.getElementById("btn-zoom-out");
    const btnZoomReset = document.getElementById("btn-zoom-reset");
    const btnExportSvg = document.getElementById("btn-export-svg");
    const btnExportPng = document.getElementById("btn-export-png");
    const mermaidViewport = document.getElementById("mermaid-viewport");

    if (btnZoomIn) btnZoomIn.onclick = () => updateDiagramZoom(0.15);
    if (btnZoomOut) btnZoomOut.onclick = () => updateDiagramZoom(-0.15);
    if (btnZoomReset) btnZoomReset.onclick = () => { currentDiagramZoom = 1.0; applyDiagramZoom(); };

    function updateDiagramZoom(delta) {
        currentDiagramZoom = Math.max(0.4, Math.min(2.5, currentDiagramZoom + delta));
        applyDiagramZoom();
    }

    function applyDiagramZoom() {
        const renderArea = document.getElementById("mermaid-render-area");
        if (renderArea) {
            renderArea.style.transform = `scale(${currentDiagramZoom})`;
            renderArea.style.transformOrigin = 'center center';
        }
    }

    async function renderActiveMermaid() {
        const renderArea = document.getElementById("mermaid-render-area");
        if (!renderArea || !currentAnalysisData) return;

        const doc = currentAnalysisData.documentation || {};
        const diagrams = doc.diagrams || {};
        const type = diagramTypeSelect ? diagramTypeSelect.value : 'c4';

        let code = '';
        if (type === 'c4') code = diagrams.c4Mermaid;
        else if (type === 'erd') code = diagrams.erdMermaid;
        else if (type === 'sequence') code = diagrams.sequenceMermaid;
        else if (type === 'component') code = diagrams.componentMermaid;
        else if (type === 'flowchart') code = diagrams.processFlowMermaid;

        if (!code) {
            renderArea.innerHTML = '<p style="color:#64748B;font-size:.85rem;padding:2rem;">Diagrama no disponible para este proyecto.</p>';
            return;
        }

        renderArea.innerHTML = '<div style="color:var(--tech-cyan);font-size:.85rem;display:flex;align-items:center;gap:.5rem;"><i class="fa-solid fa-circle-notch fa-spin"></i> Renderizando diagrama Mermaid...</div>';

        try {
            if (typeof mermaid !== 'undefined') {
                mermaid.initialize({
                    startOnLoad: false,
                    theme: 'dark',
                    themeVariables: {
                        darkMode: true,
                        background: '#090D16',
                        primaryColor: '#0F172A',
                        primaryBorderColor: '#38BDF8',
                        primaryTextColor: '#F8FAFC',
                        lineColor: '#818CF8'
                    }
                });

                const id = `mermaid-${Date.now()}`;
                const { svg } = await mermaid.render(id, code);
                renderArea.innerHTML = svg;
                applyDiagramZoom();
            } else {
                renderArea.innerHTML = `<pre style="font-family:'JetBrains Mono',monospace;font-size:.78rem;color:#38BDF8;">${code}</pre>`;
            }
        } catch (mErr) {
            console.warn('[Mermaid Render Error]', mErr);
            renderArea.innerHTML = `<div style="text-align:left;width:100%;"><p style="color:#FB7185;font-size:.78rem;margin-bottom:.5rem;">Aviso: Sintaxis de diagrama en modo texto:</p><pre style="font-family:'JetBrains Mono',monospace;font-size:.76rem;color:#CBD5E1;background:rgba(15,23,42,.8);padding:1rem;border-radius:.6rem;overflow:auto;">${code}</pre></div>`;
        }
    }

    if (btnExportSvg) {
        btnExportSvg.addEventListener('click', () => {
            const svg = document.querySelector('#mermaid-render-area svg');
            if (!svg) {
                showToast("No hay un diagrama SVG disponible para descargar.", "error");
                return;
            }
            const svgData = new XMLSerializer().serializeToString(svg);
            const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `diagrama_${diagramTypeSelect.value || 'c4'}.svg`;
            a.click();
            URL.revokeObjectURL(url);
            showToast("Diagrama SVG exportado.", "success");
        });
    }

    if (btnExportPng) {
        btnExportPng.addEventListener('click', () => {
            const svg = document.querySelector('#mermaid-render-area svg');
            if (!svg) {
                showToast("No hay un diagrama disponible para exportar a PNG.", "error");
                return;
            }
            const svgData = new XMLSerializer().serializeToString(svg);
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            img.onload = () => {
                canvas.width = img.width || 1200;
                canvas.height = img.height || 800;
                ctx.fillStyle = '#090D16';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
                const pngUrl = canvas.toDataURL('image/png');
                const a = document.createElement('a');
                a.href = pngUrl;
                a.download = `diagrama_${diagramTypeSelect.value || 'c4'}.png`;
                a.click();
                showToast("Diagrama PNG exportado.", "success");
            };
            img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
        });
    }

    // ------------------------------------------------------------
    // 16. Database, API, and Other Documentation Renderers
    // ------------------------------------------------------------
    function renderDatabaseTab(db = {}, models = []) {
        const ovEl = document.getElementById("content-db-overview");
        if (ovEl) ovEl.textContent = db.overview || 'Estrategia de persistencia.';

        const tbody = document.getElementById("db-dictionary-tbody");
        if (!tbody) return;
        tbody.innerHTML = '';

        const dict = db.dataDictionary || [];
        if (dict.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="padding:1.5rem;text-align:center;color:#64748B;">No determinado a partir del código analizado.</td></tr>';
            return;
        }

        dict.forEach(row => {
            const tr = document.createElement('tr');
            tr.style.cssText = 'border-bottom:1px solid rgba(129,140,248,.1);';
            tr.innerHTML = `
                <td style="padding:.65rem 1rem;color:var(--tech-cyan);font-weight:700;">${row.table}</td>
                <td style="padding:.65rem 1rem;color:#fff;">${row.field}</td>
                <td style="padding:.65rem 1rem;color:#818CF8;">${row.type}</td>
                <td style="padding:.65rem 1rem;color:#94A3B8;">${row.description}</td>
                <td style="padding:.65rem 1rem;text-align:center;color:${row.required ? 'var(--emerald-sync)' : '#64748B'};">${row.required ? 'Sí' : 'No'}</td>
                <td style="padding:.65rem 1rem;text-align:center;color:${row.isPk ? 'var(--tech-cyan)' : '#64748B'};font-weight:700;">${row.isPk ? 'PK' : '-'}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    function renderApiTab(api = {}, endpoints = []) {
        const container = document.getElementById("api-endpoints-container");
        if (container) {
            container.innerHTML = '';
            const list = api.endpoints || endpoints || [];
            if (list.length === 0) {
                container.innerHTML = '<p style="color:#64748B;font-size:.85rem;">No se detectaron rutas explícitas de API en el código analizado.</p>';
            } else {
                list.forEach(ep => {
                    const card = document.createElement('div');
                    card.style.cssText = 'display:flex;align-items:center;justify-content:space-between;background:rgba(9,13,22,.65);border:1px solid rgba(129,140,248,.15);border-radius:.6rem;padding:.75rem 1rem;flex-wrap:wrap;gap:.5rem;';
                    const methodColor = ep.method === 'POST' ? '#34D399' : (ep.method === 'DELETE' ? '#FB7185' : (ep.method === 'PUT' ? '#FBBF24' : 'var(--tech-cyan)'));
                    card.innerHTML = `
                        <div style="display:flex;align-items:center;gap:.75rem;">
                            <span style="font-family:'JetBrains Mono',monospace;font-size:.74rem;font-weight:800;padding:.2rem .55rem;border-radius:.35rem;background:rgba(15,23,42,.9);border:1px solid ${methodColor};color:${methodColor};">${ep.method}</span>
                            <code style="font-size:.82rem;color:#fff;font-weight:700;">${ep.path}</code>
                            <span style="font-size:.76rem;color:#94A3B8;">${ep.description || ''}</span>
                        </div>
                        <div style="display:flex;align-items:center;gap:.65rem;">
                            ${ep.requiresAuth ? '<span class="badge badge-rose" style="font-size:.62rem;"><i class="fa-solid fa-lock"></i> Auth</span>' : '<span style="font-size:.7rem;color:#64748B;">Público</span>'}
                        </div>
                    `;
                    container.appendChild(card);
                });
            }
        }

        const openApiPreview = document.getElementById("openapi-spec-preview");
        if (openApiPreview) {
            const specStr = typeof api.openApiJson === 'string' ? api.openApiJson : JSON.stringify(api.openApiJson || {}, null, 2);
            openApiPreview.textContent = specStr;
        }

        const btnDownloadOpenApi = document.getElementById("btn-download-openapi");
        if (btnDownloadOpenApi) {
            btnDownloadOpenApi.onclick = () => {
                const specStr = typeof api.openApiJson === 'string' ? api.openApiJson : JSON.stringify(api.openApiJson || {}, null, 2);
                const blob = new Blob([specStr], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `openapi_${currentAnalysisData?.projectName || 'api'}.json`;
                a.click();
                URL.revokeObjectURL(url);
                showToast("Especificación OpenAPI 3.0 descargada.", "success");
            };
        }
    }

    function renderDevelopmentTab(dev = {}) {
        const readmeEl = document.getElementById("content-readme");
        if (readmeEl) readmeEl.innerHTML = safeMarkdown(dev.readme);

        const contributingEl = document.getElementById("content-contributing");
        if (contributingEl) contributingEl.innerHTML = safeMarkdown(dev.contributing);
    }

    function renderDevOpsTab(devops = {}) {
        const cicdEl = document.getElementById("content-cicd");
        if (cicdEl) cicdEl.textContent = devops.ciCdPipeline || 'No se detectó pipeline CI/CD formal.';

        const contEl = document.getElementById("content-containerization");
        if (contEl) contEl.textContent = devops.containerization || 'No detectada.';

        const guideEl = document.getElementById("content-deployment-guide");
        if (guideEl) guideEl.innerHTML = safeMarkdown(devops.deploymentGuide);
    }

    function renderQaTab(qa = {}) {
        const planEl = document.getElementById("content-test-plan");
        if (planEl) planEl.innerHTML = safeMarkdown(qa.testPlan);

        const tbody = document.getElementById("qa-test-cases-tbody");
        if (!tbody) return;
        tbody.innerHTML = '';

        const cases = qa.testCases || [];
        if (cases.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="padding:1.5rem;text-align:center;color:#64748B;">No se detectaron casos de prueba específicos.</td></tr>';
            return;
        }

        cases.forEach(tc => {
            const tr = document.createElement('tr');
            tr.style.cssText = 'border-bottom:1px solid rgba(129,140,248,.1);';
            tr.innerHTML = `
                <td style="padding:.65rem .85rem;color:var(--tech-cyan);font-weight:700;">${tc.id}</td>
                <td style="padding:.65rem .85rem;color:#fff;">${tc.title}</td>
                <td style="padding:.65rem .85rem;color:#94A3B8;">${tc.preconditions}</td>
                <td style="padding:.65rem .85rem;color:#CBD5E1;">${tc.expectedResult}</td>
                <td style="padding:.65rem .85rem;text-align:center;"><span class="badge badge-emerald" style="font-size:.65rem;">${tc.status || 'Diseñado'}</span></td>
            `;
            tbody.appendChild(tr);
        });
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function renderSecurityTab(secData, legacySec = []) {
        if (Array.isArray(secData)) {
            legacySec = secData;
            secData = null;
        }

        const sec = secData || {};
        const score = typeof sec.score === 'number' ? sec.score : 85;
        const grade = sec.grade || (score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F');
        const status = sec.status || (score >= 90 ? 'Excelente' : score >= 80 ? 'Aceptable' : score >= 60 ? 'Requiere Atención' : 'Crítico');
        const summary = sec.summary || {
            totalFindings: (sec.vulnerabilities || []).length,
            critical: (sec.vulnerabilities || []).filter(v => v.severity === 'CRITICAL').length,
            high: (sec.vulnerabilities || []).filter(v => v.severity === 'HIGH').length,
            medium: (sec.vulnerabilities || []).filter(v => v.severity === 'MEDIUM').length,
            low: (sec.vulnerabilities || []).filter(v => v.severity === 'LOW').length,
            secretsFound: (sec.secrets || []).length
        };

        // 1. Header Timestamp
        const headerTs = document.getElementById("sec-header-timestamp");
        if (headerTs) {
            const dateStr = sec.timestamp ? new Date(sec.timestamp).toLocaleString('es-ES') : new Date().toLocaleString('es-ES');
            headerTs.textContent = `Auditado: ${dateStr}`;
        }

        // 2. Score Ring & Grade
        const scoreValEl = document.getElementById("sec-score-value");
        if (scoreValEl) scoreValEl.textContent = score;

        const scoreRing = document.getElementById("sec-score-ring");
        if (scoreRing) {
            const circumference = 314.159;
            const offset = circumference - (circumference * score / 100);
            scoreRing.style.strokeDashoffset = offset;
            if (score >= 80) {
                scoreRing.style.stroke = "#34D399";
            } else if (score >= 65) {
                scoreRing.style.stroke = "#38BDF8";
            } else if (score >= 45) {
                scoreRing.style.stroke = "#FBBF24";
            } else {
                scoreRing.style.stroke = "#FB7185";
            }
        }

        const gradeBadge = document.getElementById("sec-grade-badge");
        if (gradeBadge) {
            gradeBadge.textContent = `Grado ${grade}`;
            gradeBadge.className = `badge ${grade === 'A' ? 'badge-emerald' : grade === 'B' ? 'badge-cyan' : grade === 'C' ? 'badge-amber' : 'badge-rose'}`;
        }

        const statusBadge = document.getElementById("sec-status-badge");
        if (statusBadge) {
            statusBadge.textContent = status;
            statusBadge.className = `badge ${score >= 80 ? 'badge-emerald' : score >= 65 ? 'badge-cyan' : score >= 45 ? 'badge-amber' : 'badge-rose'}`;
        }

        const scoreDesc = document.getElementById("sec-score-desc");
        if (scoreDesc) {
            if (score >= 90) {
                scoreDesc.textContent = "Excelente nivel de blindaje. Código robusto con mínimas advertencias de configuración.";
            } else if (score >= 75) {
                scoreDesc.textContent = "Nivel de seguridad aceptable. Existen oportunidades de mitigación en validación y dependencias.";
            } else if (score >= 50) {
                scoreDesc.textContent = "Nivel de seguridad deficiente. Se identificaron vulnerabilidades que requieren corrección prioritaria.";
            } else {
                scoreDesc.textContent = "Postura crítica. Presencia de vulnerabilidades de alto impacto o secretos expuestos que deben resolverse inmediatamente.";
            }
        }

        // 3. Severity KPIs
        const elCrit = document.getElementById("sec-kpi-critical");
        if (elCrit) elCrit.textContent = summary.critical || 0;

        const elHigh = document.getElementById("sec-kpi-high");
        if (elHigh) elHigh.textContent = summary.high || 0;

        const elMed = document.getElementById("sec-kpi-medium");
        if (elMed) elMed.textContent = summary.medium || 0;

        const elLow = document.getElementById("sec-kpi-low");
        if (elLow) elLow.textContent = summary.low || 0;

        const elSecrets = document.getElementById("sec-kpi-secrets");
        if (elSecrets) elSecrets.textContent = summary.secretsFound || (sec.secrets ? sec.secrets.length : 0);

        // 4. Deductions Box
        const deductionsBox = document.getElementById("sec-deductions-box");
        const deductionsList = document.getElementById("sec-deductions-list");
        if (deductionsBox && deductionsList) {
            if (sec.deductions && sec.deductions.length > 0) {
                deductionsBox.style.display = "block";
                deductionsList.innerHTML = sec.deductions.map(d => `
                    <div style="display:flex;align-items:center;justify-content:space-between;padding:.35rem .65rem;background:rgba(9,13,22,.6);border-radius:.45rem;border-left:3px solid ${d.severity === 'CRITICAL' ? '#FB7185' : d.severity === 'HIGH' ? '#FB923C' : '#FBBF24'};">
                        <span style="font-size:.78rem;color:#E2E8F0;">${escapeHtml(d.reason)}</span>
                        <div style="display:flex;align-items:center;gap:.5rem;">
                            <span class="badge ${d.severity === 'CRITICAL' ? 'badge-rose' : d.severity === 'HIGH' ? 'badge-cyan' : 'badge-amber'}" style="font-size:.65rem;">${d.severity}</span>
                            <span style="font-family:'JetBrains Mono',monospace;font-size:.78rem;font-weight:700;color:#FB7185;">-${d.deduction} pts</span>
                        </div>
                    </div>
                `).join('');
            } else {
                deductionsBox.style.display = "none";
            }
        }

        // 5. 8 Architectural Categories
        const catGrid = document.getElementById("sec-categories-grid");
        if (catGrid) {
            const categoriesMeta = [
                { id: 'authentication', label: 'Autenticación', icon: 'fa-user-lock' },
                { id: 'authorization', label: 'Autorización & Permisos', icon: 'fa-key' },
                { id: 'inputValidation', label: 'Validación de Entradas', icon: 'fa-filter' },
                { id: 'apiSecurity', label: 'Seguridad de APIs', icon: 'fa-network-wired' },
                { id: 'secrets', label: 'Secretos & Credenciales', icon: 'fa-vault' },
                { id: 'dependencies', label: 'Cadena de Suministro / Deps', icon: 'fa-boxes-stacked' },
                { id: 'configuration', label: 'Configuración & Hardening', icon: 'fa-sliders' },
                { id: 'dataProtection', label: 'Protección de Datos', icon: 'fa-database' }
            ];

            const categoriesData = sec.categories || {};
            catGrid.innerHTML = categoriesMeta.map(meta => {
                const cat = categoriesData[meta.id] || { score: 100, status: 'Excelente' };
                const cScore = typeof cat.score === 'number' ? cat.score : 100;
                const barColor = cScore >= 80 ? '#34D399' : cScore >= 60 ? '#38BDF8' : cScore >= 40 ? '#FBBF24' : '#FB7185';
                const statusColor = cScore >= 80 ? '#34D399' : cScore >= 60 ? '#38BDF8' : cScore >= 40 ? '#FBBF24' : '#FB7185';
                return `
                    <div class="sec-cat-card">
                        <div class="sec-cat-head">
                            <span style="display:flex;align-items:center;gap:.4rem;">
                                <i class="fa-solid ${meta.icon}" style="color:var(--tech-cyan);font-size:.75rem;"></i>
                                ${meta.label}
                            </span>
                            <span style="font-family:'JetBrains Mono',monospace;font-weight:800;color:${statusColor};">${cScore}%</span>
                        </div>
                        <div class="sec-cat-bar-bg">
                            <div class="sec-cat-bar-fill" style="width:${cScore}%;background:${barColor};"></div>
                        </div>
                        <div style="display:flex;justify-content:space-between;margin-top:.35rem;font-size:.68rem;color:#64748B;">
                            <span>Estado: <strong style="color:${statusColor};">${cat.status || 'Auditoría OK'}</strong></span>
                            <span>${cat.findingsCount !== undefined ? `${cat.findingsCount} hallazgos` : ''}</span>
                        </div>
                    </div>
                `;
            }).join('');
        }

        // 6. Secret Scanner Section
        const secSecretsContainer = document.getElementById("sec-secrets-container");
        if (secSecretsContainer) {
            const secrets = sec.secrets || [];
            if (secrets.length === 0) {
                secSecretsContainer.innerHTML = `
                    <div style="background:rgba(52,211,153,.08);border:1px solid rgba(52,211,153,.25);border-radius:.65rem;padding:1.1rem;display:flex;align-items:center;gap:.85rem;">
                        <i class="fa-solid fa-circle-check" style="font-size:1.4rem;color:#34D399;"></i>
                        <div>
                            <strong style="font-size:.88rem;color:#E2E8F0;">Sin credenciales expuestas detectadas</strong>
                            <p style="font-size:.76rem;color:#94A3B8;margin:2px 0 0;">No se encontraron claves de API, tokens Bearer, contraseñas hardcodeadas ni certificados privados en el código analizado.</p>
                        </div>
                    </div>
                `;
            } else {
                secSecretsContainer.innerHTML = `
                    <div class="table-responsive" style="overflow-x:auto;">
                        <table class="cyber-table" style="width:100%;font-size:.78rem;border-collapse:collapse;">
                            <thead>
                                <tr style="border-bottom:1px solid rgba(129,140,248,.2);background:rgba(15,23,42,.6);">
                                    <th style="padding:.65rem .75rem;text-align:left;">Tipo de Secreto</th>
                                    <th style="padding:.65rem .75rem;text-align:left;">Ubicación</th>
                                    <th style="padding:.65rem .75rem;text-align:left;">Evidencia Enmascarada</th>
                                    <th style="padding:.65rem .75rem;text-align:center;width:95px;">Severidad</th>
                                    <th style="padding:.65rem .75rem;text-align:center;width:110px;">Estado IA</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${secrets.map(s => `
                                    <tr style="border-bottom:1px solid rgba(129,140,248,.12);">
                                        <td style="padding:.65rem .75rem;font-weight:700;color:#fff;">
                                            <i class="fa-solid fa-key" style="color:#FBBF24;margin-right:.4rem;"></i>${escapeHtml(s.type || 'Credencial')}
                                        </td>
                                        <td style="padding:.65rem .75rem;font-family:'JetBrains Mono',monospace;color:var(--tech-cyan);">
                                            ${escapeHtml(s.file || 'desconocido')}:${s.line || 1}
                                        </td>
                                        <td style="padding:.65rem .75rem;font-family:'JetBrains Mono',monospace;color:#FB7185;">
                                            <code>${escapeHtml(s.maskedSecret || s.evidence || '***ENMASCARADO***')}</code>
                                        </td>
                                        <td style="padding:.65rem .75rem;text-align:center;">
                                            <span class="badge ${s.severity === 'CRITICAL' ? 'badge-rose' : 'badge-cyan'}" style="font-size:.65rem;">${s.severity || 'ALTO'}</span>
                                        </td>
                                        <td style="padding:.65rem .75rem;text-align:center;">
                                            <span class="badge badge-emerald" style="font-size:.62rem;"><i class="fa-solid fa-shield"></i> Redactado</span>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
            }
        }

        // 7. Dependencies Section
        const depsContainer = document.getElementById("sec-deps-container");
        const depsBadge = document.getElementById("sec-deps-status-badge");
        if (depsContainer) {
            const deps = sec.dependencies || {};
            if (deps.manifestFound) {
                if (depsBadge) {
                    depsBadge.textContent = `${deps.manifestType} auditado`;
                    depsBadge.className = 'badge badge-cyan';
                }
                const hasIssues = (deps.vulnerabilities && deps.vulnerabilities.length > 0) || (deps.floatingVersions && deps.floatingVersions.length > 0);
                if (!hasIssues) {
                    depsContainer.innerHTML = `
                        <div style="background:rgba(52,211,153,.08);border:1px solid rgba(52,211,153,.25);border-radius:.65rem;padding:1rem;display:flex;align-items:center;gap:.75rem;">
                            <i class="fa-solid fa-boxes-packing" style="color:#34D399;font-size:1.2rem;"></i>
                            <span style="font-size:.8rem;color:#E2E8F0;">Todas las dependencias registradas en el manifiesto presentan versiones estables sin vulnerabilidades críticas conocidas.</span>
                        </div>
                    `;
                } else {
                    let depHtml = '';
                    if (deps.vulnerabilities && deps.vulnerabilities.length > 0) {
                        depHtml += `
                            <div style="margin-bottom:.85rem;">
                                <strong style="font-size:.8rem;color:#FB7185;display:block;margin-bottom:.4rem;">Paquetes con vulnerabilidades o recomendaciones:</strong>
                                <div style="display:flex;flex-direction:column;gap:.4rem;">
                                    ${deps.vulnerabilities.map(v => `
                                        <div style="background:rgba(9,13,22,.6);border:1px solid rgba(244,63,94,.25);border-radius:.5rem;padding:.5rem .75rem;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.5rem;">
                                            <span style="font-family:'JetBrains Mono',monospace;font-size:.78rem;color:#fff;"><strong>${escapeHtml(v.package)}</strong> (${escapeHtml(v.version)})</span>
                                            <span style="font-size:.75rem;color:#FB7185;">${escapeHtml(v.advisory || v.reason || 'Vulnerable')}</span>
                                            <span class="badge badge-emerald" style="font-size:.65rem;">Actualizar a ${escapeHtml(v.recommendedVersion || 'latest')}</span>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        `;
                    }
                    if (deps.floatingVersions && deps.floatingVersions.length > 0) {
                        depHtml += `
                            <div>
                                <strong style="font-size:.8rem;color:#FBBF24;display:block;margin-bottom:.4rem;">Dependencias sin versión fijada (floating wildcards):</strong>
                                <p style="font-size:.75rem;color:#94A3B8;margin-bottom:.4rem;">El uso de comodines (*) o rangos amplios expone el pipeline a riesgos de Supply Chain attacks.</p>
                                <div style="display:flex;flex-wrap:wrap;gap:.35rem;">
                                    ${deps.floatingVersions.map(fv => `
                                        <span class="badge badge-amber" style="font-size:.68rem;font-family:'JetBrains Mono',monospace;">${escapeHtml(fv.package)}: ${escapeHtml(fv.version)}</span>
                                    `).join('')}
                                </div>
                            </div>
                        `;
                    }
                    depsContainer.innerHTML = depHtml;
                }
            } else {
                if (depsBadge) {
                    depsBadge.textContent = 'Sin manifiesto';
                    depsBadge.className = 'badge badge-slate';
                }
                depsContainer.innerHTML = `
                    <p style="font-size:.78rem;color:#94A3B8;margin:0;">No se detectó package.json o requirements.txt en el código fuente analizado.</p>
                `;
            }
        }

        // 8. SAST Vulnerabilities with Filtering
        const container = document.getElementById("content-security-findings");
        let allFindings = [];

        if (sec.vulnerabilities && sec.vulnerabilities.length > 0) {
            allFindings = sec.vulnerabilities.map(v => ({
                id: v.id || v.ruleId || 'SEC-VULN',
                title: v.title || v.ruleName || v.name || 'Hallazgo de Seguridad',
                severity: (v.severity || 'MEDIUM').toUpperCase(),
                certainty: v.certainty || (v.confirmed ? 'Confirmado' : 'Uso potencialmente peligroso'),
                owasp: v.owasp || 'OWASP Top 10',
                asvs: v.asvs || 'OWASP ASVS v4.0',
                cwe: v.cwe || 'CWE',
                file: v.file || 'código fuente',
                line: v.line || 1,
                evidence: v.evidence || v.snippet || '',
                recommendation: v.recommendation || v.remediation || v.fix || 'Revisar y mitigar'
            }));
        } else if (legacySec && legacySec.length > 0) {
            allFindings = legacySec.map((item, idx) => ({
                id: `SEC-AUD-${idx + 1}`,
                title: item.finding || 'Recomendación de Seguridad',
                severity: item.risk === 'Alto' ? 'HIGH' : item.risk === 'Medio' ? 'MEDIUM' : 'LOW',
                certainty: 'Recomendación',
                owasp: 'Buenas Prácticas',
                asvs: '',
                cwe: '',
                file: 'Arquitectura',
                line: 1,
                evidence: item.evidence || '',
                recommendation: item.recommendation || ''
            }));
        }

        // Update counts on filter buttons
        const countAll = document.getElementById("count-flt-all");
        const countCrit = document.getElementById("count-flt-crit");
        const countHigh = document.getElementById("count-flt-high");
        const countMed = document.getElementById("count-flt-med");
        const countLow = document.getElementById("count-flt-low");

        if (countAll) countAll.textContent = allFindings.length;
        if (countCrit) countCrit.textContent = allFindings.filter(f => f.severity === 'CRITICAL').length;
        if (countHigh) countHigh.textContent = allFindings.filter(f => f.severity === 'HIGH').length;
        if (countMed) countMed.textContent = allFindings.filter(f => f.severity === 'MEDIUM').length;
        if (countLow) countLow.textContent = allFindings.filter(f => f.severity === 'LOW' || f.severity === 'INFO').length;

        function renderVulnList(filter = 'ALL') {
            if (!container) return;
            container.innerHTML = '';

            const filtered = filter === 'ALL' 
                ? allFindings 
                : allFindings.filter(f => f.severity === filter || (filter === 'LOW' && f.severity === 'INFO'));

            if (filtered.length === 0) {
                container.innerHTML = `
                    <div style="background:rgba(52,211,153,.08);border:1px solid rgba(52,211,153,.25);border-radius:.65rem;padding:1.25rem;text-align:center;">
                        <i class="fa-solid fa-shield-heart" style="font-size:1.8rem;color:#34D399;margin-bottom:.5rem;display:inline-block;"></i>
                        <h5 style="font-size:.9rem;color:#E2E8F0;font-weight:700;">Sin vulnerabilidades en este nivel</h5>
                        <p style="font-size:.76rem;color:#94A3B8;margin:0;">No se registraron hallazgos SAST clasificados como ${filter}.</p>
                    </div>
                `;
                return;
            }

            filtered.forEach(item => {
                const sevClass = item.severity === 'CRITICAL' ? 'vuln-crit' : item.severity === 'HIGH' ? 'vuln-high' : item.severity === 'MEDIUM' ? 'vuln-med' : 'vuln-low';
                const sevBadge = item.severity === 'CRITICAL' ? 'badge-rose' : item.severity === 'HIGH' ? 'badge-cyan' : item.severity === 'MEDIUM' ? 'badge-amber' : 'badge-emerald';
                const certaintyBadge = item.certainty === 'Confirmado' 
                    ? '<span class="badge badge-rose" style="font-size:.62rem;"><i class="fa-solid fa-circle-exclamation"></i> Confirmado</span>'
                    : '<span class="badge badge-amber" style="font-size:.62rem;"><i class="fa-solid fa-triangle-exclamation"></i> Uso sospechoso / Potencial</span>';

                const card = document.createElement('div');
                card.className = `sec-vuln-card ${sevClass}`;
                card.innerHTML = `
                    <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:.5rem;margin-bottom:.65rem;">
                        <div>
                            <div style="display:flex;align-items:center;gap:.45rem;margin-bottom:.25rem;flex-wrap:wrap;">
                                <span style="font-family:'JetBrains Mono',monospace;font-size:.72rem;color:var(--tech-cyan);font-weight:700;">${escapeHtml(item.id)}</span>
                                ${certaintyBadge}
                                ${item.owasp ? `<span class="badge badge-slate" style="font-size:.62rem;">${escapeHtml(item.owasp)}</span>` : ''}
                                ${item.asvs ? `<span class="badge badge-slate" style="font-size:.62rem;">${escapeHtml(item.asvs)}</span>` : ''}
                            </div>
                            <strong style="font-size:.92rem;color:#fff;display:block;">${escapeHtml(item.title)}</strong>
                        </div>
                        <span class="badge ${sevBadge}" style="font-size:.68rem;padding:.25rem .6rem;">${item.severity}</span>
                    </div>

                    <div style="font-size:.76rem;color:var(--tech-cyan);font-family:'JetBrains Mono',monospace;margin-bottom:.55rem;display:flex;align-items:center;gap:.4rem;">
                        <i class="fa-solid fa-code"></i> ${escapeHtml(item.file)}:${item.line}
                    </div>

                    ${item.evidence ? `
                        <div style="background:rgba(15,23,42,.9);border:1px solid rgba(129,140,248,.12);border-radius:.45rem;padding:.55rem .75rem;margin-bottom:.6rem;overflow-x:auto;">
                            <span style="font-size:.68rem;color:#64748B;display:block;margin-bottom:.2rem;">Evidencia / Código detectado:</span>
                            <pre style="margin:0;font-family:'JetBrains Mono',monospace;font-size:.75rem;color:#E2E8F0;white-space:pre-wrap;word-break:break-all;"><code>${escapeHtml(item.evidence)}</code></pre>
                        </div>
                    ` : ''}

                    <div style="background:rgba(52,211,153,.06);border:1px solid rgba(52,211,153,.18);border-radius:.45rem;padding:.6rem .8rem;">
                        <strong style="font-size:.75rem;color:#34D399;display:flex;align-items:center;gap:.35rem;margin-bottom:.2rem;">
                            <i class="fa-solid fa-screwdriver-wrench"></i> Guía de Mitigación &amp; Remediación:
                        </strong>
                        <p style="font-size:.78rem;color:#CBD5E1;margin:0;line-height:1.5;">${escapeHtml(item.recommendation)}</p>
                    </div>
                `;
                container.appendChild(card);
            });
        }

        renderVulnList('ALL');

        // Wire filter button click handlers
        const filterBtns = document.querySelectorAll(".sec-filter-btn");
        filterBtns.forEach(btn => {
            btn.onclick = () => {
                filterBtns.forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                const filter = btn.getAttribute("data-sec-filter") || 'ALL';
                renderVulnList(filter);
            };
        });

        // 9. STRIDE Threat Model
        const strideTbody = document.getElementById("sec-stride-tbody");
        if (strideTbody) {
            strideTbody.innerHTML = '';
            const threats = (sec.threatModel && sec.threatModel.threats) || [];
            if (threats.length === 0) {
                strideTbody.innerHTML = `
                    <tr><td colspan="5" style="padding:1rem;text-align:center;color:#94A3B8;">No se detectaron amenazas activas para los componentes mapeados.</td></tr>
                `;
            } else {
                threats.forEach(t => {
                    const tr = document.createElement('tr');
                    tr.style.cssText = 'border-bottom:1px solid rgba(129,140,248,.12);';
                    const sevBadge = t.severity === 'CRITICAL' ? 'badge-rose' : t.severity === 'HIGH' ? 'badge-cyan' : t.severity === 'MEDIUM' ? 'badge-amber' : 'badge-emerald';
                    tr.innerHTML = `
                        <td style="padding:.65rem .75rem;font-weight:700;color:#fff;">
                            <span style="display:inline-flex;align-items:center;gap:.35rem;">
                                <i class="fa-solid fa-shield-halved" style="color:var(--tech-cyan);font-size:.72rem;"></i>
                                ${escapeHtml(t.vector || 'STRIDE')}
                            </span>
                        </td>
                        <td style="padding:.65rem .75rem;color:var(--tech-cyan);font-family:'JetBrains Mono',monospace;font-size:.74rem;">
                            ${escapeHtml(t.component || 'Sistema')}
                        </td>
                        <td style="padding:.65rem .75rem;color:#E2E8F0;font-size:.78rem;line-height:1.5;">
                            ${escapeHtml(t.threat || t.description || '-')}
                        </td>
                        <td style="padding:.65rem .75rem;color:#94A3B8;font-size:.76rem;line-height:1.5;">
                            ${escapeHtml(t.mitigation || '-')}
                        </td>
                        <td style="padding:.65rem .75rem;text-align:center;">
                            <span class="badge ${sevBadge}" style="font-size:.65rem;">${escapeHtml(t.severity || 'MEDIA')}</span>
                        </td>
                    `;
                    strideTbody.appendChild(tr);
                });
            }
        }

        // 10. Security Requirements Matrix (SEC-001...)
        const reqTbody = document.getElementById("sec-requirements-tbody");
        if (reqTbody) {
            reqTbody.innerHTML = '';
            const reqs = sec.securityRequirements || [];
            if (reqs.length === 0) {
                reqTbody.innerHTML = `
                    <tr><td colspan="6" style="padding:1rem;text-align:center;color:#94A3B8;">No se han generado requerimientos adicionales para el análisis actual.</td></tr>
                `;
            } else {
                reqs.forEach(r => {
                    const tr = document.createElement('tr');
                    tr.style.cssText = 'border-bottom:1px solid rgba(129,140,248,.12);';
                    const prioBadge = r.priority === 'CRÍTICA' ? 'badge-rose' : r.priority === 'ALTA' ? 'badge-cyan' : r.priority === 'MEDIA' ? 'badge-amber' : 'badge-emerald';
                    tr.innerHTML = `
                        <td style="padding:.65rem .75rem;text-align:center;font-family:'JetBrains Mono',monospace;font-weight:700;color:var(--tech-cyan);">
                            ${escapeHtml(r.id)}
                        </td>
                        <td style="padding:.65rem .75rem;font-weight:700;color:#fff;font-size:.8rem;">
                            ${escapeHtml(r.title)}
                        </td>
                        <td style="padding:.65rem .75rem;color:#94A3B8;font-size:.74rem;">
                            ${escapeHtml(r.category || 'General')}
                        </td>
                        <td style="padding:.65rem .75rem;text-align:center;">
                            <span class="badge ${prioBadge}" style="font-size:.65rem;">${escapeHtml(r.priority || 'ALTA')}</span>
                        </td>
                        <td style="padding:.65rem .75rem;color:#CBD5E1;font-size:.76rem;">
                            ${escapeHtml(r.justification || r.standard || '-')}
                        </td>
                        <td style="padding:.65rem .75rem;text-align:center;">
                            <span class="badge ${r.status === 'Mitigado' ? 'badge-emerald' : 'badge-amber'}" style="font-size:.65rem;">
                                ${escapeHtml(r.status || 'Pendiente')}
                            </span>
                        </td>
                    `;
                    reqTbody.appendChild(tr);
                });
            }
        }
    }

    function renderAdrTab(adrs = []) {
        const container = document.getElementById("content-adrs");
        if (!container) return;
        container.innerHTML = '';

        adrs.forEach(adr => {
            const card = document.createElement('div');
            card.style.cssText = 'background:rgba(9,13,22,.7);border:1px solid rgba(129,140,248,.18);border-radius:.65rem;padding:1.25rem;';
            card.innerHTML = `
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.65rem;">
                    <strong style="font-size:.92rem;color:var(--tech-cyan);">${adr.id}: ${adr.title}</strong>
                    <span class="badge badge-emerald" style="font-size:.65rem;">${adr.status}</span>
                </div>
                <p style="font-size:.82rem;color:#CBD5E1;margin-bottom:.5rem;"><strong>Contexto:</strong> ${adr.context}</p>
                <p style="font-size:.82rem;color:#E2E8F0;margin-bottom:.5rem;"><strong>Decisión:</strong> ${adr.decision}</p>
                <p style="font-size:.8rem;color:#94A3B8;"><strong>Consecuencias:</strong> ${adr.consequences}</p>
            `;
            container.appendChild(card);
        });
    }

    function renderUserGuideTab(ug = {}) {
        const guideEl = document.getElementById("content-user-guide");
        if (guideEl) guideEl.innerHTML = safeMarkdown(ug.guide);

        const faqEl = document.getElementById("content-faq");
        if (faqEl) {
            faqEl.innerHTML = '';
            (ug.faq || []).forEach(f => {
                const card = document.createElement('div');
                card.style.cssText = 'background:rgba(9,13,22,.65);border:1px solid rgba(129,140,248,.15);border-radius:.65rem;padding:1rem;';
                card.innerHTML = `
                    <h5 style="font-size:.88rem;color:#fff;margin-bottom:.4rem;display:flex;align-items:center;gap:.45rem;">
                        <i class="fa-solid fa-circle-question" style="color:var(--tech-cyan);font-size:.8rem;"></i> ${f.question}
                    </h5>
                    <p style="font-size:.82rem;color:#94A3B8;line-height:1.6;">${f.answer}</p>
                `;
                faqEl.appendChild(card);
            });
        }
    }

    // Copy markdown button handler
    document.addEventListener('click', (e) => {
        const copyBtn = e.target.closest('.btn-copy-md');
        if (!copyBtn) return;
        const targetId = copyBtn.dataset.target;
        const targetEl = document.getElementById(targetId);
        if (targetEl) {
            navigator.clipboard.writeText(targetEl.innerText);
            showToast("Texto copiado al portapapeles.", "success");
        }
    });

    // ------------------------------------------------------------
    // 17. Export Actions (ZIP & PDF)
    // ------------------------------------------------------------
    const btnDownloadZip = document.getElementById("btn-download-zip");
    if (btnDownloadZip) {
        btnDownloadZip.addEventListener("click", () => {
            if (!currentProjectId) {
                showToast("Por favor genera un análisis primero para descargarlo.", "error");
                return;
            }
            window.location.href = `/api/project/export/zip/${encodeURIComponent(currentProjectId)}`;
            showToast("Iniciando descarga del paquete ZIP completo...", "success");
        });
    }

    const btnExportPdf = document.getElementById("btn-export-pdf");
    if (btnExportPdf) {
        btnExportPdf.addEventListener("click", () => {
            window.print();
        });
    }

    // Security Center Exports
    const btnExportSecJson = document.getElementById("btn-export-sec-json");
    if (btnExportSecJson) {
        btnExportSecJson.addEventListener("click", () => {
            if (currentProjectId) {
                window.location.href = `/api/project/export/security-json/${encodeURIComponent(currentProjectId)}`;
                showToast("Descargando reporte de seguridad en JSON...", "success");
            } else if (currentAnalysisData?.security) {
                const blob = new Blob([JSON.stringify(currentAnalysisData.security, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `security-report-${currentAnalysisData.projectId || 'analysis'}.json`;
                a.click();
                URL.revokeObjectURL(url);
                showToast("Reporte JSON de seguridad generado localmente.", "success");
            } else {
                showToast("No hay datos de seguridad disponibles para exportar.", "error");
            }
        });
    }

    const btnExportSecMd = document.getElementById("btn-export-sec-md");
    if (btnExportSecMd) {
        btnExportSecMd.addEventListener("click", () => {
            if (currentProjectId) {
                window.location.href = `/api/project/export/security-md/${encodeURIComponent(currentProjectId)}`;
                showToast("Descargando reporte de seguridad en Markdown...", "success");
            } else if (currentAnalysisData?.security?.markdownReport) {
                const blob = new Blob([currentAnalysisData.security.markdownReport], { type: 'text/markdown' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `SECURITY-REPORT.md`;
                a.click();
                URL.revokeObjectURL(url);
                showToast("Reporte Markdown de seguridad generado localmente.", "success");
            } else {
                showToast("No hay informe Markdown disponible para exportar.", "error");
            }
        });
    }

    const btnExportSecPdf = document.getElementById("btn-export-sec-pdf");
    if (btnExportSecPdf) {
        btnExportSecPdf.addEventListener("click", () => {
            switchDocTab('security');
            setTimeout(() => {
                window.print();
            }, 250);
        });
    }

    const btnNewAnalysis = document.getElementById("btn-new-analysis");
    if (btnNewAnalysis) {
        btnNewAnalysis.addEventListener("click", () => {
            if (projectResults) projectResults.style.display = 'none';
            const inputContainer = document.getElementById("project-input-container");
            if (inputContainer) {
                inputContainer.style.display = 'block';
                inputContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    }

    // ------------------------------------------------------------
    // 18. Contextual AI Chat with Evidence Citations
    // ------------------------------------------------------------
    const projectChatInput = document.getElementById("project-chat-input");
    const btnProjectChatSend = document.getElementById("btn-project-chat-send");
    const projectChatMessages = document.getElementById("project-chat-messages");

    if (btnProjectChatSend) {
        btnProjectChatSend.addEventListener("click", sendProjectChatMessage);
    }
    if (projectChatInput) {
        projectChatInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") sendProjectChatMessage();
        });
    }

    document.querySelectorAll('.gh-quick-q').forEach(btn => {
        btn.addEventListener('click', () => {
            if (projectChatInput) {
                projectChatInput.value = btn.textContent.trim();
                sendProjectChatMessage();
            }
        });
    });

    async function sendProjectChatMessage() {
        if (!projectChatInput || !currentAnalysisData) return;
        const msg = projectChatInput.value.trim();
        if (!msg) return;

        projectChatInput.value = '';
        appendChatBubble(projectChatMessages, msg, 'user');

        const thinkingBubble = appendChatBubble(projectChatMessages, '<i class="fa-solid fa-circle-notch fa-spin"></i> Consultando modelo con evidencia...', 'ai');

        try {
            const res = await fetch('/api/project/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: currentProjectId,
                    repoContext: {
                        repository: currentAnalysisData.repository,
                        detectedTechnologies: currentAnalysisData.detectedTechnologies,
                        treeDiagram: currentAnalysisData.treeDiagram,
                        prioritizedFiles: currentAnalysisData.keyFiles
                    },
                    chatHistory: projectChatHistory,
                    message: msg
                })
            });

            const data = await res.json();
            thinkingBubble.remove();

            if (!res.ok || !data.success) {
                throw new Error(data.error || 'No se pudo obtener respuesta.');
            }

            projectChatHistory.push({ role: 'user', text: msg });
            projectChatHistory.push({ role: 'model', text: data.reply });

            appendChatBubble(projectChatMessages, safeMarkdown(data.reply), 'ai');
        } catch (err) {
            thinkingBubble.remove();
            appendChatBubble(projectChatMessages, `No fue posible responder: ${err.message}`, 'ai');
        }
    }

    function appendChatBubble(container, content, sender) {
        if (!container) return null;
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble chat-bubble-${sender}`;
        bubble.innerHTML = content;
        container.appendChild(bubble);
        container.scrollTop = container.scrollHeight;
        return bubble;
    }

    // ------------------------------------------------------------
    // 19. Persistent History & Version Comparison
    // ------------------------------------------------------------
    const LOCAL_HISTORY_KEY = "documind_ai_project_history_v2";

    function getLocalHistory() {
        try {
            return JSON.parse(localStorage.getItem(LOCAL_HISTORY_KEY) || '[]');
        } catch (e) {
            return [];
        }
    }

    function saveAnalysisToLocalHistory(data) {
        const history = getLocalHistory();
        const item = {
            id: data.projectId,
            name: data.repository?.fullName || data.repository?.name || 'Proyecto',
            date: new Date().toISOString(),
            lang: data.repository?.primaryLanguage || 'JavaScript',
            filesCount: data.stats?.relevantFilesCount || 0,
            data
        };
        const updated = [item, ...history.filter(h => h.name !== item.name)].slice(0, 15);
        localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(updated));
        updateHistoryBadge();
    }

    function updateHistoryBadge() {
        const countBadge = document.getElementById("history-badge-count");
        if (countBadge) {
            countBadge.textContent = getLocalHistory().length;
        }
    }
    updateHistoryBadge();

    function renderHistoryList() {
        const list = document.getElementById("history-list");
        if (!list) return;

        const history = getLocalHistory();
        if (history.length === 0) {
            list.innerHTML = '<p style="font-size:.82rem;color:#64748B;text-align:center;padding:2rem 0;">Aún no tienes proyectos registrados. Genera documentación para ver el historial aquí.</p>';
            return;
        }

        list.innerHTML = '';
        history.forEach((h, idx) => {
            const card = document.createElement('div');
            card.style.cssText = 'display:flex;align-items:center;justify-content:space-between;background:rgba(15,23,42,.85);border:1px solid rgba(129,140,248,.18);border-radius:.75rem;padding:1rem 1.25rem;flex-wrap:wrap;gap:.75rem;';
            card.innerHTML = `
                <div>
                    <h4 style="font-size:.92rem;font-weight:800;color:#fff;">${h.name}</h4>
                    <div style="display:flex;gap:.75rem;font-size:.72rem;color:#94A3B8;margin-top:.2rem;font-family:'JetBrains Mono',monospace;">
                        <span>${new Date(h.date).toLocaleDateString()}</span>
                        <span>&bull;</span>
                        <span style="color:var(--tech-cyan);">${h.lang}</span>
                        <span>&bull;</span>
                        <span>${h.filesCount} archivos</span>
                    </div>
                </div>
                <div style="display:flex;gap:.5rem;">
                    <button type="button" class="btn-cyber btn-open-history" data-idx="${idx}" style="padding:.4rem .9rem;font-size:.76rem;">
                        <i class="fa-solid fa-folder-open" style="margin-right:.3rem;"></i>Abrir
                    </button>
                    ${idx > 0 ? `<button type="button" class="btn-cyber-outline btn-compare-history" data-idx="${idx}" style="padding:.4rem .85rem;font-size:.76rem;"><i class="fa-solid fa-code-compare" style="margin-right:.3rem;"></i>Comparar con actual</button>` : ''}
                    <button type="button" class="btn-ghost btn-delete-history" data-idx="${idx}" style="color:#FB7185;padding:.4rem .6rem;font-size:.76rem;">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            `;

            card.querySelector('.btn-open-history').addEventListener('click', () => {
                currentAnalysisData = h.data;
                currentProjectId = h.id;
                switchInputMode('gh');
                renderProjectResults(h.data);
                showToast(`Proyecto "${h.name}" cargado desde el historial.`, "info");
            });

            const compBtn = card.querySelector('.btn-compare-history');
            if (compBtn) {
                compBtn.addEventListener('click', () => {
                    compareVersions(h.data, currentAnalysisData);
                });
            }

            card.querySelector('.btn-delete-history').addEventListener('click', () => {
                const cur = getLocalHistory();
                cur.splice(idx, 1);
                localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(cur));
                renderHistoryList();
                updateHistoryBadge();
                showToast("Proyecto eliminado del historial.", "info");
            });

            list.appendChild(card);
        });
    }

    const btnClearHistory = document.getElementById("btn-clear-history");
    if (btnClearHistory) {
        btnClearHistory.addEventListener("click", () => {
            localStorage.removeItem(LOCAL_HISTORY_KEY);
            renderHistoryList();
            updateHistoryBadge();
            showToast("Historial vaciado.", "info");
        });
    }

    async function compareVersions(oldA, newA) {
        if (!oldA || !newA) {
            showToast("Se requieren dos proyectos para comparar.", "error");
            return;
        }

        const diffContainer = document.getElementById("version-diff-container");
        const diffList = document.getElementById("diff-list");
        if (!diffContainer || !diffList) return;

        diffContainer.style.display = 'block';
        diffList.innerHTML = '<div style="color:var(--tech-cyan);"><i class="fa-solid fa-circle-notch fa-spin"></i> Calculando diferencias estructurales...</div>';

        try {
            const res = await fetch('/api/project/compare', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ oldAnalysis: oldA, newAnalysis: newA })
            });

            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error);

            diffList.innerHTML = '';
            const diffs = data.comparison?.diffs || [];
            if (diffs.length === 0) {
                diffList.innerHTML = '<span style="color:#34D399;">No se detectaron diferencias entre las dos versiones analizadas.</span>';
            } else {
                diffs.forEach(d => {
                    const el = document.createElement('div');
                    el.style.color = d.type === 'added' ? '#34D399' : (d.type === 'removed' ? '#FB7185' : 'var(--tech-cyan)');
                    el.textContent = d.text;
                    diffList.appendChild(el);
                });
            }
        } catch (e) {
            diffList.innerHTML = `<span style="color:#FB7185;">Error al comparar: ${e.message}</span>`;
        }
    }

    const btnCloseDiff = document.getElementById("btn-close-diff");
    if (btnCloseDiff) {
        btnCloseDiff.onclick = () => {
            const diffContainer = document.getElementById("version-diff-container");
            if (diffContainer) diffContainer.style.display = 'none';
        };
    }

    // ------------------------------------------------------------
    // 20. Role Chips Selection Helper
    // ------------------------------------------------------------
    const roleChips = document.querySelectorAll(".role-chip");
    roleChips.forEach(chip => {
        chip.addEventListener("click", () => {
            roleChips.forEach(c => c.classList.remove("active"));
            chip.classList.add("active");
        });
    });

});
