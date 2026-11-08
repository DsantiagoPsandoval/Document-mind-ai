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
    // DOM Elements - Nav & User Capsule
    const navAuthGuest = document.getElementById("nav-auth-guest");
    const btnOpenAuthModal = document.getElementById("btn-open-auth-modal");
    const navAuthUser = document.getElementById("nav-auth-user");
    const userMenuBtn = document.getElementById("user-menu-btn");
    const navUserAvatar = document.getElementById("nav-user-avatar");
    const navUserEmail = document.getElementById("nav-user-email");
    const userDropdownMenu = document.getElementById("user-dropdown-menu");
    const dropdownUserName = document.getElementById("dropdown-user-name");
    const dropdownUserEmail = document.getElementById("dropdown-user-email");
    const btnUserAccount = document.getElementById("btn-user-account");
    const btnUserHistory = document.getElementById("btn-user-history");
    const btnUserPrivacy = document.getElementById("btn-user-privacy");
    const btnLogout = document.getElementById("btn-logout");

    // DOM Elements - Mobile Menu Auth
    const mobileAuthGuest = document.getElementById("mobile-auth-guest");
    const mobileAuthUser = document.getElementById("mobile-auth-user");
    const btnMobileOpenAuth = document.getElementById("btn-mobile-open-auth");
    const mobileUserEmail = document.getElementById("mobile-user-email");
    const btnMobileLogout = document.getElementById("btn-mobile-logout");

    // DOM Elements - Auth Modal & Welcome Banner
    const authModal = document.getElementById("auth-modal");
    const authModalBackdrop = document.getElementById("auth-modal-backdrop");
    const btnCloseAuthModal = document.getElementById("btn-close-auth-modal");
    const authUnconfiguredAlert = document.getElementById("auth-unconfigured-alert");
    const authAlertBox = document.getElementById("auth-alert-box");
    const btnOAuthGoogle = document.getElementById("btn-oauth-google");
    const googleBtnText = document.getElementById("google-btn-text");

    // Account & Privacy Modals
    const accountModal = document.getElementById("account-modal");
    const btnCloseAccountModal = document.getElementById("btn-close-account-modal");
    const accountModalBackdrop = document.getElementById("account-modal-backdrop");
    const btnAccCloseAction = document.getElementById("btn-acc-close-action");
    const btnAccLogout = document.getElementById("btn-acc-logout");
    const privacyModal = document.getElementById("privacy-modal");
    const btnClosePrivacyModal = document.getElementById("btn-close-privacy-modal");
    const privacyModalBackdrop = document.getElementById("privacy-modal-backdrop");
    const btnPrivacyOk = document.getElementById("btn-privacy-ok");
    const btnOpenPrivacyLink = document.getElementById("btn-open-privacy-link");
    const btnOpenTermsLink = document.getElementById("btn-open-terms-link");

    // Welcome Banner Elements
    const userWelcomeBanner = document.getElementById("user-welcome-banner");
    const welcomeGreeting = document.getElementById("welcome-banner-greeting");
    const welcomeUserName = document.getElementById("welcome-user-name");
    const welcomeUserAvatar = document.getElementById("welcome-user-avatar");
    const welcomeProfileName = document.getElementById("welcome-profile-name");
    const welcomeProfileEmail = document.getElementById("welcome-profile-email");
    const btnBannerAccount = document.getElementById("btn-banner-account");
    const btnBannerLogout = document.getElementById("btn-banner-logout");

    function getLocalGreeting() {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) return "Buenos días";
        if (hour >= 12 && hour < 19) return "Buenas tardes";
        return "Buenas noches";
    }

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

    function openAuthModal() {
        if (!authModal) return;
        setAuthAlert("");
        if (authUnconfiguredAlert) {
            authUnconfiguredAlert.style.display = isSupabaseConfigured ? "none" : "block";
        }
        authModal.classList.remove("hidden");
        document.body.style.overflow = "hidden";
    }

    function closeAuthModal() {
        if (!authModal) return;
        authModal.classList.add("hidden");
        document.body.style.overflow = "";
        setAuthAlert("");
    }

    function openAccountModal() {
        if (!currentUser || !accountModal) return;
        const meta = currentUser.user_metadata || {};
        const email = currentUser.email || "";
        const fullName = meta.full_name || meta.name || (email ? email.split("@")[0].replace(/[._-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : "Usuario");
        const avatarUrl = meta.avatar_url || meta.picture || "";
        const initials = fullName.slice(0, 2).toUpperCase() || "US";

        const accName = document.getElementById("acc-modal-name");
        const accEmail = document.getElementById("acc-modal-email");
        const accAvatar = document.getElementById("acc-modal-avatar");
        const accId = document.getElementById("acc-modal-id");

        if (accName) accName.textContent = fullName;
        if (accEmail) accEmail.textContent = email;
        if (accId) accId.textContent = currentUser.id ? currentUser.id.slice(0, 16) + '...' : 'UUID';
        if (accAvatar) {
            if (avatarUrl) {
                accAvatar.innerHTML = `<img src="${avatarUrl}" alt="${fullName}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
            } else {
                accAvatar.innerHTML = `<span>${initials}</span>`;
            }
        }
        accountModal.classList.remove("hidden");
        document.body.style.overflow = "hidden";
    }

    function closeAccountModal() {
        if (accountModal) accountModal.classList.add("hidden");
        document.body.style.overflow = "";
    }

    function openPrivacyModal() {
        if (privacyModal) {
            privacyModal.classList.remove("hidden");
            document.body.style.overflow = "hidden";
        }
    }

    function closePrivacyModal() {
        if (privacyModal) privacyModal.classList.add("hidden");
        document.body.style.overflow = "";
    }

    function updateAuthUI(user) {
        currentUser = user;

        if (user) {
            if (navAuthGuest) navAuthGuest.style.display = "none";
            if (navAuthUser) navAuthUser.style.display = "inline-flex";
            if (mobileAuthGuest) mobileAuthGuest.style.display = "none";
            if (mobileAuthUser) mobileAuthUser.style.display = "flex";

            const meta = user.user_metadata || {};
            const email = user.email || "usuario@correo.com";
            const fullName = meta.full_name || meta.name || (email ? email.split("@")[0].replace(/[._-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : "Usuario");
            const firstName = fullName.split(" ")[0] || fullName;
            const avatarUrl = meta.avatar_url || meta.picture || "";
            const initials = (firstName.slice(0, 1) + (fullName.split(" ")[1] ? fullName.split(" ")[1].slice(0, 1) : "")).toUpperCase() || "US";

            // Update Navbar Capsule
            if (navUserAvatar) {
                if (avatarUrl) {
                    navUserAvatar.innerHTML = `<img src="${avatarUrl}" alt="${fullName}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" onerror="this.parentElement.textContent='${initials}'">`;
                } else {
                    navUserAvatar.textContent = initials;
                }
            }
            if (navUserEmail) navUserEmail.textContent = firstName;
            if (dropdownUserName) dropdownUserName.textContent = fullName;
            if (dropdownUserEmail) dropdownUserEmail.textContent = email;
            if (mobileUserEmail) mobileUserEmail.textContent = fullName;

            // Update & Display Welcome Banner
            if (userWelcomeBanner) {
                userWelcomeBanner.style.display = "block";
                const greetingWord = getLocalGreeting();
                if (welcomeGreeting) {
                    welcomeGreeting.innerHTML = `${greetingWord}, <span class="gradient-text">${firstName}</span>`;
                }
                if (welcomeUserName) welcomeUserName.textContent = firstName;
                if (welcomeProfileName) welcomeProfileName.textContent = fullName;
                if (welcomeProfileEmail) welcomeProfileEmail.textContent = email;
                if (welcomeUserAvatar) {
                    if (avatarUrl) {
                        welcomeUserAvatar.innerHTML = `<img src="${avatarUrl}" alt="${fullName}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" onerror="this.parentElement.innerHTML='<span>${initials}</span>'">`;
                    } else {
                        welcomeUserAvatar.innerHTML = `<span>${initials}</span>`;
                    }
                }
            }

            // Close auth modal smoothly if open
            closeAuthModal();

        } else {
            if (navAuthGuest) navAuthGuest.style.display = "inline-flex";
            if (navAuthUser) navAuthUser.style.display = "none";
            if (mobileAuthGuest) mobileAuthGuest.style.display = "block";
            if (mobileAuthUser) mobileAuthUser.style.display = "none";
            if (userDropdownMenu) userDropdownMenu.classList.add("hidden");
            if (userWelcomeBanner) userWelcomeBanner.style.display = "none";
        }
    }

    // Cargar historial de análisis
    async function loadSupabaseHistory() {
        try {
            if (typeof renderHistoryList === "function") {
                renderHistoryList();
            }
        } catch (err) {
            console.warn("Historial note:", err);
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

                // Check active session on startup
                const { data: { session } } = await supabaseClient.auth.getSession();
                if (session && session.user) {
                    updateAuthUI(session.user);
                    await loadSupabaseHistory();
                } else {
                    updateAuthUI(null);
                }

                // Listen to Auth state transitions
                supabaseClient.auth.onAuthStateChange(async (event, session) => {
                    const user = session ? session.user : null;
                    if (user) {
                        updateAuthUI(user);
                    } else if (event === "SIGNED_OUT") {
                        updateAuthUI(null);
                    }

                    if (event === "SIGNED_IN") {
                        showToast(`¡Bienvenido a DocuMind AI!`, "success");
                        await loadSupabaseHistory();
                    } else if (event === "SIGNED_OUT") {
                        showToast("Sesión finalizada.", "info");
                        if (typeof renderHistoryList === "function") renderHistoryList();
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
    if (btnOpenAuthModal) btnOpenAuthModal.addEventListener("click", openAuthModal);
    if (btnMobileOpenAuth) btnMobileOpenAuth.addEventListener("click", () => {
        if (mobileMenu) mobileMenu.classList.add("hidden");
        openAuthModal();
    });
    if (btnCloseAuthModal) btnCloseAuthModal.addEventListener("click", closeAuthModal);
    if (authModalBackdrop) authModalBackdrop.addEventListener("click", closeAuthModal);

    window.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            if (authModal && !authModal.classList.contains("hidden")) closeAuthModal();
            if (accountModal && !accountModal.classList.contains("hidden")) closeAccountModal();
            if (privacyModal && !privacyModal.classList.contains("hidden")) closePrivacyModal();
        }
    });

    // Google OAuth Login
    if (btnOAuthGoogle) {
        btnOAuthGoogle.addEventListener("click", async () => {
            if (!supabaseClient || !isSupabaseConfigured) {
                setAuthAlert("Supabase no está conectado todavía. Define SUPABASE_URL y SUPABASE_ANON_KEY en tu archivo .env.");
                return;
            }

            btnOAuthGoogle.disabled = true;
            if (googleBtnText) googleBtnText.textContent = "Conectando con Google...";
            setAuthAlert("Redirigiendo a Google OAuth seguro...", "info");

            try {
                const redirectTo = window.location.origin + window.location.pathname;

                const { error } = await supabaseClient.auth.signInWithOAuth({
                    provider: "google",
                    options: {
                        redirectTo: redirectTo
                    }
                });

                if (error) throw error;

            } catch (err) {
                console.error("Google OAuth error:", err);
                setAuthAlert(err.message || "No se pudo iniciar sesión con Google.");
                btnOAuthGoogle.disabled = false;
                if (googleBtnText) googleBtnText.textContent = "Continuar con Google";
            }
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

    // Modal Triggers: Mi Cuenta & Privacidad
    if (btnUserAccount) {
        btnUserAccount.addEventListener("click", () => {
            if (userDropdownMenu) userDropdownMenu.classList.add("hidden");
            openAccountModal();
        });
    }
    if (btnBannerAccount) btnBannerAccount.addEventListener("click", openAccountModal);
    if (btnCloseAccountModal) btnCloseAccountModal.addEventListener("click", closeAccountModal);
    if (accountModalBackdrop) accountModalBackdrop.addEventListener("click", closeAccountModal);
    if (btnAccCloseAction) btnAccCloseAction.addEventListener("click", closeAccountModal);

    if (btnUserPrivacy) {
        btnUserPrivacy.addEventListener("click", () => {
            if (userDropdownMenu) userDropdownMenu.classList.add("hidden");
            openPrivacyModal();
        });
    }
    if (btnOpenPrivacyLink) btnOpenPrivacyLink.addEventListener("click", (e) => { e.preventDefault(); openPrivacyModal(); });
    if (btnOpenTermsLink) btnOpenTermsLink.addEventListener("click", (e) => { e.preventDefault(); openPrivacyModal(); });
    if (btnClosePrivacyModal) btnClosePrivacyModal.addEventListener("click", closePrivacyModal);
    if (privacyModalBackdrop) privacyModalBackdrop.addEventListener("click", closePrivacyModal);
    if (btnPrivacyOk) btnPrivacyOk.addEventListener("click", closePrivacyModal);

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
        closeAccountModal();
        showToast("Sesión cerrada correctamente.", "info");
    }
    if (btnLogout) btnLogout.addEventListener("click", handleLogout);
    if (btnBannerLogout) btnBannerLogout.addEventListener("click", handleLogout);
    if (btnAccLogout) btnAccLogout.addEventListener("click", handleLogout);
    if (btnMobileLogout) btnMobileLogout.addEventListener("click", () => {
        if (mobileMenu) mobileMenu.classList.add("hidden");
        handleLogout();
    });

    // ------------------------------------------------------------
    // 4. Mobile Menu & Navigation Controls
    // ------------------------------------------------------------
    const mobileMenuBtn = document.getElementById("mobile-menu-btn");
    const mobileMenu = document.getElementById("mobile-menu");
    const btnMobileOpenTour = document.getElementById("btn-mobile-open-tour");
    const btnMobileOpenIntegrations = document.getElementById("btn-mobile-open-integrations");

    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            const isClosed = mobileMenu.classList.contains("hidden");
            if (isClosed) {
                mobileMenu.classList.remove("hidden");
                mobileMenu.classList.add("open");
                mobileMenuBtn.setAttribute("aria-expanded", "true");
            } else {
                mobileMenu.classList.add("hidden");
                mobileMenu.classList.remove("open");
                mobileMenuBtn.setAttribute("aria-expanded", "false");
            }
        });

        // Click outside mobile menu to dismiss
        document.addEventListener("click", (e) => {
            if (!mobileMenu.contains(e.target) && !mobileMenuBtn.contains(e.target) && !mobileMenu.classList.contains("hidden")) {
                mobileMenu.classList.add("hidden");
                mobileMenu.classList.remove("open");
                mobileMenuBtn.setAttribute("aria-expanded", "false");
            }
        });

        // Close mobile drawer on navigation click
        mobileMenu.querySelectorAll("a, button").forEach(item => {
            item.addEventListener("click", () => {
                mobileMenu.classList.add("hidden");
                mobileMenu.classList.remove("open");
                mobileMenuBtn.setAttribute("aria-expanded", "false");
            });
        });
    }

    if (btnMobileOpenTour) {
        btnMobileOpenTour.addEventListener("click", () => {
            if (mobileMenu) {
                mobileMenu.classList.add("hidden");
                mobileMenu.classList.remove("open");
            }
            openTourModal();
        });
    }

    if (btnMobileOpenIntegrations) {
        btnMobileOpenIntegrations.addEventListener("click", () => {
            if (mobileMenu) {
                mobileMenu.classList.add("hidden");
                mobileMenu.classList.remove("open");
            }
            openIntegrationsModal();
        });
    }

    // ------------------------------------------------------------
    // ScrollSpy: Dynamic Active Link Highlighting on Scroll
    // ------------------------------------------------------------
    const spySections = [
        "como-funciona",
        "solucion",
        "analizador",
        "equipo",
        "contacto"
    ];
    const navSpyLinks = document.querySelectorAll(".nav-links a, #mobile-menu .mobile-nav-link");

    function updateActiveNavLink() {
        const scrollPosition = window.scrollY + 130;
        let currentSectionId = "";

        for (const sectionId of spySections) {
            const el = document.getElementById(sectionId);
            if (el) {
                const top = el.offsetTop;
                const height = el.offsetHeight;
                if (scrollPosition >= top && scrollPosition < top + height) {
                    currentSectionId = sectionId;
                    break;
                }
            }
        }

        navSpyLinks.forEach(link => {
            const href = link.getAttribute("href");
            if (href && href === "#" + currentSectionId) {
                link.classList.add("active");
            } else if (href && href.startsWith("#")) {
                link.classList.remove("active");
            }
        });
    }

    window.addEventListener("scroll", updateActiveNavLink, { passive: true });
    setTimeout(updateActiveNavLink, 200);

    // ------------------------------------------------------------
    // 5. Real Site Analytics & Real-Time Active Visitor Tracking
    // ------------------------------------------------------------
    const statTotalVisitors = document.getElementById("stat-total-visitors");
    const statActiveVisitors = document.getElementById("stat-active-visitors");
    const statTodayVisitors = document.getElementById("stat-today-visitors");
    const statWeekVisitors = document.getElementById("stat-week-visitors");

    // Persistent anonymous visitor UUID
    function getOrCreateVisitorId() {
        let vid = localStorage.getItem("documind_visitor_uuid");
        if (!vid || typeof vid !== "string" || vid.length < 10) {
            vid = "vis_" + ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, function(c) {
                return (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4)).toString(16);
            });
            localStorage.setItem("documind_visitor_uuid", vid);
        }
        return vid;
    }

    const currentVisitorId = getOrCreateVisitorId();

    function updateStatsUI(stats) {
        if (!stats || !stats.available) {
            [statTotalVisitors, statActiveVisitors, statTodayVisitors, statWeekVisitors].forEach(function(el) {
                if (el) el.textContent = "No disponible";
            });
            return;
        }

        if (statTotalVisitors) {
            statTotalVisitors.textContent = typeof stats.totalVisitors === "number" 
                ? stats.totalVisitors.toLocaleString("es-CO") 
                : "No disponible";
        }
        if (statActiveVisitors) {
            statActiveVisitors.textContent = typeof stats.activeNow === "number" 
                ? stats.activeNow.toLocaleString("es-CO") 
                : "No disponible";
        }
        if (statTodayVisitors) {
            statTodayVisitors.textContent = typeof stats.visitorsToday === "number" 
                ? stats.visitorsToday.toLocaleString("es-CO") 
                : "No disponible";
        }
        if (statWeekVisitors) {
            statWeekVisitors.textContent = typeof stats.visitorsLast7Days === "number" 
                ? stats.visitorsLast7Days.toLocaleString("es-CO") 
                : "No disponible";
        }
    }

    async function recordRealVisit() {
        try {
            const res = await fetch("/api/analytics/visit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    visitorId: currentVisitorId,
                    referrer: document.referrer || "",
                    path: window.location.pathname || "/"
                })
            });
            if (res.ok) {
                const data = await res.json();
                if (data.stats) updateStatsUI(data.stats);
            } else {
                fetchRealStats();
            }
        } catch (e) {
            fetchRealStats();
        }
    }

    async function sendRealHeartbeat() {
        try {
            const res = await fetch("/api/analytics/heartbeat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ visitorId: currentVisitorId })
            });
            if (res.ok) {
                const data = await res.json();
                if (typeof data.activeNow === "number" && statActiveVisitors) {
                    statActiveVisitors.textContent = data.activeNow.toLocaleString("es-CO");
                }
            }
        } catch (e) {
            // silent fail on network drop
        }
    }

    async function fetchRealStats() {
        try {
            const res = await fetch("/api/analytics/stats");
            if (res.ok) {
                const data = await res.json();
                if (data.stats) updateStatsUI(data.stats);
            } else {
                updateStatsUI({ available: false });
            }
        } catch (e) {
            updateStatsUI({ available: false });
        }
    }

    // Initial visit record
    recordRealVisit();

    // Periodic heartbeat every 25 seconds (active threshold = 5 min)
    setInterval(sendRealHeartbeat, 25000);

    // Periodic full stats refresh every 45 seconds
    setInterval(fetchRealStats, 45000);

    // Reactivate on tab focus
    document.addEventListener("visibilitychange", function() {
        if (document.visibilityState === "visible") {
            sendRealHeartbeat();
            fetchRealStats();
        }
    });

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

        const selectedDocLang = document.getElementById("selected-doc-lang")?.value || "es";
        categories.language = selectedDocLang;

        if (currentInputMode === "gh") {
            const repoInput = document.getElementById("repo-input");
            const branchInput = document.getElementById("repo-branch-input");
            const repoUrl = repoInput ? repoInput.value.trim() : "";
            const branch = branchInput ? branchInput.value.trim() : "";
            if (!repoUrl) {
                showToast("Por favor ingresa la URL de un repositorio de GitHub.", "error");
                return;
            }
            payload = JSON.stringify({ repoUrl, branch, categories, doc_language: selectedDocLang });
        } else if (currentInputMode === "doc") {
            if (uploadedFiles.length === 0) {
                showToast("Por favor selecciona o arrastra al menos un archivo o ZIP del proyecto.", "error");
                return;
            }
            const fd = new FormData();
            uploadedFiles.forEach(f => fd.append('files', f));
            fd.append('projectName', uploadedFiles[0].name.replace(/\.[^/.]+$/, ""));
            fd.append('categories', JSON.stringify(categories));
            fd.append('doc_language', selectedDocLang);
            payload = fd;
            isMultipart = true;
        } else if (currentInputMode === "manual") {
            const manualInput = document.getElementById("manual-text-input");
            const manualText = manualInput ? manualInput.value.trim() : "";
            if (manualText.length < 20) {
                showToast("Por favor escribe una descripción técnica de al menos 20 caracteres.", "error");
                return;
            }
            payload = JSON.stringify({ manualText, projectName: "Especificación-Manual", categories, doc_language: selectedDocLang });
        }

        // Lock button and start progress animation
        // Clear any stale previous analysis data
        currentAnalysisData = null;
        currentProjectId = null;
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
            set3DCoreState('STANDBY', 'NÚCLEO EN ESPERA (LISTO)');
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

        // Set dynamic title to ensure saved PDF has the repository name
        const cleanRepoName = (repo.name || repo.fullName || 'Proyecto').replace(/[^a-zA-Z0-9_-]/g, '_');
        document.title = `${repo.fullName || repo.name || 'Proyecto'} — Documentación Técnica | DocuMind AI`;

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

        // 5. Render Documentation Tabs (Resilient Multi-Stage Pipeline)
        try { renderProductTab(doc.product); } catch (e) { console.error('Error rendering product tab:', e); }
        try { renderArchitectureTab(doc.architecture); } catch (e) { console.error('Error rendering architecture tab:', e); }
        try { renderDiagramsTab(doc.diagrams); } catch (e) { console.error('Error rendering diagrams tab:', e); }
        try { renderDatabaseTab(doc.database, data.dataModels); } catch (e) { console.error('Error rendering database tab:', e); }
        try { renderApiTab(doc.api, data.endpoints); } catch (e) { console.error('Error rendering api tab:', e); }
        try { renderDevelopmentTab(doc.development); } catch (e) { console.error('Error rendering development tab:', e); }
        try { renderDevOpsTab(doc.devops); } catch (e) { console.error('Error rendering devops tab:', e); }
        try { renderQaTab(doc.qa); } catch (e) { console.error('Error rendering qa tab:', e); }
        try { renderSecurityTab(data.security, doc.security); } catch (e) { console.error('Error rendering security tab:', e); }
        try { renderAdrTab(doc.adrs); } catch (e) { console.error('Error rendering adr tab:', e); }
        try { renderUserGuideTab(doc.userGuide); } catch (e) { console.error('Error rendering user guide tab:', e); }

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

    function renderDiagramsTab(diagrams = {}) {
        if (typeof renderActiveMermaid === 'function') {
            renderActiveMermaid();
        }
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
        if (ovEl) ovEl.textContent = (db && db.overview) ? db.overview : 'Estrategia de persistencia estructurada basada en modelos detectados.';

        const tbody = document.getElementById("db-dictionary-tbody");
        if (!tbody) return;
        tbody.innerHTML = '';

        let dict = (db && Array.isArray(db.dataDictionary) && db.dataDictionary.length > 0) ? db.dataDictionary : [];
        if (dict.length === 0 && Array.isArray(models) && models.length > 0) {
            dict = [];
            models.forEach(m => {
                (m.fields || [{ name: 'id', type: 'UUID', isPk: true }]).forEach(f => {
                    dict.push({
                        table: m.name,
                        field: f.name,
                        type: f.type || 'VARCHAR',
                        description: f.isPk ? 'Clave primaria identificadora' : 'Atributo de entidad detectado en esquema',
                        required: f.isRequired || f.isPk || false,
                        isPk: f.isPk || false
                    });
                });
            });
        }
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
            gradeBadge.className = `badge ${grade === 'A+' || grade === 'A' ? 'badge-emerald' : grade === 'B' ? 'badge-cyan' : grade === 'C' ? 'badge-amber' : 'badge-rose'}`;
        }

        const statusBadge = document.getElementById("sec-status-badge");
        if (statusBadge) {
            statusBadge.textContent = sec.classification || status;
            statusBadge.className = `badge ${score >= 90 ? 'badge-emerald' : score >= 80 ? 'badge-cyan' : score >= 70 ? 'badge-amber' : 'badge-rose'}`;
        }

        const covBadge = document.getElementById("sec-coverage-badge");
        if (covBadge) {
            const cov = sec.coverage || { coveragePct: 100, confidenceLevel: 'Alta' };
            covBadge.innerHTML = `<i class="fa-solid fa-crosshairs"></i> Cobertura: ${cov.coveragePct}% (${escapeHtml(cov.confidenceLevel || 'Alta')})`;
            covBadge.className = `badge ${cov.coveragePct >= 80 ? 'badge-emerald' : cov.coveragePct >= 50 ? 'badge-amber' : 'badge-rose'}`;
        }

        const scoreDesc = document.getElementById("sec-score-desc");
        if (scoreDesc) {
            if (sec.classificationDescription) {
                scoreDesc.textContent = sec.classificationDescription;
            } else if (score >= 90) {
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
                        <span style="font-size:.78rem;color:#E2E8F0;">${escapeHtml(d.name || d.reason || 'Deducción de seguridad')} (${escapeHtml(d.file || 'código')})</span>
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

        // 5. 12 Architectural Dimensions
        const catGrid = document.getElementById("sec-categories-grid");
        if (catGrid) {
            const dimensionsMeta = [
                { id: 'secretsManagement', label: 'Gestión de Secretos & Claves', weight: '15%', icon: 'fa-key' },
                { id: 'authentication', label: 'Autenticación & Autorización', weight: '15%', icon: 'fa-user-shield' },
                { id: 'inputValidation', label: 'Validación & Sanitización', weight: '10%', icon: 'fa-filter' },
                { id: 'injectionProtection', label: 'Protección Inyecciones', weight: '10%', icon: 'fa-shield-virus' },
                { id: 'apiSecurity', label: 'Seguridad de APIs & CORS', weight: '10%', icon: 'fa-network-wired' },
                { id: 'serverConfig', label: 'Configuración Servidor', weight: '5%', icon: 'fa-server' },
                { id: 'dependencies', label: 'Seguridad Dependencias', weight: '10%', icon: 'fa-boxes-stacked' },
                { id: 'dataProtection', label: 'Protección Datos & Cripto', weight: '5%', icon: 'fa-database' },
                { id: 'sessionManagement', label: 'Gestión de Sesiones', weight: '5%', icon: 'fa-clock-rotate-left' },
                { id: 'errorHandling', label: 'Manejo Errores & Anti-Fugas', weight: '5%', icon: 'fa-bug-slash' },
                { id: 'infrastructure', label: 'Infraestructura & Nube', weight: '5%', icon: 'fa-cloud' },
                { id: 'accessControl', label: 'Control Acceso (IDOR/BOLA)', weight: '5%', icon: 'fa-lock' }
            ];

            const dimsData = sec.dimensions || sec.categories || {};
            catGrid.innerHTML = dimensionsMeta.map(meta => {
                const dim = dimsData[meta.id] || { score: 100, status: 'Excelente', findingsCount: 0 };
                const dScore = typeof dim.score === 'number' ? dim.score : 100;
                const barColor = dScore >= 80 ? '#34D399' : dScore >= 60 ? '#38BDF8' : dScore >= 40 ? '#FBBF24' : '#FB7185';
                const statusColor = dScore >= 80 ? '#34D399' : dScore >= 60 ? '#38BDF8' : dScore >= 40 ? '#FBBF24' : '#FB7185';
                return `
                    <div class="sec-cat-card">
                        <div class="sec-cat-head">
                            <span style="display:flex;align-items:center;gap:.4rem;">
                                <i class="fa-solid ${meta.icon}" style="color:var(--tech-cyan);font-size:.75rem;"></i>
                                ${meta.label}
                            </span>
                            <div style="display:flex;align-items:center;gap:.35rem;">
                                <span class="badge badge-slate" style="font-size:.58rem;padding:.15rem .35rem;">${meta.weight}</span>
                                <span style="font-family:'JetBrains Mono',monospace;font-weight:800;color:${statusColor};">${dScore}%</span>
                            </div>
                        </div>
                        <div class="sec-cat-bar-bg">
                            <div class="sec-cat-bar-fill" style="width:${dScore}%;background:${barColor};"></div>
                        </div>
                        <div style="display:flex;justify-content:space-between;margin-top:.35rem;font-size:.68rem;color:#64748B;">
                            <span>Estado: <strong style="color:${statusColor};">${dim.status || 'OK'}</strong></span>
                            <span>${dim.findingsCount !== undefined ? `${dim.findingsCount} hallazgo(s)` : ''}</span>
                        </div>
                    </div>
                `;
            }).join('');
        }

        // 5.1 Remediation Plan Rendering
        const remContainer = document.getElementById("sec-remediation-container");
        const remPlan = sec.remediationPlan || { queues: {}, summary: {} };
        const countInm = document.getElementById("count-rem-inm");
        const countAlta = document.getElementById("count-rem-alta");
        const countRemMed = document.getElementById("count-rem-med");
        const countBaja = document.getElementById("count-rem-baja");

        if (countInm) countInm.textContent = remPlan.summary?.inmediata || 0;
        if (countAlta) countAlta.textContent = remPlan.summary?.alta || 0;
        if (countRemMed) countRemMed.textContent = remPlan.summary?.media || 0;
        if (countBaja) countBaja.textContent = remPlan.summary?.baja || 0;

        function renderRemQueue(queueKey = 'inmediata') {
            if (!remContainer) return;
            const items = remPlan.queues?.[queueKey] || [];
            if (items.length === 0) {
                remContainer.innerHTML = `
                    <div style="background:rgba(52,211,153,.08);border:1px solid rgba(52,211,153,.25);border-radius:.65rem;padding:1.25rem;text-align:center;">
                        <i class="fa-solid fa-circle-check" style="font-size:1.6rem;color:#34D399;margin-bottom:.4rem;display:inline-block;"></i>
                        <h5 style="font-size:.88rem;color:#E2E8F0;font-weight:700;">Cola de remediación limpia</h5>
                        <p style="font-size:.76rem;color:#94A3B8;margin:0;">No hay tareas pendientes en la ventana ${escapeHtml(queueKey)}.</p>
                    </div>
                `;
                return;
            }
            remContainer.innerHTML = items.map(item => `
                <div class="sec-vuln-card ${item.severity === 'CRITICAL' ? 'vuln-crit' : item.severity === 'HIGH' ? 'vuln-high' : 'vuln-med'}" style="padding:1rem;">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:.5rem;margin-bottom:.6rem;">
                        <div>
                            <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.25rem;flex-wrap:wrap;">
                                <span style="font-family:'JetBrains Mono',monospace;font-size:.72rem;color:var(--tech-cyan);font-weight:700;">${escapeHtml(item.id)}</span>
                                <span class="badge ${item.severity === 'CRITICAL' ? 'badge-rose' : item.severity === 'HIGH' ? 'badge-cyan' : 'badge-amber'}" style="font-size:.65rem;">${escapeHtml(item.priority)}</span>
                                <span class="badge badge-slate" style="font-size:.65rem;">Esfuerzo: ${escapeHtml(item.estimatedEffort)}</span>
                            </div>
                            <strong style="font-size:.92rem;color:#fff;">${escapeHtml(item.title)}</strong>
                        </div>
                        <span style="font-size:.75rem;color:#94A3B8;">Ventana: <strong style="color:#E2E8F0;">${escapeHtml(item.timeframe || '')}</strong></span>
                    </div>
                    <p style="font-size:.78rem;color:#94A3B8;margin:0 0 .65rem;">${escapeHtml(item.impact || '')}</p>
                    ${item.codeExample ? `
                        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:.65rem;margin-bottom:.65rem;">
                            <div style="background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.25);border-radius:.45rem;padding:.65rem;">
                                <div style="font-size:.68rem;color:#FB7185;font-weight:700;margin-bottom:.35rem;"><i class="fa-solid fa-xmark"></i> Patrón Vulnerable:</div>
                                <pre style="margin:0;font-family:'JetBrains Mono',monospace;font-size:.7rem;color:#FCA5A5;white-space:pre-wrap;">${escapeHtml(item.codeExample.vulnerable)}</pre>
                            </div>
                            <div style="background:rgba(52,211,153,.08);border:1px solid rgba(52,211,153,.25);border-radius:.45rem;padding:.65rem;">
                                <div style="font-size:.68rem;color:#34D399;font-weight:700;margin-bottom:.35rem;"><i class="fa-solid fa-check"></i> Corrección Remediada:</div>
                                <pre style="margin:0;font-family:'JetBrains Mono',monospace;font-size:.7rem;color:#86EFAC;white-space:pre-wrap;">${escapeHtml(item.codeExample.remediated)}</pre>
                            </div>
                        </div>
                        <div style="font-size:.74rem;color:#CBD5E1;background:rgba(15,23,42,.6);border-left:3px solid var(--tech-cyan);padding:.4rem .65rem;border-radius:.35rem;">
                            <strong>Verificación:</strong> ${escapeHtml(item.codeExample.verification || item.codeExample.explanation)}
                        </div>
                    ` : ''}
                </div>
            `).join('');
        }

        renderRemQueue('inmediata');

        // Hook up remediation queue tab buttons
        const remBtns = document.querySelectorAll("#sec-rem-tabs .sec-filter-btn");
        remBtns.forEach(btn => {
            btn.onclick = () => {
                remBtns.forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                const filter = btn.getAttribute("data-rem-filter") || 'inmediata';
                renderRemQueue(filter);
            };
        });

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

        const list = (Array.isArray(adrs) && adrs.length > 0) ? adrs : [
            {
                id: 'ADR-001',
                title: 'Arquitectura Modular y Separación de Responsabilidades',
                context: 'Se requiere modularidad para mantener controladores, servicios y lógica de acceso a datos desacoplados.',
                decision: 'Estructuración por módulos funcionales y contratos de interfaz limpios.',
                consequences: 'Facilita la mantenibilidad y evolución sin acoplamientos rígidos.',
                status: 'Aceptada'
            }
        ];

        list.forEach(adr => {
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

    // ============================================================
    // 17. MICROSOFT WORD (.DOCX) VIEWER, EDITOR & EXPORT CENTER
    // ============================================================
    const previewModal = document.getElementById("doc-preview-modal");
    const previewPaper = document.getElementById("preview-paper-sheet");
    const previewScopeSelect = document.getElementById("preview-doc-scope");
    const btnPreviewDownloadDocx = document.getElementById("btn-preview-download-docx");
    const btnPreviewPrint = document.getElementById("btn-preview-print");
    const btnPreviewDownloadMd = document.getElementById("btn-preview-download-md");
    const btnPreviewEditMode = document.getElementById("btn-preview-edit-mode");
    const btnPreviewSaveEdits = document.getElementById("btn-preview-save-edits");
    const btnPreviewResetEdits = document.getElementById("btn-preview-reset-edits");
    const docEditAlert = document.getElementById("doc-edit-alert");
    const btnCloseDocPreview = document.getElementById("btn-close-doc-preview");
    const previewZoomBtns = document.querySelectorAll(".preview-zoom-btn");
    const previewPageCount = document.getElementById("preview-page-count");

    let currentPreviewScope = "all";
    let isEditModeActive = false;

    function updateWordTocSidebar(scope = "all") {
        const tocListEl = document.getElementById("word-toc-nav-list");
        const tocCountEl = document.getElementById("word-toc-count");
        if (!tocListEl || typeof DocuMindExporter === "undefined") return;

        const sections = (typeof DocuMindExporter.getSectionsList === 'function')
            ? DocuMindExporter.getSectionsList(currentAnalysisData, scope)
            : [];

        if (tocCountEl) tocCountEl.textContent = `${sections.length} cap.`;

        tocListEl.innerHTML = "";
        sections.forEach(s => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "btn-ghost";
            btn.style.cssText = "text-align:left;padding:.42rem .65rem;border-radius:.35rem;font-size:.73rem;color:#94A3B8;display:flex;align-items:center;gap:.45rem;width:100%;transition:all .15s ease;border:1px solid transparent;background:transparent;";
            btn.innerHTML = `<span style="width:18px;height:18px;border-radius:50%;background:#0284C7;color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:.65rem;font-weight:800;flex-shrink:0;">${s.num}</span><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;">${s.title}</span>`;
            
            btn.addEventListener("click", () => {
                tocListEl.querySelectorAll("button").forEach(b => {
                    b.style.color = "#94A3B8";
                    b.style.background = "transparent";
                    b.style.borderColor = "transparent";
                });
                btn.style.color = "#38BDF8";
                btn.style.background = "rgba(56,189,248,.12)";
                btn.style.borderColor = "rgba(56,189,248,.25)";

                const targetEl = document.getElementById(`section-${s.id}`);
                if (targetEl) {
                    targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
                }
            });

            tocListEl.appendChild(btn);
        });
    }

    function renderDocumentPreview(scope = "all") {
        if (!currentAnalysisData || typeof DocuMindExporter === "undefined") return;
        currentPreviewScope = scope;

        if (previewPaper) {
            // Check if there are user session edits saved
            if (currentAnalysisData.customDoc && currentAnalysisData.customDoc.html && scope === "all") {
                previewPaper.innerHTML = currentAnalysisData.customDoc.html;
            } else {
                const fullHtml = DocuMindExporter.buildDocumentHtml(currentAnalysisData, scope);
                const bodyMatch = fullHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i);
                previewPaper.innerHTML = bodyMatch ? bodyMatch[1] : fullHtml;
            }

            if (isEditModeActive) {
                previewPaper.setAttribute("contenteditable", "true");
            } else {
                previewPaper.removeAttribute("contenteditable");
            }
        }

        if (previewPageCount) {
            const metrics = DocuMindExporter.analyzeLayoutQuality(currentAnalysisData, scope);
            previewPageCount.textContent = `~${metrics.pageEstimate} págs`;
        }

        updateWordTocSidebar(scope);
    }

    function openDocPreviewModal(defaultScope = "all") {
        if (!currentAnalysisData || !currentAnalysisData.documentation) {
            showToast("Primero debes generar la documentación de un repositorio para previsualizar o exportar.", "error");
            return;
        }
        const repoInput = document.getElementById("repo-input");
        if (currentInputMode === "gh" && repoInput && repoInput.value.trim()) {
            const analyzedName = (currentAnalysisData.repository?.name || "").toLowerCase();
            const analyzedFull = (currentAnalysisData.repository?.fullName || "").toLowerCase();
            const inputVal = repoInput.value.trim().toLowerCase();
            if (analyzedName && !inputVal.includes(analyzedName) && !inputVal.includes(analyzedFull)) {
                showToast(`El repositorio en el campo (${repoInput.value}) no coincide con el análisis generado (${currentAnalysisData.repository?.fullName || analyzedName}). Haz clic en "Generar Documentación" para analizar el nuevo repositorio.`, "warning");
                return;
            }
        }

        if (previewScopeSelect) {
            previewScopeSelect.value = defaultScope;
        }

        renderDocumentPreview(defaultScope);

        if (btnPreviewResetEdits) {
            btnPreviewResetEdits.style.display = (currentAnalysisData.customDoc) ? "inline-flex" : "none";
        }

        if (previewModal) {
            previewModal.style.display = "flex";
            previewModal.classList.add("active");
        }
    }

    function closeDocPreviewModal() {
        if (previewModal) {
            previewModal.style.display = "none";
            previewModal.classList.remove("active");
        }
    }

    if (previewScopeSelect) {
        previewScopeSelect.addEventListener("change", (e) => {
            renderDocumentPreview(e.target.value);
        });
    }

    // 1. Export Microsoft Word (.docx)
    if (btnPreviewDownloadDocx) {
        btnPreviewDownloadDocx.addEventListener("click", async () => {
            if (!currentAnalysisData || typeof DocuMindExporter === "undefined") return;
            try {
                showToast("Compilando documento formal Microsoft Word (.docx)...", "info");
                btnPreviewDownloadDocx.disabled = true;
                await DocuMindExporter.downloadWordDocx(currentAnalysisData, currentPreviewScope);
                showToast("¡Documento Word (.docx) descargado con éxito!", "success");
            } catch (err) {
                console.error("Error exporting Word docx:", err);
                showToast("Error al compilar documento Word: " + err.message, "error");
            } finally {
                btnPreviewDownloadDocx.disabled = false;
            }
        });
    }

    // 2. Export Print / PDF
    if (btnPreviewPrint) {
        btnPreviewPrint.addEventListener("click", () => {
            if (!currentAnalysisData || typeof DocuMindExporter === "undefined") return;
            (async () => {
                try {
                    showToast("Generando archivo PDF real directamente (sin ventana de impresión)...", "info");
                    btnPreviewPrint.disabled = true;
                    await DocuMindExporter.downloadDirectPdf(currentAnalysisData, currentPreviewScope);
                    showToast("¡Documento PDF (.pdf) descargado directamente con éxito!", "success");
                } catch (err) {
                    console.error("Error exporting direct PDF:", err);
                    showToast("Error al generar PDF: " + err.message, "error");
                } finally {
                    btnPreviewPrint.disabled = false;
                }
            })();
            // Direct PDF handled above
        });
    }

    // 3. Export Clean Markdown
    if (btnPreviewDownloadMd) {
        btnPreviewDownloadMd.addEventListener("click", () => {
            if (!currentAnalysisData || typeof DocuMindExporter === "undefined") return;
            DocuMindExporter.downloadMarkdownFile(currentAnalysisData, currentPreviewScope);
            showToast("Descargando archivo Markdown...", "success");
        });
    }

    // 4. In-App Interactive Editor Toggle
    if (btnPreviewEditMode) {
        btnPreviewEditMode.addEventListener("click", () => {
            isEditModeActive = !isEditModeActive;
            if (isEditModeActive) {
                if (previewPaper) {
                    previewPaper.setAttribute("contenteditable", "true");
                    previewPaper.style.outline = "2px dashed #F59E0B";
                }
                btnPreviewEditMode.innerHTML = '<i class="fa-solid fa-eye" style="margin-right:.35rem;"></i>Modo Lectura';
                btnPreviewEditMode.style.borderColor = "#38BDF8";
                btnPreviewEditMode.style.color = "#38BDF8";
                if (btnPreviewSaveEdits) btnPreviewSaveEdits.style.display = "inline-flex";
                if (btnPreviewResetEdits) btnPreviewResetEdits.style.display = "inline-flex";
                if (docEditAlert) docEditAlert.style.display = "flex";
                showToast("Modo Edición activo: Haz clic sobre cualquier título, texto o celda para editarlo.", "info");
            } else {
                if (previewPaper) {
                    previewPaper.removeAttribute("contenteditable");
                    previewPaper.style.outline = "none";
                }
                btnPreviewEditMode.innerHTML = '<i class="fa-solid fa-pen-to-square" style="margin-right:.35rem;"></i>Modo Edición';
                btnPreviewEditMode.style.borderColor = "rgba(245,158,11,.45)";
                btnPreviewEditMode.style.color = "#FBBF24";
                if (btnPreviewSaveEdits) btnPreviewSaveEdits.style.display = "none";
                if (docEditAlert) docEditAlert.style.display = "none";
            }
        });
    }

    // 5. Save Edits Locally
    if (btnPreviewSaveEdits) {
        btnPreviewSaveEdits.addEventListener("click", () => {
            if (!currentAnalysisData || !previewPaper) return;
            
            currentAnalysisData.customDoc = currentAnalysisData.customDoc || {};
            currentAnalysisData.customDoc.html = previewPaper.innerHTML;
            currentAnalysisData.customDoc.timestamp = new Date().toISOString();

            // Extract structured sections
            const sectionEls = previewPaper.querySelectorAll(".doc-section");
            const customSections = [];
            sectionEls.forEach(el => {
                const titleEl = el.querySelector(".doc-section-title");
                const rawTitle = titleEl ? titleEl.textContent.trim().replace(/^\d+\s*/, '') : 'Sección';
                const contentEl = el.cloneNode(true);
                const headerInClone = contentEl.querySelector(".doc-section-header");
                if (headerInClone) headerInClone.remove();
                customSections.push({
                    title: rawTitle,
                    content: contentEl.innerText.trim()
                });
            });
            if (customSections.length > 0) {
                currentAnalysisData.customDoc.sections = customSections;
            }

            showToast("¡Modificaciones guardadas en la sesión! Se incluirán en tus descargas Word y PDF.", "success");
            if (btnPreviewResetEdits) btnPreviewResetEdits.style.display = "inline-flex";
        });
    }

    // 6. Reset Edits to Original
    if (btnPreviewResetEdits) {
        btnPreviewResetEdits.addEventListener("click", () => {
            if (!currentAnalysisData) return;
            if (confirm("¿Deseas restaurar la documentación original generada y descartar tus ediciones?")) {
                delete currentAnalysisData.customDoc;
                renderDocumentPreview(currentPreviewScope);
                btnPreviewResetEdits.style.display = "none";
                showToast("Documento restaurado a su versión original.", "info");
            }
        });
    }

    if (btnCloseDocPreview) {
        btnCloseDocPreview.addEventListener("click", closeDocPreviewModal);
    }

    if (previewModal) {
        previewModal.addEventListener("click", (e) => {
            if (e.target === previewModal) {
                closeDocPreviewModal();
            }
        });
    }

    // 7. Zoom Controls
    previewZoomBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            previewZoomBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            const zoomVal = btn.dataset.zoom;
            if (zoomVal === "fit") {
                const container = document.getElementById("word-desktop-viewport");
                const contW = container ? container.clientWidth - 48 : 880;
                const scale = Math.max(0.6, Math.min(1.25, contW / 880));
                if (previewPaper) previewPaper.style.transform = `scale(${scale})`;
            } else {
                const zoom = parseFloat(zoomVal) || 1.0;
                if (previewPaper) previewPaper.style.transform = `scale(${zoom})`;
            }
        });
    });

    const btnExportWord = document.getElementById("btn-export-word");
    if (btnExportWord) {
        btnExportWord.addEventListener("click", () => {
            openDocPreviewModal("all");
        });
    }

    const btnExportPdf = document.getElementById("btn-export-pdf");
    if (btnExportPdf) {
        btnExportPdf.addEventListener("click", () => {
            openDocPreviewModal("all");
        });
    }

    // Security Center Exports
    const btnExportSecJson = document.getElementById("btn-export-sec-json");

    // 8. Primary "Exportar documento" Dropdown & Multi-Format Direct Export Engine
    const btnExportDropdownTrigger = document.getElementById("btn-export-dropdown-trigger");
    const exportDropdownMenu = document.getElementById("export-dropdown-menu");
    const exportProgressBadge = document.getElementById("export-progress-badge");
    const exportProgressText = document.getElementById("export-progress-text");

    if (btnExportDropdownTrigger && exportDropdownMenu) {
        btnExportDropdownTrigger.addEventListener("click", (e) => {
            e.stopPropagation();
            const isOpen = exportDropdownMenu.style.display === "block";
            exportDropdownMenu.style.display = isOpen ? "none" : "block";
            btnExportDropdownTrigger.setAttribute("aria-expanded", String(!isOpen));
        });

        document.addEventListener("click", (e) => {
            if (!exportDropdownMenu.contains(e.target) && e.target !== btnExportDropdownTrigger) {
                exportDropdownMenu.style.display = "none";
                btnExportDropdownTrigger.setAttribute("aria-expanded", "false");
            }
        });
    }

    const formatLabels = {
        docx: "Microsoft Word (.docx)",
        pdf: "Documento PDF (.pdf)",
        md: "Markdown Técnico (.md)",
        html: "Documento HTML A4 (.html)",
        json: "Modelo Estructurado (.json)",
        txt: "Texto Plano (.txt)"
    };

    document.querySelectorAll("[data-export-format]").forEach((btn) => {
        btn.addEventListener("click", async (e) => {
            e.stopPropagation();
            if (exportDropdownMenu) {
                exportDropdownMenu.style.display = "none";
            }
            if (!currentAnalysisData || typeof DocuMindExporter === "undefined") {
                showToast("Primero genera el análisis del proyecto antes de exportar.", "warning");
                return;
            }
            const fmt = (btn.getAttribute("data-export-format") || "docx").toLowerCase();
            const label = formatLabels[fmt] || fmt.toUpperCase();
            const activeScope = (previewModal && previewModal.classList.contains("active")) ? currentPreviewScope : "all";

            try {
                btn.disabled = true;
                if (exportProgressBadge && exportProgressText) {
                    exportProgressText.textContent = `Generando ${label}...`;
                    exportProgressBadge.style.display = "inline-flex";
                }
                showToast(`Generando y descargando ${label}...`, "info");
                await DocuMindExporter.exportByFormat(currentAnalysisData, fmt, activeScope);
                showToast(`¡Descarga de ${label} completada con éxito!`, "success");
            } catch (err) {
                console.error(`Error exporting format ${fmt}:`, err);
                showToast(`Error al exportar ${label}: ${err.message}`, "error");
            } finally {
                btn.disabled = false;
                if (exportProgressBadge) {
                    setTimeout(() => { exportProgressBadge.style.display = "none"; }, 1200);
                }
            }
        });
    });

    // 9. A4 Preview Page Navigation, Mobile TOC Drawer & Fullscreen Controls
    let currentPreviewPageIdx = 0;
    const btnPreviewPrevPage = document.getElementById("btn-preview-prev-page");
    const btnPreviewNextPage = document.getElementById("btn-preview-next-page");
    const previewPageIndicator = document.getElementById("preview-page-indicator");
    const btnPreviewFullscreen = document.getElementById("btn-preview-fullscreen");
    const btnTogglePreviewToc = document.getElementById("btn-toggle-preview-toc");

    function navigatePreviewPage(delta) {
        if (!previewPaper) return;
        const pages = previewPaper.querySelectorAll(".a4-page-sheet, .doc-section");
        if (!pages.length) return;
        currentPreviewPageIdx = Math.max(0, Math.min(pages.length - 1, currentPreviewPageIdx + delta));
        const targetEl = pages[currentPreviewPageIdx];
        if (targetEl) {
            targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        if (previewPageIndicator) {
            previewPageIndicator.textContent = `Pág ${currentPreviewPageIdx + 1}/${pages.length}`;
        }
    }

    if (btnPreviewPrevPage) {
        btnPreviewPrevPage.addEventListener("click", () => navigatePreviewPage(-1));
    }
    if (btnPreviewNextPage) {
        btnPreviewNextPage.addEventListener("click", () => navigatePreviewPage(1));
    }
    if (btnPreviewFullscreen && previewModal) {
        btnPreviewFullscreen.addEventListener("click", () => {
            const isFull = previewModal.classList.toggle("is-fullscreen");
            btnPreviewFullscreen.innerHTML = isFull
                ? '<i class="fa-solid fa-compress" style="margin-right:.25rem;"></i>Salir Pantalla Completa'
                : '<i class="fa-solid fa-expand" style="margin-right:.25rem;"></i>Pantalla completa';
        });
    }
    if (btnTogglePreviewToc && wordTocSidebar) {
        btnTogglePreviewToc.addEventListener("click", () => {
            wordTocSidebar.classList.toggle("toc-mobile-open");
        });
    }
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
            if (!currentAnalysisData) {
                showToast("No hay datos de seguridad disponibles para imprimir.", "error");
                return;
            }
            openDocPreviewModal("sec");
        });
    }

    const btnNewAnalysis = document.getElementById("btn-new-analysis");
    if (btnNewAnalysis) {
        btnNewAnalysis.addEventListener("click", () => {
            currentAnalysisData = null;
            currentProjectId = null;
            document.title = "DocuMind AI | Documenta tus repositorios con Inteligencia Artificial";
            if (projectResults) projectResults.style.display = 'none';
            const inputContainer = document.getElementById("project-input-container");
            if (inputContainer) {
                inputContainer.style.display = 'block';
                inputContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            const repoInput = document.getElementById("repo-input");
            if (repoInput) {
                repoInput.value = "";
                repoInput.focus();
            }
            showToast("Listo para un nuevo análisis. Ingresa la URL de tu repositorio.", "info");
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
    // 21. Integrations Status Modal Logic
    // ------------------------------------------------------------
    const integrationsModal = document.getElementById("integrations-modal");
    const btnOpenIntegrations = document.getElementById("btn-open-integrations");
    const btnCloseIntegrations = document.getElementById("btn-close-integrations");
    const integrationsBackdrop = document.getElementById("integrations-modal-backdrop");
    const btnRefreshIntegrations = document.getElementById("btn-refresh-integrations");
    const integrationsCardsContainer = document.getElementById("integrations-cards-container");
    const integrationsLastCheck = document.getElementById("integrations-last-check");

    function openIntegrationsModal() {
        if (!integrationsModal) return;
        integrationsModal.classList.remove("hidden");
        document.body.style.overflow = "hidden";
        loadIntegrationsStatus();
    }

    function closeIntegrationsModal() {
        if (!integrationsModal) return;
        integrationsModal.classList.add("hidden");
        document.body.style.overflow = "";
    }

    if (btnOpenIntegrations) btnOpenIntegrations.addEventListener("click", openIntegrationsModal);
    if (btnCloseIntegrations) btnCloseIntegrations.addEventListener("click", closeIntegrationsModal);
    if (integrationsBackdrop) integrationsBackdrop.addEventListener("click", closeIntegrationsModal);
    if (btnRefreshIntegrations) btnRefreshIntegrations.addEventListener("click", loadIntegrationsStatus);

    async function loadIntegrationsStatus() {
        if (!integrationsCardsContainer) return;
        integrationsCardsContainer.innerHTML = '<div style="text-align:center;padding:1.5rem;color:#94A3B8;font-size:.82rem;"><i class="fa-solid fa-circle-notch fa-spin" style="margin-right:.4rem;color:var(--tech-cyan);"></i> Consultando estado de servicios en vivo...</div>';

        try {
            const res = await fetch('/api/integrations/status');
            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.error || 'No se pudo obtener el estado.');
            }

            if (integrationsLastCheck) {
                integrationsLastCheck.textContent = 'Verificado: ' + new Date(data.timestamp).toLocaleTimeString();
            }

            const sb = data.supabase || {};
            const gm = data.gemini || {};
            const rd = data.renderBackend || {};
            const gh = data.githubPublic || {};

            integrationsCardsContainer.innerHTML = `
                <!-- 1. Google OAuth & Supabase -->
                <div style="background:rgba(9,13,22,.85);border:1px solid rgba(56,189,248,.2);border-radius:.75rem;padding:1rem;display:flex;align-items:center;justify-content:space-between;">
                    <div style="display:flex;align-items:center;gap:.75rem;">
                        <i class="fa-solid fa-database" style="color:var(--tech-cyan);font-size:1.15rem;"></i>
                        <div>
                            <strong style="font-size:.84rem;color:#FFFFFF;display:block;">Google OAuth &amp; Supabase DB</strong>
                            <span style="font-size:.72rem;color:#94A3B8;">Host: ${sb.projectHost} (Row Level Security Activo)</span>
                        </div>
                    </div>
                    <span style="font-size:.7rem;font-weight:700;color:${sb.status === 'operational' ? '#34D399' : '#FB7185'};background:rgba(52,211,153,.1);padding:.25rem .65rem;border-radius:.4rem;border:1px solid rgba(52,211,153,.3);">
                        ${sb.status === 'operational' ? '● En Línea' : '● Sin Configurar'}
                    </span>
                </div>

                <!-- 2. Gemini Cognitive Engine -->
                <div style="background:rgba(9,13,22,.85);border:1px solid rgba(129,140,248,.2);border-radius:.75rem;padding:1rem;display:flex;align-items:center;justify-content:space-between;">
                    <div style="display:flex;align-items:center;gap:.75rem;">
                        <i class="fa-solid fa-brain" style="color:#818CF8;font-size:1.15rem;"></i>
                        <div>
                            <strong style="font-size:.84rem;color:#FFFFFF;display:block;">Motor Cognitivo Gemini AI</strong>
                            <span style="font-size:.72rem;color:#94A3B8;">Modelo: ${gm.model} ${gm.latencyMs ? '(' + gm.latencyMs + ' ms)' : ''}</span>
                        </div>
                    </div>
                    <span style="font-size:.7rem;font-weight:700;color:${gm.status === 'operational' ? '#34D399' : (gm.status === 'fallback_active' ? '#FBBF24' : '#FB7185')};background:rgba(52,211,153,.1);padding:.25rem .65rem;border-radius:.4rem;border:1px solid rgba(52,211,153,.3);">
                        ${gm.status === 'operational' ? '● Activo' : (gm.status === 'fallback_active' ? '● Contingencia (AST)' : '● Desconectado')}
                    </span>
                </div>

                <!-- 3. Render Production Backend -->
                <div style="background:rgba(9,13,22,.85);border:1px solid rgba(52,211,153,.2);border-radius:.75rem;padding:1rem;display:flex;align-items:center;justify-content:space-between;">
                    <div style="display:flex;align-items:center;gap:.75rem;">
                        <i class="fa-solid fa-cloud" style="color:#34D399;font-size:1.15rem;"></i>
                        <div>
                            <strong style="font-size:.84rem;color:#FFFFFF;display:block;">Render Web Service (Producción)</strong>
                            <span style="font-size:.72rem;color:#94A3B8;">Node.js ${rd.nodeVersion} — Heap: ${rd.memoryUsageMb} MB — Uptime: ${Math.floor(data.uptimeSeconds / 60)} min</span>
                        </div>
                    </div>
                    <span style="font-size:.7rem;font-weight:700;color:#34D399;background:rgba(52,211,153,.1);padding:.25rem .65rem;border-radius:.4rem;border:1px solid rgba(52,211,153,.3);">
                        ● 100% Saludable
                    </span>
                </div>

                <!-- 4. GitHub REST API v3 Pública -->
                <div style="background:rgba(9,13,22,.85);border:1px solid rgba(148,163,184,.2);border-radius:.75rem;padding:1rem;display:flex;align-items:center;justify-content:space-between;">
                    <div style="display:flex;align-items:center;gap:.75rem;">
                        <i class="fa-brands fa-github" style="color:#CBD5E1;font-size:1.15rem;"></i>
                        <div>
                            <strong style="font-size:.84rem;color:#FFFFFF;display:block;">GitHub REST API v3 (Pública)</strong>
                            <span style="font-size:.72rem;color:#94A3B8;">Sin credenciales del cliente — Cuota restante: ${gh.rateLimitRemaining} / ${gh.rateLimitLimit}</span>
                        </div>
                    </div>
                    <span style="font-size:.7rem;font-weight:700;color:${gh.status === 'operational' ? '#34D399' : '#FBBF24'};background:rgba(52,211,153,.1);padding:.25rem .65rem;border-radius:.4rem;border:1px solid rgba(52,211,153,.3);">
                        ${gh.status === 'operational' ? '● Operacional' : '● Limitada'}
                    </span>
                </div>
            `;
        } catch (err) {
            integrationsCardsContainer.innerHTML = `<div style="padding:1rem;background:rgba(244,63,94,.12);border:1px solid rgba(244,63,94,.3);color:#FB7185;border-radius:.65rem;font-size:.78rem;">Error cargando estado de integraciones: ${err.message}</div>`;
        }
    }

    // ------------------------------------------------------------
    // 22. AI Code Modification & Patch Engine Logic
    // ------------------------------------------------------------
    const modifyModal = document.getElementById("modify-modal");
    const btnOpenModifyModal = document.getElementById("btn-open-modify-modal");
    const btnCloseModify = document.getElementById("btn-close-modify");
    const modifyModalBackdrop = document.getElementById("modify-modal-backdrop");
    const btnGenerateModification = document.getElementById("btn-generate-modification");
    const modifyPromptInput = document.getElementById("modify-prompt-input");
    const modifyResultsContainer = document.getElementById("modify-results-container");
    const modifyPlanBox = document.getElementById("modify-plan-box");
    const modifyDiffPreview = document.getElementById("modify-diff-preview");
    const btnDownloadPatchFile = document.getElementById("btn-download-patch-file");
    const btnDownloadPatchZip = document.getElementById("btn-download-patch-zip");

    function openModifyModal() {
        if (!modifyModal) return;
        modifyModal.classList.remove("hidden");
        document.body.style.overflow = "hidden";
        if (modifyPromptInput) modifyPromptInput.focus();
    }

    function closeModifyModal() {
        if (!modifyModal) return;
        modifyModal.classList.add("hidden");
        document.body.style.overflow = "";
    }

    if (btnOpenModifyModal) btnOpenModifyModal.addEventListener("click", openModifyModal);
    if (btnCloseModify) btnCloseModify.addEventListener("click", closeModifyModal);
    if (modifyModalBackdrop) modifyModalBackdrop.addEventListener("click", closeModifyModal);

    if (btnGenerateModification) {
        btnGenerateModification.addEventListener("click", async () => {
            const instruction = modifyPromptInput ? modifyPromptInput.value.trim() : "";
            if (!instruction) {
                showToast("Por favor describe la modificación que deseas solicitar.", "error");
                return;
            }

            btnGenerateModification.disabled = true;
            btnGenerateModification.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Generando Cambios &amp; Parche...';

            try {
                const res = await fetch('/api/project/modify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        instruction,
                        projectId: currentProjectData?.projectId,
                        projectContext: currentProjectData
                    })
                });

                const data = await res.json();
                if (!res.ok || !data.success) {
                    throw new Error(data.error || 'Error al generar la modificación.');
                }

                if (modifyResultsContainer) modifyResultsContainer.style.display = 'block';
                if (modifyPlanBox) {
                    modifyPlanBox.innerHTML = `
                        <h4 style="font-size:.88rem;color:var(--tech-cyan);margin-bottom:.4rem;font-weight:700;"><i class="fa-solid fa-list-check" style="margin-right:.4rem;"></i>Plan de Modificación:</h4>
                        <p style="margin-bottom:.65rem;color:#CBD5E1;">${data.plan}</p>
                        <p style="font-size:.75rem;color:#94A3B8;"><strong style="color:#fff;">Explicación Técnica:</strong> ${data.explanation}</p>
                        <div style="margin-top:.6rem;display:flex;gap:.5rem;flex-wrap:wrap;">
                            ${data.modifiedFiles.map(f => `<span style="font-size:.7rem;font-family:'JetBrains Mono',monospace;background:rgba(52,211,153,.15);color:#34D399;padding:.2rem .55rem;border-radius:.35rem;border:1px solid rgba(52,211,153,.3);">✔ ${f.path}</span>`).join('')}
                        </div>
                    `;
                }

                if (modifyDiffPreview) {
                    modifyDiffPreview.textContent = data.unifiedPatch || '# No diff available';
                }

                if (btnDownloadPatchFile) {
                    btnDownloadPatchFile.href = '/api/project/export/patch-file/' + data.modificationId;
                }
                if (btnDownloadPatchZip) {
                    btnDownloadPatchZip.href = '/api/project/export/patch-zip/' + data.modificationId;
                }

                showToast("¡Modificación y parche Git generados con éxito!", "success");
            } catch (err) {
                showToast("Error: " + err.message, "error");
            } finally {
                btnGenerateModification.disabled = false;
                btnGenerateModification.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles" style="margin-right:.4rem;"></i>Generar Modificación';
            }
        });
    }

    // ------------------------------------------------------------
    // 23. Public Repo Sync & Drift Detection Logic
    // ------------------------------------------------------------
    const syncModal = document.getElementById("sync-modal");
    const btnSyncCheck = document.getElementById("btn-sync-check");
    const btnCloseSync = document.getElementById("btn-close-sync");
    const syncModalBackdrop = document.getElementById("sync-modal-backdrop");
    const syncContentContainer = document.getElementById("sync-content-container");

    function openSyncModal() {
        if (!syncModal) return;
        syncModal.classList.remove("hidden");
        document.body.style.overflow = "hidden";
        executeSyncCheck();
    }

    function closeSyncModal() {
        if (!syncModal) return;
        syncModal.classList.add("hidden");
        document.body.style.overflow = "";
    }

    if (btnSyncCheck) btnSyncCheck.addEventListener("click", openSyncModal);
    if (btnCloseSync) btnCloseSync.addEventListener("click", closeSyncModal);
    if (syncModalBackdrop) syncModalBackdrop.addEventListener("click", closeSyncModal);

    async function executeSyncCheck() {
        if (!syncContentContainer) return;
        const repoUrl = currentProjectData?.repository?.url || (document.getElementById("repo-input") ? document.getElementById("repo-input").value.trim() : "");
        const branch = currentProjectData?.repository?.branch || (document.getElementById("repo-branch-input") ? document.getElementById("repo-branch-input").value.trim() : "");

        if (!repoUrl) {
            syncContentContainer.innerHTML = '<div style="padding:1.5rem;text-align:center;color:#94A3B8;font-size:.82rem;">No hay un repositorio de GitHub analizado actualmente.</div>';
            return;
        }

        syncContentContainer.innerHTML = '<div style="padding:1.5rem;text-align:center;color:#94A3B8;font-size:.82rem;"><i class="fa-solid fa-circle-notch fa-spin" style="margin-right:.4rem;color:var(--tech-cyan);"></i> Consultando commits en GitHub...</div>';

        try {
            const res = await fetch('/api/github/sync/check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    repoUrl,
                    lastKnownSha: currentProjectData?.repository?.lastCommitSha || null,
                    branch: branch || undefined
                })
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'No se pudo verificar el repositorio.');
            }

            const c = data.commit || {};
            syncContentContainer.innerHTML = `
                <div style="background:rgba(9,13,22,.85);border:1px solid rgba(56,189,248,.2);border-radius:.75rem;padding:1.15rem;margin-bottom:1rem;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.65rem;flex-wrap:wrap;gap:.5rem;">
                        <span style="font-size:.78rem;font-weight:700;color:var(--tech-cyan);font-family:'JetBrains Mono',monospace;">
                            <i class="fa-solid fa-code-commit" style="margin-right:.35rem;"></i>SHA: ${c.sha || 'latest'} (${data.branch})
                        </span>
                        <span style="font-size:.7rem;color:#34D399;font-weight:600;background:rgba(52,211,153,.1);padding:.2rem .5rem;border-radius:.35rem;border:1px solid rgba(52,211,153,.25);">
                            ${data.hasUpdate ? '⚠ Actualización Disponible' : '✔ Al Día'}
                        </span>
                    </div>
                    <p style="font-size:.82rem;color:#FFFFFF;margin-bottom:.45rem;font-weight:600;">${c.message || 'Sin mensaje'}</p>
                    <div style="font-size:.72rem;color:#94A3B8;display:flex;gap:1rem;flex-wrap:wrap;">
                        <span><i class="fa-solid fa-user" style="margin-right:.3rem;"></i>${c.author || 'Autor'}</span>
                        <span><i class="fa-solid fa-clock" style="margin-right:.3rem;"></i>${new Date(c.date).toLocaleString('es-CO')}</span>
                    </div>
                </div>

                <div style="padding:1rem;background:rgba(15,23,42,.85);border-radius:.65rem;border:1px solid rgba(129,140,248,.18);font-size:.78rem;line-height:1.6;color:#CBD5E1;margin-bottom:1.25rem;">
                    <strong style="color:var(--tech-cyan);display:block;margin-bottom:.35rem;"><i class="fa-solid fa-chart-line" style="margin-right:.35rem;"></i>Detección de Desviación (Drift Detection):</strong>
                    DocuMind AI compara automáticamente los archivos clave, endpoints y esquemas. Si el repositorio ha recibido nuevos commits, puedes regenerar la documentación incrementalmente sin perder trazabilidad.
                </div>

                <div style="display:flex;justify-content:flex-end;gap:.75rem;">
                    <button type="button" class="btn-ghost" onclick="document.getElementById('sync-modal').classList.add('hidden');document.body.style.overflow='';">Cerrar</button>
                    <button type="button" class="btn-cyber" id="btn-re-analyze-sync" style="font-size:.8rem;padding:.55rem 1.15rem;">
                        <i class="fa-solid fa-arrows-rotate" style="margin-right:.35rem;"></i>Re-analizar Repositorio
                    </button>
                </div>
            `;

            const btnReAnalyze = document.getElementById("btn-re-analyze-sync");
            if (btnReAnalyze) {
                btnReAnalyze.onclick = () => {
                    closeSyncModal();
                    const btnRun = document.getElementById("btn-start-analysis");
                    if (btnRun) btnRun.click();
                };
            }
        } catch (err) {
            syncContentContainer.innerHTML = `<div style="padding:1rem;background:rgba(244,63,94,.12);border:1px solid rgba(244,63,94,.3);color:#FB7185;border-radius:.65rem;font-size:.78rem;">Error de sincronización: ${err.message}</div>`;
        }
    }

    // ------------------------------------------------------------
    // 24. Legal Terms, Privacy & Colombian Law 1581 Logic
    // ------------------------------------------------------------
    const legalModal = document.getElementById("legal-modal");
    const btnCloseLegal = document.getElementById("btn-close-legal");
    const legalModalBackdrop = document.getElementById("legal-modal-backdrop");
    const legalBodyContainer = document.getElementById("legal-body-container");
    const legalTabTerms = document.getElementById("legal-tab-terms");
    const legalTabPrivacy = document.getElementById("legal-tab-privacy");
    const legalTabData = document.getElementById("legal-tab-data");
    const legalTabDelete = document.getElementById("legal-tab-delete");

    const LEGAL_CONTENTS = {
        terms: `
            <h4 style="color:#FFFFFF;font-size:.95rem;margin-bottom:.65rem;font-weight:700;">1. Términos y Condiciones de Uso de DocuMind AI</h4>
            <p>Bienvenido a <strong>DocuMind AI</strong>, plataforma de ingeniería de software diseñada para la documentación viva, análisis estático y simulación arquitectónica de repositorios públicos de código fuente.</p>
            <h5 style="color:var(--tech-cyan);margin:1rem 0 .35rem 0;">1.1 Alcance del Servicio</h5>
            <p>DocuMind AI analiza repositorios públicos de GitHub mediante consultas de solo lectura a la API pública de GitHub. La plataforma no solicita ni requiere permisos de escritura, tokens personales ni credenciales administrativas a los usuarios.</p>
            <h5 style="color:var(--tech-cyan);margin:1rem 0 .35rem 0;">1.2 Propiedad Intelectual</h5>
            <p>El código fuente analizado pertenece estrictamente a sus respectivos autores y licenciatarios originales. Toda la documentación técnica, diagramas C4 y artefactos generados por DocuMind AI se transfieren al usuario titular de la cuenta.</p>
            <h5 style="color:var(--tech-cyan);margin:1rem 0 .35rem 0;">1.3 Responsabilidad y Uso Aceptable</h5>
            <p>Queda estrictamente prohibido el uso de la plataforma para análisis de código con fines de explotación maliciosa, inyección de malware o vulneración de derechos de autor. DocuMind AI opera bajo un esquema "As-Is" para asistencia técnica de ingeniería.</p>
        `,
        privacy: `
            <h4 style="color:#FFFFFF;font-size:.95rem;margin-bottom:.65rem;font-weight:700;">2. Política de Privacidad y Procesamiento con IA</h4>
            <p>En DocuMind AI la privacidad y la confidencialidad técnica constituyen pilares esenciales (Secure by Design).</p>
            <h5 style="color:var(--tech-cyan);margin:1rem 0 .35rem 0;">2.1 Proveedores de Infraestructura &amp; Procesamiento Externo</h5>
            <p>Para la prestación del servicio se emplean los siguientes proveedores de infraestructura de nube:</p>
            <ul style="padding-left:1.25rem;margin:.5rem 0;">
                <li><strong>Supabase Inc.</strong>: Autenticación federada (Google OAuth) y persistencia en bases de datos PostgreSQL con políticas Row Level Security (RLS).</li>
                <li><strong>Google Cloud (Gemini API)</strong>: Síntesis de alto nivel y modelos de lenguaje. <em>Directiva estricta:</em> Los archivos se sanitizan previamente mediante nuestro escáner SAST para enmascarar contraseñas, secretos y variables de entorno antes de cualquier transmisión.</li>
                <li><strong>Render Services Inc.</strong>: Alojamiento seguro y ejecución del backend en entornos aislados.</li>
                <li><strong>GitHub REST API v3</strong>: Lectura exclusiva de repositorios públicos indexados sin almacenamiento de credenciales.</li>
            </ul>
        `,
        data: `
            <h4 style="color:#FFFFFF;font-size:.95rem;margin-bottom:.65rem;font-weight:700;">3. Tratamiento de Datos Personales — Ley 1581 de 2012 (Colombia)</h4>
            <p>En cumplimiento de la legislación colombiana (Ley Estatutaria 1581 de 2012 y Decreto Reglamentario 1377 de 2013), DocuMind AI garantiza los derechos de los titulares de datos personales:</p>
            <h5 style="color:var(--tech-cyan);margin:1rem 0 .35rem 0;">3.1 Derechos del Titular (Habeas Data)</h5>
            <p>Todo usuario tiene derecho a conocer, actualizar, rectificar y solicitar la supresión de sus datos personales recolectados a través de Google OAuth (nombre y correo electrónico).</p>
            <h5 style="color:var(--tech-cyan);margin:1rem 0 .35rem 0;">3.2 Política de Cookies</h5>
            <p>DocuMind AI únicamente utiliza cookies y almacenamiento local estrictamente técnicos para la persistencia segura de tokens de sesión JWT y caché de análisis. No se emplean cookies de rastreo publicitario de terceros.</p>
        `,
        delete: `
            <h4 style="color:#FB7185;font-size:.95rem;margin-bottom:.65rem;font-weight:700;">4. Eliminación de Cuenta y Supresión de Datos</h4>
            <p>Respetamos tu derecho al olvido. Puedes solicitar en cualquier momento la eliminación total de tus registros de usuario, historiales de análisis locales y tokens de sesión.</p>
            <div style="background:rgba(244,63,94,.1);border:1px solid rgba(244,63,94,.3);border-radius:.65rem;padding:1rem;margin:1.25rem 0;">
                <p style="color:#FB7185;font-size:.78rem;line-height:1.5;margin-bottom:.85rem;">Al confirmar, se eliminarán tus historiales en este dispositivo, se cerrará tu sesión activa de Supabase y se desvinculará tu perfil local.</p>
                <button type="button" id="btn-execute-data-deletion" class="btn-cyber" style="background:linear-gradient(135deg, #F43F5E, #E11D48);color:#fff;font-size:.78rem;padding:.5rem 1rem;">
                    <i class="fa-solid fa-trash-can" style="margin-right:.4rem;"></i>Confirmar y Eliminar Mis Datos
                </button>
            </div>
        `
    };

    function setLegalTab(tab) {
        [legalTabTerms, legalTabPrivacy, legalTabData, legalTabDelete].forEach(t => {
            if (t) t.classList.remove("active");
        });
        if (tab === 'terms' && legalTabTerms) legalTabTerms.classList.add("active");
        if (tab === 'privacy' && legalTabPrivacy) legalTabPrivacy.classList.add("active");
        if (tab === 'data' && legalTabData) legalTabData.classList.add("active");
        if (tab === 'delete' && legalTabDelete) legalTabDelete.classList.add("active");

        if (legalBodyContainer) {
            legalBodyContainer.innerHTML = LEGAL_CONTENTS[tab] || LEGAL_CONTENTS.terms;
            if (tab === 'delete') {
                const btnDel = document.getElementById("btn-execute-data-deletion");
                if (btnDel) {
                    btnDel.onclick = async () => {
                        localStorage.clear();
                        if (supabaseClient) {
                            try { await supabaseClient.auth.signOut(); } catch (e) {}
                        }
                        updateAuthUI(null);
                        closeLegalModal();
                        showToast("Datos locales y sesión eliminados correctamente.", "info");
                        setTimeout(() => window.location.reload(), 1200);
                    };
                }
            }
        }
    }

    function openLegalModal(tab = 'terms') {
        if (!legalModal) return;
        legalModal.classList.remove("hidden");
        document.body.style.overflow = "hidden";
        setLegalTab(tab);
    }

    function closeLegalModal() {
        if (!legalModal) return;
        legalModal.classList.add("hidden");
        document.body.style.overflow = "";
    }

    if (btnCloseLegal) btnCloseLegal.addEventListener("click", closeLegalModal);
    if (legalModalBackdrop) legalModalBackdrop.addEventListener("click", closeLegalModal);

    if (legalTabTerms) legalTabTerms.addEventListener("click", () => setLegalTab('terms'));
    if (legalTabPrivacy) legalTabPrivacy.addEventListener("click", () => setLegalTab('privacy'));
    if (legalTabData) legalTabData.addEventListener("click", () => setLegalTab('data'));
    if (legalTabDelete) legalTabDelete.addEventListener("click", () => setLegalTab('delete'));

    // Wire footer links
    const linkFooterTerms = document.getElementById("link-footer-terms");
    const linkFooterPrivacy = document.getElementById("link-footer-privacy");
    const linkFooterData = document.getElementById("link-footer-data");
    const linkFooterCookies = document.getElementById("link-footer-cookies");
    const linkFooterDelete = document.getElementById("link-footer-delete");

    if (linkFooterTerms) linkFooterTerms.onclick = (e) => { e.preventDefault(); openLegalModal('terms'); };
    if (linkFooterPrivacy) linkFooterPrivacy.onclick = (e) => { e.preventDefault(); openLegalModal('privacy'); };
    if (linkFooterData) linkFooterData.onclick = (e) => { e.preventDefault(); openLegalModal('data'); };
    if (linkFooterCookies) linkFooterCookies.onclick = (e) => { e.preventDefault(); openLegalModal('data'); };
    if (linkFooterDelete) linkFooterDelete.onclick = (e) => { e.preventDefault(); openLegalModal('delete'); };

    // Wire user dropdown delete account
    const btnUserDelete = document.getElementById("btn-user-delete-account");
    if (btnUserDelete) btnUserDelete.onclick = (e) => { e.preventDefault(); openLegalModal('delete'); };

    // Wire Escape key for closing all modals
    window.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            closeIntegrationsModal();
            closeModifyModal();
            closeSyncModal();
            closeLegalModal();
            closeTourModal();
            closeDocEditor();
            closeDocPreviewModal();
        }
    });

    // ============================================================
    // 25. DEMO REPOSITORIES (1-CLICK TRIAL)
    // ============================================================
    const demoRepoBtns = document.querySelectorAll(".demo-repo-btn");
    demoRepoBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const repoInput = document.getElementById("repo-input");
            const branchInput = document.getElementById("repo-branch-input");
            
            // 1. Immediately reset stale analysis from previous repository
            currentAnalysisData = null;
            currentProjectId = null;
            if (projectResults) projectResults.style.display = "none";

            // 2. Load demo repository values
            if (repoInput && btn.dataset.url) {
                repoInput.value = btn.dataset.url;
            }
            if (branchInput && btn.dataset.branch) {
                branchInput.value = btn.dataset.branch;
            }
            switchInputMode("gh");
            showToast(`Cargando y analizando ${btn.textContent.trim()}...`, "info");

            // 3. Immediately trigger generation for true 1-click execution
            executeDocumentationGeneration();
        });
    });

    // Detect manual typing in repo input and hide stale previous results
    const repoInputEl = document.getElementById("repo-input");
    if (repoInputEl) {
        repoInputEl.addEventListener("input", () => {
            if (currentAnalysisData && currentAnalysisData.repository) {
                const analyzedName = (currentAnalysisData.repository.name || "").toLowerCase();
                const analyzedFull = (currentAnalysisData.repository.fullName || "").toLowerCase();
                const currentVal = repoInputEl.value.trim().toLowerCase();
                if (currentVal && !currentVal.includes(analyzedName) && !currentVal.includes(analyzedFull)) {
                    if (projectResults && projectResults.style.display !== "none") {
                        projectResults.style.display = "none";
                        showToast("Has ingresado un nuevo repositorio. Haz clic en 'Generar Documentación' para analizarlo.", "info");
                    }
                }
            }
        });
    }

    // ============================================================
    // 26. DOCUMENTATION LANGUAGE SELECTOR (ES / EN)
    // ============================================================
    const docLangBtns = document.querySelectorAll(".doc-lang-btn");
    const hiddenDocLang = document.getElementById("selected-doc-lang");

    docLangBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            docLangBtns.forEach(b => {
                b.classList.remove("active");
                b.style.background = "transparent";
                b.style.color = "#94A3B8";
            });
            btn.classList.add("active");
            btn.style.background = "var(--tech-cyan)";
            btn.style.color = "#040810";
            if (hiddenDocLang) {
                hiddenDocLang.value = btn.dataset.lang || "es";
            }
            showToast(`Idioma documental configurado en: ${btn.textContent.trim()}`, "info");
        });
    });

    // ============================================================
    // 27. INTERACTIVE MERMAID (FULLSCREEN & PAN/DRAG)
    // ============================================================
    const btnMermaidFullscreen = document.getElementById("btn-mermaid-fullscreen");
    let isMermaidFullscreen = false;

    if (btnMermaidFullscreen && mermaidViewport) {
        btnMermaidFullscreen.addEventListener("click", () => {
            isMermaidFullscreen = !isMermaidFullscreen;
            if (isMermaidFullscreen) {
                mermaidViewport.style.position = "fixed";
                mermaidViewport.style.inset = "0";
                mermaidViewport.style.zIndex = "9999";
                mermaidViewport.style.background = "rgba(9,13,22,.97)";
                mermaidViewport.style.height = "100vh";
                mermaidViewport.style.borderRadius = "0";
                btnMermaidFullscreen.innerHTML = '<i class="fa-solid fa-compress"></i>';
                btnMermaidFullscreen.title = "Salir de Pantalla Completa";
                showToast("Modo Pantalla Completa activado. Presiona Esc para salir.", "info");
            } else {
                mermaidViewport.style.position = "";
                mermaidViewport.style.inset = "";
                mermaidViewport.style.zIndex = "";
                mermaidViewport.style.background = "";
                mermaidViewport.style.height = "";
                mermaidViewport.style.borderRadius = "";
                btnMermaidFullscreen.innerHTML = '<i class="fa-solid fa-expand"></i>';
                btnMermaidFullscreen.title = "Pantalla Completa";
            }
            applyDiagramZoom();
        });
    }

    // Pan / Drag support on mermaidViewport
    if (mermaidViewport) {
        let isPanning = false;
        let startX = 0;
        let startY = 0;
        let panX = 0;
        let panY = 0;

        mermaidViewport.style.cursor = "grab";

        mermaidViewport.addEventListener("mousedown", (e) => {
            if (e.target.closest("button") || e.target.closest("select")) return;
            isPanning = true;
            mermaidViewport.style.cursor = "grabbing";
            startX = e.clientX - panX;
            startY = e.clientY - panY;
        });

        window.addEventListener("mousemove", (e) => {
            if (!isPanning) return;
            panX = e.clientX - startX;
            panY = e.clientY - startY;
            const renderArea = document.getElementById("mermaid-render-area");
            if (renderArea) {
                renderArea.style.transform = `translate(${panX}px, ${panY}px) scale(${currentDiagramZoom})`;
            }
        });

        window.addEventListener("mouseup", () => {
            if (isPanning) {
                isPanning = false;
                if (mermaidViewport) mermaidViewport.style.cursor = "grab";
            }
        });

        if (btnZoomReset) {
            const originalReset = btnZoomReset.onclick;
            btnZoomReset.onclick = () => {
                panX = 0;
                panY = 0;
                currentDiagramZoom = 1.0;
                const renderArea = document.getElementById("mermaid-render-area");
                if (renderArea) {
                    renderArea.style.transform = 'translate(0px, 0px) scale(1.0)';
                }
            };
        }
    }

    // ============================================================
    // 28. ONBOARDING QUICK TOUR (3 STEPS)
    // ============================================================
    const tourModal = document.getElementById("tour-modal");
    const btnOpenTour = document.getElementById("btn-open-tour");
    const btnCloseTour = document.getElementById("btn-close-tour");
    const tourModalBackdrop = document.getElementById("tour-modal-backdrop");
    const tourStepContent = document.getElementById("tour-step-content");
    const btnTourPrev = document.getElementById("btn-tour-prev");
    const btnTourNext = document.getElementById("btn-tour-next");
    const tourDots = document.querySelectorAll("#tour-dots .tour-dot");

    let currentTourStep = 0;

    const TOUR_STEPS = [
        {
            title: "1. Ingesta de Código y Repositorios",
            badge: "Paso 1 de 3",
            icon: "fa-brands fa-github",
            color: "var(--tech-cyan)",
            content: `<p style="font-size:.85rem;color:#CBD5E1;line-height:1.7;margin-bottom:1rem;">
                Comienza ingresando cualquier repositorio <strong>público de GitHub</strong> o utiliza los botones de <strong>1 Clic (Express, FastAPI, DocuMind)</strong> para probar inmediatamente.
            </p>
            <div style="padding:.85rem 1rem;background:rgba(56,189,248,.08);border:1px solid rgba(56,189,248,.25);border-radius:.65rem;font-size:.78rem;color:#7DD3FC;line-height:1.6;">
                <i class="fa-solid fa-shield-halved" style="margin-right:.4rem;"></i><strong>Cero Riesgo:</strong> DocuMind analiza código estáticamente sin ejecutarlo en el servidor, con protección anti-SSRF y sanitización criptográfica de secretos.
            </div>`
        },
        {
            title: "2. Documentación Viva, C4 y Auditoría SAST",
            badge: "Paso 2 de 3",
            icon: "fa-solid fa-sitemap",
            color: "#818CF8",
            content: `<p style="font-size:.85rem;color:#CBD5E1;line-height:1.7;margin-bottom:1rem;">
                En segundos obtienes una suite completa de ingeniería: <strong>PRD, SRS (IEEE 830), diagramas C4 y ERD en Mermaid interactivo</strong>, contratos OpenAPI 3.0.3 y un informe de seguridad SAST con matriz STRIDE.
            </p>
            <div style="padding:.85rem 1rem;background:rgba(129,140,248,.08);border:1px solid rgba(129,140,248,.25);border-radius:.65rem;font-size:.78rem;color:#C7D2FE;line-height:1.6;">
                <i class="fa-solid fa-pen-to-square" style="margin-right:.4rem;"></i><strong>Editor Markdown en Pantalla Dividida:</strong> Puedes editar cualquier documento generado en tiempo real y descargarlo en ZIP o PDF.
            </div>`
        },
        {
            title: "3. Simulación de Arquitectura y Parches Git",
            badge: "Paso 3 de 3",
            icon: "fa-solid fa-sliders",
            color: "#34D399",
            content: `<p style="font-size:.85rem;color:#CBD5E1;line-height:1.7;margin-bottom:1rem;">
                Usa el <strong>Simulador Matemático (Actividad 9)</strong> para evaluar concurrencia y límites de hardware bajo modelos de colas M/M/c. Además, puedes <strong>solicitar modificaciones con IA</strong> para descargar parches Git listos para aplicar.
            </p>
            <div style="padding:.85rem 1rem;background:rgba(52,211,153,.08);border:1px solid rgba(52,211,153,.25);border-radius:.65rem;font-size:.78rem;color:#6EE7B7;line-height:1.6;margin-bottom:.75rem;">
                <i class="fa-solid fa-bolt" style="margin-right:.4rem;"></i><strong>Sincronización en Vivo:</strong> Detecta discrepancias de commit y drift de arquitectura en 1 clic.
            </div>
            <div>
                <a href="/simulador" target="_blank" rel="noopener noreferrer" class="btn-cyber-outline" style="display:inline-flex;align-items:center;padding:.35rem .75rem;font-size:.72rem;color:#34D399;border-color:rgba(52,211,153,.4);">
                    <i class="fa-solid fa-arrow-up-right-from-square" style="margin-right:.35rem;"></i>Abrir Simulador Independiente
                </a>
            </div>`
        }
    ];

    function renderTourStep(index) {
        if (!tourStepContent) return;
        const step = TOUR_STEPS[index];
        tourStepContent.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.85rem;">
                <h4 style="font-size:.98rem;font-weight:800;color:#fff;margin:0;display:flex;align-items:center;gap:.5rem;">
                    <i class="${step.icon}" style="color:${step.color};"></i>${step.title}
                </h4>
                <span class="badge badge-cyan" style="font-size:.65rem;">${step.badge}</span>
            </div>
            ${step.content}
        `;

        // Update dots
        tourDots.forEach((dot, dIdx) => {
            if (dIdx === index) {
                dot.style.background = "var(--tech-cyan)";
                dot.style.transform = "scale(1.2)";
            } else {
                dot.style.background = "#334155";
                dot.style.transform = "scale(1)";
            }
        });

        // Update buttons
        if (btnTourPrev) btnTourPrev.disabled = (index === 0);
        if (btnTourNext) {
            if (index === TOUR_STEPS.length - 1) {
                btnTourNext.innerHTML = '<i class="fa-solid fa-play" style="margin-right:.35rem;"></i>Comenzar Ahora';
            } else {
                btnTourNext.innerHTML = 'Siguiente<i class="fa-solid fa-arrow-right" style="margin-left:.35rem;"></i>';
            }
        }
    }

    function openTourModal() {
        if (!tourModal) return;
        currentTourStep = 0;
        renderTourStep(0);
        tourModal.classList.remove("hidden");
        document.body.style.overflow = "hidden";
    }

    function closeTourModal() {
        if (!tourModal) return;
        tourModal.classList.add("hidden");
        document.body.style.overflow = "";
        localStorage.setItem("documind_tour_seen", "true");
    }

    if (btnOpenTour) btnOpenTour.addEventListener("click", openTourModal);
    if (btnCloseTour) btnCloseTour.addEventListener("click", closeTourModal);
    if (tourModalBackdrop) tourModalBackdrop.addEventListener("click", closeTourModal);

    if (btnTourPrev) {
        btnTourPrev.addEventListener("click", () => {
            if (currentTourStep > 0) {
                currentTourStep--;
                renderTourStep(currentTourStep);
            }
        });
    }

    if (btnTourNext) {
        btnTourNext.addEventListener("click", () => {
            if (currentTourStep < TOUR_STEPS.length - 1) {
                currentTourStep++;
                renderTourStep(currentTourStep);
            } else {
                closeTourModal();
                const inputSec = document.getElementById("analizador");
                if (inputSec) inputSec.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }

    // Auto-launch tour on first visit
    if (!localStorage.getItem("documind_tour_seen")) {
        setTimeout(openTourModal, 1200);
    }

    // ============================================================
    // 29. SPLIT-PANE MARKDOWN LIVE EDITOR
    // ============================================================
    const btnToggleEditor = document.getElementById("btn-toggle-editor");
    const docEditorSection = document.getElementById("doc-editor-section");
    const btnCloseDocEditor = document.getElementById("btn-close-doc-editor");
    const btnSaveDocEdit = document.getElementById("btn-save-doc-edit");
    const docEditorTextarea = document.getElementById("doc-editor-textarea");
    const docEditorPreview = document.getElementById("doc-editor-preview");
    const editorActiveDocTitle = document.getElementById("editor-active-doc-title");

    let activeDocKey = "readme";

    const DOC_KEY_MAP = {
        'doc-tab-readme': { key: 'readme', title: 'README.md', contentId: 'content-readme' },
        'doc-tab-product': { key: 'prd', title: 'PRD & Especificación', contentId: 'content-prd' },
        'doc-tab-srs': { key: 'srs', title: 'SRS (IEEE 830)', contentId: 'content-srs' },
        'doc-tab-architecture': { key: 'architecture', title: 'Arquitectura C4', contentId: 'content-architecture' },
        'doc-tab-api': { key: 'api', title: 'Endpoints & OpenAPI', contentId: 'content-api' },
        'doc-tab-devops': { key: 'devops', title: 'Guía DevOps & Despliegue', contentId: 'content-devops' },
        'doc-tab-qa': { key: 'qa', title: 'Matriz QA & Casos de Prueba', contentId: 'content-qa' },
        'doc-tab-user': { key: 'userGuide', title: 'Manual de Usuario', contentId: 'content-user' },
        'doc-tab-security': { key: 'security', title: 'Reporte de Seguridad SAST', contentId: 'content-security' }
    };

    function getCurrentlyActiveDocInfo() {
        const activeTab = document.querySelector(".doc-tab-btn.active");
        if (activeTab && DOC_KEY_MAP[activeTab.id]) {
            return DOC_KEY_MAP[activeTab.id];
        }
        return DOC_KEY_MAP['doc-tab-readme'];
    }

    function openDocEditor() {
        if (!docEditorSection || !currentAnalysisData) {
            showToast("Primero analiza un proyecto para editar sus documentos.", "error");
            return;
        }

        const info = getCurrentlyActiveDocInfo();
        activeDocKey = info.key;
        if (editorActiveDocTitle) editorActiveDocTitle.textContent = info.title;

        // Fetch current markdown content
        const docObj = currentAnalysisData.documentation || {};
        let rawContent = docObj[info.key] || "";
        if (typeof rawContent !== "string") {
            try { rawContent = JSON.stringify(rawContent, null, 2); } catch(e) { rawContent = ""; }
        }

        if (docEditorTextarea) docEditorTextarea.value = rawContent;
        if (docEditorPreview && typeof marked !== "undefined") {
            docEditorPreview.innerHTML = marked.parse(rawContent);
        }

        docEditorSection.style.display = "block";
        docEditorSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function closeDocEditor() {
        if (docEditorSection) docEditorSection.style.display = "none";
    }

    if (btnToggleEditor) {
        btnToggleEditor.addEventListener("click", () => {
            if (docEditorSection && docEditorSection.style.display === "block") {
                closeDocEditor();
            } else {
                openDocEditor();
            }
        });
    }

    if (btnCloseDocEditor) btnCloseDocEditor.addEventListener("click", closeDocEditor);

    // Live preview sync
    if (docEditorTextarea && docEditorPreview) {
        docEditorTextarea.addEventListener("input", () => {
            if (typeof marked !== "undefined") {
                docEditorPreview.innerHTML = marked.parse(docEditorTextarea.value);
            }
        });
    }

    // Save changes to current memory model & update active view
    if (btnSaveDocEdit) {
        btnSaveDocEdit.addEventListener("click", () => {
            if (!currentAnalysisData || !docEditorTextarea) return;
            const updatedText = docEditorTextarea.value;
            const info = getCurrentlyActiveDocInfo();

            if (!currentAnalysisData.documentation) currentAnalysisData.documentation = {};
            currentAnalysisData.documentation[info.key] = updatedText;

            // Update visible rendered panel if exists
            const panelEl = document.getElementById(info.contentId);
            if (panelEl && typeof marked !== "undefined") {
                panelEl.innerHTML = marked.parse(updatedText);
            }

            showToast(`¡Cambios guardados en ${info.title}! Se incluirán en tus descargas ZIP.`, "success");
        });
    }

});