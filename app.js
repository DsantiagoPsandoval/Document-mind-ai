// ============================================================
// DOCUMENT-MIND AI — CLIENT APPLICATION CONTROLLER
// Complete functional integration with real backend API, dual pipeline,
// contextual chat, 3D AI Core state machine, and persistent history.
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
    // ------------------------------------------------------------
    // 1. Dynamic Cursor Spotlight Glow
    // ------------------------------------------------------------
    const spotlight = document.getElementById("cursor-spotlight");
    if (spotlight) {
        window.addEventListener("mousemove", (e) => {
            spotlight.style.left = `${e.clientX}px`;
            spotlight.style.top = `${e.clientY}px`;
        });
    }

    // ------------------------------------------------------------
    // 2. Dynamic Card Spotlight Glow on Mousemove
    // ------------------------------------------------------------
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
    // 7. Tab Switching (Documentos vs GitHub vs Historial)
    // ------------------------------------------------------------
    const tabDocBtn = document.getElementById("tab-doc-btn");
    const tabGhBtn = document.getElementById("tab-gh-btn");
    const tabHistoryBtn = document.getElementById("tab-history-btn");

    const panelDoc = document.getElementById("panel-doc");
    const panelGh = document.getElementById("panel-gh");
    const panelHistory = document.getElementById("panel-history");

    function switchTab(activeTab) {
        if (tabDocBtn) tabDocBtn.classList.remove("active");
        if (tabGhBtn) tabGhBtn.classList.remove("active");
        if (tabHistoryBtn) tabHistoryBtn.classList.remove("active");

        if (panelDoc) panelDoc.style.display = "none";
        if (panelGh) panelGh.style.display = "none";
        if (panelHistory) panelHistory.style.display = "none";

        if (activeTab === "doc") {
            if (tabDocBtn) tabDocBtn.classList.add("active");
            if (panelDoc) panelDoc.style.display = "block";
        } else if (activeTab === "gh") {
            if (tabGhBtn) tabGhBtn.classList.add("active");
            if (panelGh) panelGh.style.display = "block";
        } else if (activeTab === "history") {
            if (tabHistoryBtn) tabHistoryBtn.classList.add("active");
            if (panelHistory) panelHistory.style.display = "block";
            renderHistoryList();
        }
    }

    if (tabDocBtn) tabDocBtn.addEventListener("click", () => switchTab("doc"));
    if (tabGhBtn) tabGhBtn.addEventListener("click", () => switchTab("gh"));
    if (tabHistoryBtn) tabHistoryBtn.addEventListener("click", () => switchTab("history"));

    // Hero button hook
    const btnHeroAnalyze = document.getElementById("btn-hero-analyze");
    if (btnHeroAnalyze) {
        btnHeroAnalyze.addEventListener("click", () => {
            switchTab("gh");
            const analizadorSec = document.getElementById("analizador") || document.getElementById("demo");
            if (analizadorSec) {
                analizadorSec.scrollIntoView({ behavior: "smooth", block: "start" });
            }
            const repoInput = document.getElementById("repo-input");
            if (repoInput) repoInput.focus();
        });
    }

    // ============================================================
    // 8. DOCUMENT ANALYSIS PIPELINE
    // ============================================================
    const docDropzone = document.getElementById("doc-dropzone");
    const docFileInput = document.getElementById("doc-file-input");
    const btnBrowseFile = document.getElementById("btn-browse-file");
    const docFileCard = document.getElementById("doc-file-card");
    const docFileName = document.getElementById("doc-file-name");
    const docFileSize = document.getElementById("doc-file-size");
    const docFileExt = document.getElementById("doc-file-ext");
    const docFileIcon = document.getElementById("doc-file-icon");
    const btnRemoveDoc = document.getElementById("btn-remove-doc");
    const btnAnalyzeDoc = document.getElementById("btn-analyze-doc");
    const docProgressContainer = document.getElementById("doc-progress-container");
    const docProgressStatus = document.getElementById("doc-progress-status");
    const docProgressPct = document.getElementById("doc-progress-pct");
    const docProgressFill = document.getElementById("doc-progress-fill");
    const docUploadSection = document.getElementById("doc-upload-section");
    const docResults = document.getElementById("doc-results");
    const btnNewDocAnalysis = document.getElementById("btn-new-doc-analysis");

    let currentSelectedFile = null;
    let currentDocumentData = null; // Stored in memory for chat and level changes

    if (btnBrowseFile && docFileInput) {
        btnBrowseFile.addEventListener("click", () => docFileInput.click());
    }
    if (docDropzone && docFileInput) {
        docDropzone.addEventListener("click", (e) => {
            if (e.target !== btnBrowseFile) docFileInput.click();
        });

        docDropzone.addEventListener("dragover", (e) => {
            e.preventDefault();
            docDropzone.classList.add("dragover");
        });

        docDropzone.addEventListener("dragleave", () => {
            docDropzone.classList.remove("dragover");
        });

        docDropzone.addEventListener("drop", (e) => {
            e.preventDefault();
            docDropzone.classList.remove("dragover");
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                handleFileSelection(e.dataTransfer.files[0]);
            }
        });
    }

    if (docFileInput) {
        docFileInput.addEventListener("change", () => {
            if (docFileInput.files && docFileInput.files.length > 0) {
                handleFileSelection(docFileInput.files[0]);
            }
        });
    }

    function handleFileSelection(file) {
        const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
        const allowed = [".pdf", ".docx", ".txt", ".md"];
        if (!allowed.includes(ext)) {
            showToast(`Formato no soportado (${ext}). Selecciona PDF, DOCX o TXT.`, "error");
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            showToast("El archivo supera el límite máximo de 10 MB.", "error");
            return;
        }

        currentSelectedFile = file;
        if (docFileName) docFileName.textContent = file.name;
        if (docFileSize) {
            docFileSize.textContent = file.size < 1024 * 1024
                ? `${(file.size / 1024).toFixed(1)} KB`
                : `${(file.size / (1024 * 1024)).toFixed(2)} MB`;
        }
        if (docFileExt) docFileExt.textContent = ext.replace(".", "");

        if (docFileIcon) {
            if (ext === ".pdf") docFileIcon.className = "fa-solid fa-file-pdf";
            else if (ext === ".docx") docFileIcon.className = "fa-solid fa-file-word";
            else docFileIcon.className = "fa-solid fa-file-lines";
        }

        if (docFileCard) docFileCard.style.display = "flex";
        if (docDropzone) docDropzone.style.display = "none";
        set3DCoreState("LOADING", `ARCHIVO SELECCIONADO: ${file.name.substring(0, 20)}...`);
    }

    if (btnRemoveDoc) {
        btnRemoveDoc.addEventListener("click", () => {
            currentSelectedFile = null;
            if (docFileInput) docFileInput.value = "";
            if (docFileCard) docFileCard.style.display = "none";
            if (docDropzone) docDropzone.style.display = "block";
            set3DCoreState("IDLE");
        });
    }

    function setDocProgress(pct, statusText) {
        if (docProgressFill) docProgressFill.style.width = `${pct}%`;
        if (docProgressPct) docProgressPct.textContent = `${pct}%`;
        if (docProgressStatus) {
            docProgressStatus.innerHTML = `<i class="fa-solid fa-spinner fa-spin" style="margin-right:.45rem;"></i>${statusText}`;
        }
    }

    if (btnAnalyzeDoc) {
        btnAnalyzeDoc.addEventListener("click", async () => {
            if (!currentSelectedFile) {
                showToast("Por favor selecciona un documento primero.", "error");
                return;
            }

            btnAnalyzeDoc.disabled = true;
            btnRemoveDoc.disabled = true;
            if (docProgressContainer) docProgressContainer.style.display = "block";

            // Stage 1: Preparation
            setDocProgress(20, "Preparando archivo y sanitizando buffer...");
            set3DCoreState("LOADING", "CARGANDO ARCHIVO EN MEMORIA");

            const formData = new FormData();
            formData.append("document", currentSelectedFile);

            try {
                // Stage 2: Processing & Text Extraction
                setTimeout(() => {
                    setDocProgress(45, "Extrayendo texto y calculando estructura...");
                    set3DCoreState("PROCESSING", "EXTRAYENDO TEXTO DIGITAL");
                }, 300);

                // Stage 3: AI Cognitive Synthesis
                setTimeout(() => {
                    setDocProgress(75, "Sintetizando ideas y conceptos con Gemini IA...");
                    set3DCoreState("ANALYZING", "SÍNTESIS COGNITIVA CON IA");
                }, 700);

                const response = await fetch("/api/documents/analyze", {
                    method: "POST",
                    body: formData
                });

                const data = await response.json();

                if (!response.ok || !data.success) {
                    throw new Error(data.error || "Error al analizar el documento.");
                }

                // Stage 4: Success
                setDocProgress(100, "¡Análisis completado!");
                set3DCoreState("SUCCESS", "DOCUMENTO ANALIZADO CON ÉXITO");

                currentDocumentData = {
                    filename: data.filename,
                    filesize: data.filesize,
                    pageCount: data.pageCount,
                    wordCount: data.wordCount,
                    charCount: data.charCount,
                    documentText: data.documentText,
                    analysis: data.analysis,
                    chatHistory: []
                };

                // Render Document Results
                renderDocumentResults(currentDocumentData);

                // Save to LocalStorage & Supabase History
                await saveAnalysisToHistory({
                    type: "document",
                    title: data.filename,
                    meta: `${data.pageCount} pág • ${data.wordCount} palabras`,
                    timestamp: new Date().toISOString(),
                    data: currentDocumentData
                });

                showToast("¡Documento analizado exitosamente!", "success");

                // Switch View
                setTimeout(() => {
                    if (docUploadSection) docUploadSection.style.display = "none";
                    if (docProgressContainer) docProgressContainer.style.display = "none";
                    if (docResults) {
                        docResults.style.display = "block";
                        docResults.scrollIntoView({ behavior: "smooth", block: "start" });
                    }
                    btnAnalyzeDoc.disabled = false;
                    btnRemoveDoc.disabled = false;
                }, 500);

            } catch (err) {
                console.error("[Document Analysis Error]", err);
                set3DCoreState("ERROR", "ERROR EN ANÁLISIS DOCUMENTAL");
                showToast(err.message || "No se pudo procesar el documento.", "error");
                btnAnalyzeDoc.disabled = false;
                btnRemoveDoc.disabled = false;
                if (docProgressContainer) docProgressContainer.style.display = "none";
            }
        });
    }

    function renderDocumentResults(docData) {
        const a = docData.analysis;

        // Meta header
        const fn = document.getElementById("doc-res-filename");
        const pg = document.getElementById("doc-res-pages");
        const wd = document.getElementById("doc-res-words");
        const sz = document.getElementById("doc-res-size");
        const mb = document.getElementById("doc-res-mode-badge");

        if (fn) fn.textContent = docData.filename;
        if (pg) pg.textContent = docData.pageCount;
        if (wd) wd.textContent = docData.wordCount.toLocaleString("es-CO");
        if (sz) sz.textContent = docData.filesize;
        if (mb) {
            mb.textContent = a.isAiGenerated ? `Gemini (${a.modelUsed})` : "Análisis Estático Real";
        }

        // Executive Summary
        const sumEl = document.getElementById("doc-res-summary");
        if (sumEl) sumEl.textContent = a.summary || "Sin resumen disponible.";

        // Main Ideas
        const ideasList = document.getElementById("doc-res-main-ideas");
        if (ideasList) {
            ideasList.innerHTML = "";
            (a.mainIdeas || []).forEach(idea => {
                const li = document.createElement("li");
                li.innerHTML = `<span style="color:#FBBF24;font-weight:700;margin-right:.4rem;">&bull;</span>${idea}`;
                ideasList.appendChild(li);
            });
        }

        // Conclusions
        const concList = document.getElementById("doc-res-conclusions");
        if (concList) {
            concList.innerHTML = "";
            (a.conclusions || []).forEach(conc => {
                const li = document.createElement("li");
                li.innerHTML = `<span style="color:#34D399;font-weight:700;margin-right:.4rem;">&check;</span>${conc}`;
                concList.appendChild(li);
            });
        }

        // Concepts & Keywords
        const conceptsBox = document.getElementById("doc-res-concepts");
        if (conceptsBox) {
            conceptsBox.innerHTML = "";
            (a.keyConcepts || []).forEach(concept => {
                const span = document.createElement("span");
                span.className = "badge badge-cyan";
                span.style.fontSize = "0.74rem";
                span.innerHTML = `<i class="fa-solid fa-cube" style="margin-right:.3rem;"></i>${concept}`;
                conceptsBox.appendChild(span);
            });
            (a.keywords || []).forEach(kw => {
                const span = document.createElement("span");
                span.style.background = "rgba(129,140,248,.12)";
                span.style.border = "1px solid rgba(129,140,248,.25)";
                span.style.color = "#A5B4FC";
                span.style.padding = ".25rem .65rem";
                span.style.borderRadius = "9999px";
                span.style.fontSize = "0.72rem";
                span.style.fontFamily = "'JetBrains Mono', monospace";
                span.textContent = `#${kw}`;
                conceptsBox.appendChild(span);
            });
        }

        // Explanations
        const expEl = document.getElementById("doc-res-explanation");
        if (expEl && a.explanations) {
            expEl.textContent = a.explanations.basic || "";
        }

        // Explanation level chips
        const levelChips = document.querySelectorAll(".level-chip");
        levelChips.forEach(chip => {
            chip.onclick = () => {
                levelChips.forEach(c => c.classList.remove("active"));
                chip.classList.add("active");
                const lvl = chip.getAttribute("data-level");
                if (expEl && a.explanations && a.explanations[lvl]) {
                    expEl.textContent = a.explanations[lvl];
                }
            };
        });

        // Questions
        const qList = document.getElementById("doc-res-questions");
        if (qList) {
            qList.innerHTML = "";
            (a.studyQuestions || []).forEach((q, idx) => {
                const li = document.createElement("li");
                li.innerHTML = `<span style="color:var(--tech-cyan);font-weight:700;margin-right:.4rem;">${idx + 1}.</span>${q}`;
                qList.appendChild(li);
            });
        }

        // Entities & Dates
        const entBox = document.getElementById("doc-res-entities");
        if (entBox && a.entities) {
            entBox.innerHTML = "";
            if (a.entities.dates && a.entities.dates.length > 0) {
                const p = document.createElement("div");
                p.innerHTML = `<span style="color:#818CF8;font-weight:700;">Fechas citadas:</span> ${a.entities.dates.join(", ")}`;
                entBox.appendChild(p);
            }
            if (a.entities.metrics && a.entities.metrics.length > 0) {
                const p = document.createElement("div");
                p.innerHTML = `<span style="color:#34D399;font-weight:700;">Métricas / Cifras:</span> ${a.entities.metrics.join(", ")}`;
                entBox.appendChild(p);
            }
            if (a.entities.keyTopics && a.entities.keyTopics.length > 0) {
                const p = document.createElement("div");
                p.innerHTML = `<span style="color:var(--tech-cyan);font-weight:700;">Tópicos:</span> ${a.entities.keyTopics.join(", ")}`;
                entBox.appendChild(p);
            }
        }

        // Reset chat message area
        const chatArea = document.getElementById("doc-chat-messages");
        if (chatArea) {
            chatArea.innerHTML = `
                <div class="chat-bubble chat-bubble-ai">
                    He completado el análisis de <strong>${docData.filename}</strong>. Puedes preguntarme cualquier detalle específico, resúmenes por sección o explicaciones técnicas fundamentadas en el documento.
                </div>
            `;
        }
    }

    if (btnNewDocAnalysis) {
        btnNewDocAnalysis.addEventListener("click", () => {
            currentSelectedFile = null;
            currentDocumentData = null;
            if (docFileInput) docFileInput.value = "";
            if (docFileCard) docFileCard.style.display = "none";
            if (docDropzone) docDropzone.style.display = "block";
            if (docResults) docResults.style.display = "none";
            if (docUploadSection) docUploadSection.style.display = "block";
            set3DCoreState("IDLE");
        });
    }

    // ------------------------------------------------------------
    // 8.1 Contextual Chat with Document
    // ------------------------------------------------------------
    const docChatInput = document.getElementById("doc-chat-input");
    const btnDocChatSend = document.getElementById("btn-doc-chat-send");
    const docChatMessages = document.getElementById("doc-chat-messages");

    async function sendDocChatMessage(userQuery) {
        const msg = (userQuery || (docChatInput ? docChatInput.value : "")).trim();
        if (!msg) return;

        if (!currentDocumentData || !currentDocumentData.documentText) {
            showToast("Por favor analiza un documento primero.", "error");
            return;
        }

        if (docChatInput) docChatInput.value = "";

        // Append user bubble
        appendChatBubble(docChatMessages, msg, "user");

        // Append loading bubble
        const loadingId = "loading-doc-" + Date.now();
        const loadingBubble = document.createElement("div");
        loadingBubble.id = loadingId;
        loadingBubble.className = "chat-bubble chat-bubble-ai";
        loadingBubble.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin" style="margin-right:.4rem;color:var(--tech-cyan);"></i>Consultando documento...`;
        docChatMessages.appendChild(loadingBubble);
        docChatMessages.scrollTop = docChatMessages.scrollHeight;

        set3DCoreState("ANALYZING", "RESPONDIENDO CONSULTA DEL DOCUMENTO");

        try {
            const res = await fetch("/api/documents/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    documentText: currentDocumentData.documentText,
                    chatHistory: currentDocumentData.chatHistory,
                    message: msg
                })
            });

            const data = await res.json();
            const loadingEl = document.getElementById(loadingId);
            if (loadingEl) loadingEl.remove();

            if (!res.ok || !data.success) {
                throw new Error(data.error || "No se pudo obtener respuesta.");
            }

            appendChatBubble(docChatMessages, data.reply, "ai");

            // Update history in memory
            currentDocumentData.chatHistory.push({ role: "user", text: msg });
            currentDocumentData.chatHistory.push({ role: "model", text: data.reply });

            set3DCoreState("SUCCESS", "CONSULTA RESUELTA");
        } catch (err) {
            const loadingEl = document.getElementById(loadingId);
            if (loadingEl) loadingEl.remove();
            appendChatBubble(docChatMessages, `Error: ${err.message}`, "ai");
            set3DCoreState("ERROR", "ERROR EN CONSULTA");
        }
    }

    if (btnDocChatSend) {
        btnDocChatSend.addEventListener("click", () => sendDocChatMessage());
    }
    if (docChatInput) {
        docChatInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") sendDocChatMessage();
        });
    }

    // Quick questions chips
    document.querySelectorAll(".doc-quick-q").forEach(btn => {
        btn.addEventListener("click", () => {
            sendDocChatMessage(btn.textContent);
        });
    });

    // ============================================================
    // 9. GITHUB REPOSITORY PIPELINE
    // ============================================================
    const repoInput = document.getElementById("repo-input");
    const btnRunAnalysis = document.getElementById("btn-run-analysis");
    const ghProgressContainer = document.getElementById("gh-progress-container");
    const ghProgressStatus = document.getElementById("gh-progress-status");
    const ghProgressPct = document.getElementById("gh-progress-pct");
    const ghProgressFill = document.getElementById("gh-progress-fill");
    const ghInputSection = document.getElementById("gh-input-section");
    const ghResults = document.getElementById("gh-results");
    const btnNewGhAnalysis = document.getElementById("btn-new-gh-analysis");

    let currentRepoData = null; // Stored in memory for repo chat

    // Example chips
    document.querySelectorAll(".gh-example-chip").forEach(chip => {
        chip.addEventListener("click", () => {
            if (repoInput) {
                repoInput.value = chip.getAttribute("data-repo");
                repoInput.focus();
            }
        });
    });

    function setGhProgress(pct, statusText) {
        if (ghProgressFill) ghProgressFill.style.width = `${pct}%`;
        if (ghProgressPct) ghProgressPct.textContent = `${pct}%`;
        if (ghProgressStatus) {
            ghProgressStatus.innerHTML = `<i class="fa-solid fa-spinner fa-spin" style="margin-right:.45rem;"></i>${statusText}`;
        }
    }

    if (btnRunAnalysis) {
        btnRunAnalysis.addEventListener("click", async () => {
            const rawUrl = (repoInput ? repoInput.value : "").trim();
            if (!rawUrl) {
                showToast("Ingresa la URL de un repositorio de GitHub.", "error");
                return;
            }

            btnRunAnalysis.disabled = true;
            if (ghProgressContainer) ghProgressContainer.style.display = "block";

            // Stage 1: Validation & Connect
            setGhProgress(20, "Validando repositorio en GitHub API...");
            set3DCoreState("LOADING", "CONECTANDO CON GITHUB");

            try {
                // Stage 2: Tree extraction & filtering
                setTimeout(() => {
                    setGhProgress(50, "Descargando árbol de directorios y filtrando archivos...");
                    set3DCoreState("PROCESSING", "FILTRANDO CÓDIGO Y DEPENDENCIAS");
                }, 400);

                // Stage 3: Architecture Analysis
                setTimeout(() => {
                    setGhProgress(75, "Analizando arquitectura, dependencias y seguridad...");
                    set3DCoreState("ANALYZING", "ANÁLISIS DE ARQUITECTURA CON IA");
                }, 900);

                const response = await fetch("/api/github/analyze", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ repoUrl: rawUrl })
                });

                const data = await response.json();

                if (!response.ok || !data.success) {
                    throw new Error(data.error || "No se pudo analizar el repositorio.");
                }

                // Stage 4: Success
                setGhProgress(100, "¡Repositorio analizado con éxito!");
                set3DCoreState("SUCCESS", "REPOSITORIO SINCRONIZADO");

                currentRepoData = {
                    repository: data.repository,
                    stats: data.stats,
                    detectedTechnologies: data.detectedTechnologies,
                    treeDiagram: data.treeDiagram,
                    keyFiles: data.keyFiles,
                    analysis: data.analysis,
                    repoContext: data.repoContext,
                    chatHistory: []
                };

                // Render Results
                renderGitHubResults(currentRepoData);

                // Save to LocalStorage & Supabase History
                await saveAnalysisToHistory({
                    type: "github",
                    title: data.repository.fullName,
                    meta: `${data.repository.primaryLanguage} • ${data.stats.relevantFilesCount} archivos`,
                    timestamp: new Date().toISOString(),
                    data: currentRepoData
                });

                showToast(`¡Repositorio ${data.repository.name} analizado!`, "success");

                // Switch View
                setTimeout(() => {
                    if (ghInputSection) ghInputSection.style.display = "none";
                    if (ghProgressContainer) ghProgressContainer.style.display = "none";
                    if (ghResults) {
                        ghResults.style.display = "block";
                        ghResults.scrollIntoView({ behavior: "smooth", block: "start" });
                    }
                    btnRunAnalysis.disabled = false;
                }, 500);

            } catch (err) {
                console.error("[GitHub Analysis Error]", err);
                set3DCoreState("ERROR", "ERROR EN ANÁLISIS DE GITHUB");
                showToast(err.message || "No se pudo conectar con el repositorio.", "error");
                btnRunAnalysis.disabled = false;
                if (ghProgressContainer) ghProgressContainer.style.display = "none";
            }
        });
    }

    function renderGitHubResults(repoObj) {
        const repo = repoObj.repository;
        const stats = repoObj.stats;
        const a = repoObj.analysis;

        // Meta Header
        const nameEl = document.getElementById("gh-res-name");
        const descEl = document.getElementById("gh-res-desc");
        const langEl = document.getElementById("gh-res-lang");
        const starsEl = document.getElementById("gh-res-stars");
        const forksEl = document.getElementById("gh-res-forks");
        const filesEl = document.getElementById("gh-res-files-count");
        const modeBadge = document.getElementById("gh-res-mode-badge");

        if (nameEl) nameEl.textContent = repo.fullName;
        if (descEl) descEl.textContent = repo.description;
        if (langEl) langEl.textContent = repo.primaryLanguage;
        if (starsEl) starsEl.textContent = repo.stars.toLocaleString();
        if (forksEl) forksEl.textContent = repo.forks.toLocaleString();
        if (filesEl) filesEl.textContent = stats.relevantFilesCount;
        if (modeBadge) {
            modeBadge.textContent = a.isAiGenerated ? `Gemini (${a.modelUsed})` : "Análisis Estático Real";
        }

        // Technologies Chips
        const techChipsBox = document.getElementById("gh-tech-chips");
        if (techChipsBox) {
            techChipsBox.innerHTML = "";
            (repoObj.detectedTechnologies || []).forEach(tech => {
                const chip = document.createElement("span");
                chip.className = "badge badge-cyan";
                chip.style.fontSize = "0.75rem";
                chip.innerHTML = `<i class="fa-solid fa-code" style="margin-right:.3rem;"></i>${tech}`;
                techChipsBox.appendChild(chip);
            });
            if (!repoObj.detectedTechnologies || repoObj.detectedTechnologies.length === 0) {
                techChipsBox.innerHTML = `<span class="badge badge-indigo">${repo.primaryLanguage}</span>`;
            }
        }

        // Overview & Architecture
        const overEl = document.getElementById("gh-res-overview");
        const archEl = document.getElementById("gh-res-architecture");
        const flowEl = document.getElementById("gh-res-flow");

        if (overEl) overEl.textContent = a.overview || "Propósito del proyecto analizado.";
        if (archEl) archEl.textContent = a.architecture || "Organización modular detectada.";
        if (flowEl) flowEl.textContent = a.flow || "Flujo de control del sistema.";

        // Tree Diagram
        const treeEl = document.getElementById("gh-tree-diagram");
        if (treeEl) treeEl.textContent = repoObj.treeDiagram || "Árbol no disponible.";

        // Key Files
        const keyFilesBox = document.getElementById("gh-key-files-container");
        if (keyFilesBox) {
            keyFilesBox.innerHTML = "";
            const files = a.keyFiles || [];
            files.forEach(kf => {
                const div = document.createElement("div");
                div.style.background = "rgba(9,13,22,.6)";
                div.style.padding = ".75rem .9rem";
                div.style.borderRadius = ".55rem";
                div.style.border = "1px solid rgba(129,140,248,.15)";
                div.innerHTML = `
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.2rem;">
                        <span style="font-family:'JetBrains Mono',monospace;color:var(--tech-cyan);font-weight:700;font-size:.75rem;">${kf.path}</span>
                        <span style="font-size:.65rem;color:#818CF8;background:rgba(129,140,248,.1);padding:.1rem .4rem;border-radius:4px;">${kf.role || 'Módulo'}</span>
                    </div>
                    <p style="color:#94A3B8;font-size:.72rem;line-height:1.5;">${kf.description || ''}</p>
                `;
                keyFilesBox.appendChild(div);
            });
        }

        // Findings & Security
        const findingsBox = document.getElementById("gh-findings-container");
        if (findingsBox) {
            findingsBox.innerHTML = "";
            const findings = a.findings || [];
            findings.forEach(fd => {
                const cat = (fd.category || "Recomendación").toLowerCase();
                let badgeClass = "badge-category-recommendation";
                let icon = "fa-circle-check";
                if (cat.includes("confirmado") || cat.includes("error")) {
                    badgeClass = "badge-category-confirmed";
                    icon = "fa-triangle-exclamation";
                } else if (cat.includes("posible")) {
                    badgeClass = "badge-category-potential";
                    icon = "fa-circle-exclamation";
                }

                const card = document.createElement("div");
                card.style.background = "rgba(9,13,22,.6)";
                card.style.padding = "1rem 1.15rem";
                card.style.borderRadius = ".65rem";
                card.style.border = "1px solid rgba(129,140,248,.16)";
                card.innerHTML = `
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:.5rem;flex-wrap:wrap;margin-bottom:.4rem;">
                        <h5 style="font-size:.84rem;font-weight:700;color:#fff;display:flex;align-items:center;gap:.4rem;">
                            <i class="fa-solid ${icon}" style="font-size:.75rem;"></i>${fd.title}
                        </h5>
                        <span class="badge ${badgeClass}" style="font-size:.65rem;padding:.15rem .5rem;border-radius:9999px;font-weight:700;">
                            ${fd.category}
                        </span>
                    </div>
                    <p style="font-size:.78rem;color:#CBD5E1;line-height:1.6;margin-bottom:.35rem;">${fd.description}</p>
                    <p style="font-size:.72rem;color:#64748B;font-style:italic;"><strong style="color:#94A3B8;">Motivo técnico:</strong> ${fd.rationale}</p>
                `;
                findingsBox.appendChild(card);
            });
        }

        // Onboarding Guide
        const onbEl = document.getElementById("gh-res-onboarding");
        if (onbEl) onbEl.textContent = a.onboardingGuide || "Sin guía de onboarding disponible.";

        // Reset chat message area
        const ghChatArea = document.getElementById("gh-chat-messages");
        if (ghChatArea) {
            ghChatArea.innerHTML = `
                <div class="chat-bubble chat-bubble-ai">
                    He analizado el repositorio <strong>${repo.fullName}</strong>. Puedes preguntarme sobre su flujo de ejecución, funciones específicas o cómo extender sus módulos.
                </div>
            `;
        }
    }

    if (btnNewGhAnalysis) {
        btnNewGhAnalysis.addEventListener("click", () => {
            currentRepoData = null;
            if (ghResults) ghResults.style.display = "none";
            if (ghInputSection) ghInputSection.style.display = "block";
            set3DCoreState("IDLE");
        });
    }

    // ------------------------------------------------------------
    // 9.1 Contextual Chat with Repository
    // ------------------------------------------------------------
    const ghChatInput = document.getElementById("gh-chat-input");
    const btnGhChatSend = document.getElementById("btn-gh-chat-send");
    const ghChatMessages = document.getElementById("gh-chat-messages");

    async function sendGhChatMessage(userQuery) {
        const msg = (userQuery || (ghChatInput ? ghChatInput.value : "")).trim();
        if (!msg) return;

        if (!currentRepoData || !currentRepoData.repoContext) {
            showToast("Por favor analiza un repositorio primero.", "error");
            return;
        }

        if (ghChatInput) ghChatInput.value = "";

        appendChatBubble(ghChatMessages, msg, "user");

        const loadingId = "loading-gh-" + Date.now();
        const loadingBubble = document.createElement("div");
        loadingBubble.id = loadingId;
        loadingBubble.className = "chat-bubble chat-bubble-ai";
        loadingBubble.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin" style="margin-right:.4rem;color:var(--tech-cyan);"></i>Inspeccionando archivos del repositorio...`;
        ghChatMessages.appendChild(loadingBubble);
        ghChatMessages.scrollTop = ghChatMessages.scrollHeight;

        set3DCoreState("ANALYZING", "CONSULTANDO REPOSITORIO CON IA");

        try {
            const res = await fetch("/api/github/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    repoContext: currentRepoData.repoContext,
                    chatHistory: currentRepoData.chatHistory,
                    message: msg
                })
            });

            const data = await res.json();
            const loadingEl = document.getElementById(loadingId);
            if (loadingEl) loadingEl.remove();

            if (!res.ok || !data.success) {
                throw new Error(data.error || "No se pudo obtener respuesta del repositorio.");
            }

            appendChatBubble(ghChatMessages, data.reply, "ai");

            currentRepoData.chatHistory.push({ role: "user", text: msg });
            currentRepoData.chatHistory.push({ role: "model", text: data.reply });

            set3DCoreState("SUCCESS", "CONSULTA RESUELTA");
        } catch (err) {
            const loadingEl = document.getElementById(loadingId);
            if (loadingEl) loadingEl.remove();
            appendChatBubble(ghChatMessages, `Error: ${err.message}`, "ai");
            set3DCoreState("ERROR", "ERROR EN CONSULTA");
        }
    }

    if (btnGhChatSend) {
        btnGhChatSend.addEventListener("click", () => sendGhChatMessage());
    }
    if (ghChatInput) {
        ghChatInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") sendGhChatMessage();
        });
    }

    document.querySelectorAll(".gh-quick-q").forEach(btn => {
        btn.addEventListener("click", () => {
            sendGhChatMessage(btn.textContent);
        });
    });

    // ------------------------------------------------------------
    // 10. General Chat Bubble Helper
    // ------------------------------------------------------------
    function appendChatBubble(container, text, sender = "ai") {
        if (!container) return;
        const bubble = document.createElement("div");
        bubble.className = `chat-bubble ${sender === "user" ? "chat-bubble-user" : "chat-bubble-ai"}`;
        
        // Escape HTML for safety while preserving line breaks and backticks
        const formatted = text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/`([^`]+)`/g, '<code style="background:rgba(15,23,42,.9);border:1px solid rgba(129,140,248,.3);padding:.1rem .3rem;border-radius:4px;font-family:\'JetBrains Mono\',monospace;color:var(--tech-cyan);">$1</code>')
            .replace(/\n/g, "<br>");

        bubble.innerHTML = formatted;
        container.appendChild(bubble);
        container.scrollTop = container.scrollHeight;
    }

    // ============================================================
    // 11. HYBRID PERSISTENT HISTORY (LOCALSTORAGE + SUPABASE DB)
    // ============================================================
    const historyList = document.getElementById("history-list");
    const historyBadgeCount = document.getElementById("history-badge-count");
    const btnClearHistory = document.getElementById("btn-clear-history");

    function getSavedHistory() {
        try {
            return JSON.parse(localStorage.getItem("documind_history") || "[]");
        } catch (e) {
            return [];
        }
    }

    async function syncAnalysisToSupabase(entry) {
        if (!supabaseClient || !currentUser) return null;
        try {
            const { data, error } = await supabaseClient.from("analyses").insert({
                user_id: currentUser.id,
                type: entry.type,
                title: entry.title,
                meta: entry.meta,
                data: entry.data
            }).select();

            if (error) {
                console.warn("Supabase insert warning:", error.message);
                return null;
            }
            return data && data[0] ? data[0].id : null;
        } catch (err) {
            console.warn("Supabase sync exception:", err);
            return null;
        }
    }

    async function saveAnalysisToHistory(entry) {
        const history = getSavedHistory();
        
        // Sync with Supabase if authenticated
        let cloudId = null;
        if (currentUser && supabaseClient) {
            cloudId = await syncAnalysisToSupabase(entry);
        }

        const enrichedEntry = {
            ...entry,
            cloudId: cloudId,
            isCloud: Boolean(cloudId)
        };

        history.unshift(enrichedEntry);
        const trimmed = history.slice(0, 25);
        localStorage.setItem("documind_history", JSON.stringify(trimmed));
        updateHistoryBadge();
        renderHistoryList();
    }

    async function loadSupabaseHistory() {
        if (!supabaseClient || !currentUser) {
            renderHistoryList();
            return;
        }

        try {
            const { data, error } = await supabaseClient
                .from("analyses")
                .select("*")
                .order("created_at", { ascending: false })
                .limit(25);

            if (!error && data) {
                const cloudItems = data.map(item => ({
                    cloudId: item.id,
                    type: item.type,
                    title: item.title,
                    meta: item.meta,
                    timestamp: item.created_at,
                    data: item.data,
                    isCloud: true
                }));

                localStorage.setItem("documind_history", JSON.stringify(cloudItems));
                updateHistoryBadge();
                renderHistoryList();
            } else {
                renderHistoryList();
            }
        } catch (err) {
            console.warn("Error loading Supabase history:", err);
            renderHistoryList();
        }
    }

    function updateHistoryBadge() {
        const history = getSavedHistory();
        if (historyBadgeCount) historyBadgeCount.textContent = history.length;
    }
    updateHistoryBadge();

    function renderHistoryList() {
        if (!historyList) return;
        const history = getSavedHistory();
        historyList.innerHTML = "";

        if (history.length === 0) {
            historyList.innerHTML = `
                <p style="font-size:.82rem;color:#64748B;text-align:center;padding:2.5rem 0;">
                    <i class="fa-solid fa-folder-open" style="display:block;font-size:1.75rem;color:#475569;margin-bottom:.75rem;"></i>
                    Aún no tienes análisis registrados. Sube un documento o analiza un repositorio para verlo reflejado aquí.
                    ${currentUser ? '<br><span style="color:#34D399;font-size:.75rem;margin-top:.4rem;display:inline-block;"><i class="fa-solid fa-cloud"></i> Conectado a tu cuenta de Supabase</span>' : ''}
                </p>
            `;
            return;
        }

        history.forEach((item, idx) => {
            const el = document.createElement("div");
            el.className = "history-item-cyber";
            const icon = item.type === "document" ? "fa-file-lines text-cyan-400" : "fa-brands fa-github text-indigo-400";
            const typeLabel = item.type === "document" ? "Documento" : "GitHub";
            const dateStr = item.timestamp ? new Date(item.timestamp).toLocaleDateString("es-CO", { hour: "2-digit", minute: "2-digit" }) : "Reciente";
            const cloudBadge = item.isCloud 
                ? `<span style="display:inline-flex;align-items:center;gap:.25rem;font-size:.65rem;color:#34D399;margin-left:.4rem;background:rgba(52,211,153,.1);border:1px solid rgba(52,211,153,.25);padding:.1rem .35rem;border-radius:.35rem;"><i class="fa-solid fa-cloud"></i> Nube</span>` 
                : '';

            el.innerHTML = `
                <div style="display:flex;align-items:center;gap:.75rem;min-width:0;">
                    <div style="width:2.25rem;height:2.25rem;border-radius:.5rem;background:rgba(15,23,42,.9);border:1px solid rgba(129,140,248,.2);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                        <i class="fa-solid ${icon}"></i>
                    </div>
                    <div style="min-width:0;">
                        <h5 style="font-size:.82rem;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:flex;align-items:center;">
                            <span style="overflow:hidden;text-overflow:ellipsis;">${item.title}</span>
                            ${cloudBadge}
                        </h5>
                        <p style="font-size:.68rem;color:#64748B;font-family:'JetBrains Mono',monospace;">${typeLabel} &bull; ${item.meta} &bull; ${dateStr}</p>
                    </div>
                </div>
                <div style="display:flex;align-items:center;gap:.5rem;flex-shrink:0;">
                    <button type="button" class="btn-load-history btn-cyber" data-idx="${idx}" style="padding:.35rem .75rem;font-size:.72rem;">
                        <i class="fa-solid fa-folder-open" style="margin-right:.25rem;"></i>Cargar
                    </button>
                    <button type="button" class="btn-delete-history btn-ghost" data-idx="${idx}" style="padding:.35rem .6rem;font-size:.72rem;color:#FB7185;">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            `;
            historyList.appendChild(el);
        });

        // Bind Cargar buttons
        document.querySelectorAll(".btn-load-history").forEach(btn => {
            btn.onclick = () => {
                const idx = parseInt(btn.getAttribute("data-idx"), 10);
                const item = history[idx];
                if (!item) return;

                if (item.type === "document") {
                    currentDocumentData = item.data;
                    renderDocumentResults(item.data);
                    switchTab("doc");
                    if (docUploadSection) docUploadSection.style.display = "none";
                    if (docResults) {
                        docResults.style.display = "block";
                        docResults.scrollIntoView({ behavior: "smooth", block: "start" });
                    }
                    set3DCoreState("SUCCESS", `CARGADO: ${item.title}`);
                } else if (item.type === "github") {
                    currentRepoData = item.data;
                    renderGitHubResults(item.data);
                    switchTab("gh");
                    if (ghInputSection) ghInputSection.style.display = "none";
                    if (ghResults) {
                        ghResults.style.display = "block";
                        ghResults.scrollIntoView({ behavior: "smooth", block: "start" });
                    }
                    set3DCoreState("SUCCESS", `CARGADO: ${item.title}`);
                }
                showToast(`Análisis "${item.title}" cargado.`, "success");
            };
        });

        // Bind Delete buttons
        document.querySelectorAll(".btn-delete-history").forEach(btn => {
            btn.onclick = async () => {
                const idx = parseInt(btn.getAttribute("data-idx"), 10);
                const item = history[idx];
                if (!item) return;

                // Delete from Supabase if stored there
                if (item.cloudId && supabaseClient && currentUser) {
                    try {
                        await supabaseClient.from("analyses").delete().eq("id", item.cloudId);
                    } catch (err) {
                        console.warn("Error borrando de Supabase:", err);
                    }
                }

                history.splice(idx, 1);
                localStorage.setItem("documind_history", JSON.stringify(history));
                renderHistoryList();
                updateHistoryBadge();
                showToast("Elemento eliminado del historial.", "info");
            };
        });
    }

    if (btnClearHistory) {
        btnClearHistory.addEventListener("click", async () => {
            if (confirm("¿Estás seguro de que deseas vaciar el historial de análisis?")) {
                if (currentUser && supabaseClient) {
                    try {
                        await supabaseClient.from("analyses").delete().eq("user_id", currentUser.id);
                    } catch (err) {
                        console.warn("Error vaciando de Supabase:", err);
                    }
                }
                localStorage.removeItem("documind_history");
                renderHistoryList();
                updateHistoryBadge();
                showToast("Historial vaciado.", "info");
            }
        });
    }

    // ------------------------------------------------------------
    // 12. Interactive Role Chips Selection & Access Pass
    // ------------------------------------------------------------
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

            const existingLeads = JSON.parse(localStorage.getItem("documind_leads") || "[]");
            existingLeads.push(leadData);
            localStorage.setItem("documind_leads", JSON.stringify(existingLeads));

            registered += 1;
            localStorage.setItem("documind_registered", registered.toString());
            if (registeredCounter) registeredCounter.textContent = registered.toLocaleString("es-CO");
            
            availableSpots = Math.max(1, availableSpots - 1);
            if (spotsLeft) spotsLeft.textContent = `🔥 ${availableSpots} cupos restantes`;

            if (passHolderName) passHolderName.textContent = name;
            if (passIdCode) passIdCode.textContent = passId;
            if (passInviteLink) passInviteLink.textContent = `https://dsantiagopsandoval.github.io/Document-mind-ai/?pass=${passId}`;

            if (vipPassResult) {
                vipPassResult.classList.remove("hidden");
                vipPassResult.scrollIntoView({ behavior: "smooth", block: "center" });
            }

            showToast(`¡Llave de acceso ${passId} generada con éxito!`, "success");
            leadForm.reset();
        });
    }

    if (btnCopyPass && passInviteLink) {
        btnCopyPass.addEventListener("click", () => {
            navigator.clipboard.writeText(passInviteLink.textContent).then(() => {
                btnCopyPass.innerHTML = `<i class="fa-solid fa-check mr-1"></i> ¡Copiado!`;
                showToast("Enlace copiado al portapapeles", "success");
                setTimeout(() => {
                    btnCopyPass.innerHTML = `<i class="fa-solid fa-copy mr-1"></i> Copiar`;
                }, 2500);
            });
        });
    }
});
