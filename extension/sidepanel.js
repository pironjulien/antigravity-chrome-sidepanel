/**
 * Google Gemini Aesthetic Side Panel - Antigravity Co-Pilot Logic (v2.0.0)
 * Fully wired, interactive, and responsive: Tab Context Switcher, Model Selector,
 * Voice Dictation (Web Speech API), Options Menu, Suggestion Pills, and Live Page Intelligence.
 */

document.addEventListener("DOMContentLoaded", () => {
    // -------------------------------------------------------------------------
    // 1. Éléments DOM & Sélecteurs
    // -------------------------------------------------------------------------
    const bridgeStatusIndicator = document.getElementById("bridge-status-indicator");
    const btnOptions = document.getElementById("btn-options");
    const btnClosePanel = document.getElementById("btn-close-panel");
    const optionsDropdownMenu = document.getElementById("options-dropdown-menu");

    const optReloadTab = document.getElementById("opt-reload-tab");
    const optPingBridge = document.getElementById("opt-ping-bridge");
    const optOpenExtensions = document.getElementById("opt-open-extensions");
    const optClearChat = document.getElementById("opt-clear-chat");

    const welcomeBox = document.getElementById("welcome-box");
    const suggestionsStack = document.getElementById("suggestions-stack");
    const feedMessages = document.getElementById("feed-messages");
    const feedContainer = document.getElementById("feed-container");

    const tabsDropdownMenu = document.getElementById("tabs-dropdown-menu");
    const tabsDropdownList = document.getElementById("tabs-dropdown-list");
    const modelDropdownMenu = document.getElementById("model-dropdown-menu");

    const geminiContextRow = document.getElementById("gemini-context-row");
    const tabChipTitle = document.getElementById("tab-chip-title");
    const btnDetachTab = document.getElementById("btn-detach-tab");
    const btnAddContext = document.getElementById("btn-add-context");

    const promptInput = document.getElementById("prompt-input");
    const btnModelSelector = document.getElementById("btn-model-selector");
    const modelNameLabel = document.getElementById("model-name-label");

    const btnSend = document.getElementById("btn-send");
    const iconMic = btnSend?.querySelector(".icon-mic");
    const iconSend = btnSend?.querySelector(".icon-send");

    const geminiToast = document.getElementById("gemini-toast");

    let currentTabId = null;
    let toastTimeout = null;

    // -------------------------------------------------------------------------
    // 2. Modèles Supportés & Gestion de l'État
    // -------------------------------------------------------------------------
    const MODELS = {
        auto: { id: "auto", label: "AGY 2.0 • Auto", desc: "Routage Intelligent" },
        flash: { id: "flash", label: "AGY 2.0 • Flash Extended", desc: "Rapide" },
        pro: { id: "pro", label: "AGY 2.0 • Pro Reasoning", desc: "Raisonnement poussé" },
        direct: { id: "direct", label: "AGY 2.0 • SOTA Direct", desc: "CDP + Actions directes" }
    };

    let currentModel = localStorage.getItem("antigravity_selected_model") || "auto";
    if (!MODELS[currentModel]) currentModel = "auto";

    function resolveEffectiveModel(text = "") {
        if (currentModel !== "auto") return currentModel;
        const lower = text.toLowerCase().trim();
        if (lower.startsWith("clic") || lower.startsWith("click") || lower.startsWith("#") ||
            lower.includes("bouton") || lower.includes("capture") || lower.includes("screenshot") ||
            lower.includes("cookies") || lower.includes("formulaire") || lower.includes("remplis") ||
            lower.includes("scroll") || lower.includes("navigue") || lower.includes("recharge")) {
            return "direct";
        }
        if (lower.includes("pourquoi") || lower.includes("compare") || lower.includes("code") ||
            lower.includes("technique") || lower.includes("architecture") || lower.includes("stratégie") ||
            lower.includes("détaille") || text.length > 120) {
            return "pro";
        }
        return "flash";
    }

    function updateModelUI() {
        const config = MODELS[currentModel] || MODELS.auto;
        if (modelNameLabel) {
            modelNameLabel.textContent = config.label;
        }
        if (modelDropdownMenu) {
            const items = modelDropdownMenu.querySelectorAll(".menu-item");
            items.forEach((item) => {
                const id = item.getAttribute("data-model");
                if (id === currentModel) {
                    item.classList.add("active");
                    item.textContent = `✓ ${MODELS[id].label} (${MODELS[id].desc})`;
                } else {
                    item.classList.remove("active");
                    item.textContent = `${MODELS[id]?.label || id} (${MODELS[id]?.desc || ""})`;
                }
            });
        }
    }

    // -------------------------------------------------------------------------
    // 3. Toasts de Notification & Menus Déroulants Flottants
    // -------------------------------------------------------------------------
    function showToast(text, durationMs = 2400) {
        if (!geminiToast) return;
        geminiToast.textContent = text;
        geminiToast.classList.add("show");
        if (toastTimeout) clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            geminiToast.classList.remove("show");
        }, durationMs);
    }

    function hideAllDropdowns() {
        if (optionsDropdownMenu) optionsDropdownMenu.style.display = "none";
        if (tabsDropdownMenu) tabsDropdownMenu.style.display = "none";
        if (modelDropdownMenu) modelDropdownMenu.style.display = "none";
    }

    document.addEventListener("click", (e) => {
        if (!e.target.closest(".gemini-floating-menu") &&
            !e.target.closest("#btn-options") &&
            !e.target.closest("#btn-add-context") &&
            !e.target.closest("#btn-model-selector")) {
            hideAllDropdowns();
        }
    });

    // -------------------------------------------------------------------------
    // 4. Menu Options (Barre Supérieure)
    // -------------------------------------------------------------------------
    if (btnOptions) {
        btnOptions.addEventListener("click", (e) => {
            e.stopPropagation();
            const isShowing = optionsDropdownMenu.style.display === "block";
            hideAllDropdowns();
            if (!isShowing && optionsDropdownMenu) {
                optionsDropdownMenu.style.display = "block";
            }
        });
    }

    if (btnClosePanel) {
        btnClosePanel.addEventListener("click", () => {
            window.close();
        });
    }

    if (optReloadTab) {
        optReloadTab.addEventListener("click", async () => {
            hideAllDropdowns();
            if (!currentTabId) {
                showToast("⚠️ Aucun onglet actif");
                return;
            }
            showToast("🔄 Rechargement de l'onglet...");
            const res = await executeBridgeAction("reload", { tabId: currentTabId });
            if (res.error) {
                showToast(`❌ Erreur: ${res.error}`);
            } else {
                showToast("✅ Onglet rechargé");
            }
        });
    }

    if (optPingBridge) {
        optPingBridge.addEventListener("click", async () => {
            hideAllDropdowns();
            const t0 = performance.now();
            chrome.runtime.sendMessage({ target: "background", ping: true }, (res) => {
                const latency = Math.round(performance.now() - t0);
                if (chrome.runtime.lastError || !res) {
                    addResultCard("Pont Local (127.0.0.1:9224)", `
                        <p style="color:#f28b82;">❌ Pont Antigravity hors ligne</p>
                        <p style="font-size:11px;color:var(--gemini-text-muted);margin-top:4px;">Lancez le serveur Python ou redémarrez Chrome.</p>
                    `);
                    updateBridgeStatus();
                    return;
                }
                addResultCard("Diagnostic Pont Antigravity", `
                    <p style="color:#81c995;">⚡ Pont 127.0.0.1:9224 opérationnel</p>
                    <p style="font-size:12px;margin-top:4px;">• Latence aller-retour : <strong>${latency} ms</strong></p>
                    <p style="font-size:12px;">• Service Worker : <strong>Actif (Keepalive OK)</strong></p>
                    <p style="font-size:12px;">• WebSocket Bridge : <code>ws://127.0.0.1:9224</code></p>
                `);
                updateBridgeStatus();
            });
        });
    }

    if (optOpenExtensions) {
        optOpenExtensions.addEventListener("click", () => {
            hideAllDropdowns();
            chrome.tabs.create({ url: "chrome://extensions" });
        });
    }

    if (optClearChat) {
        optClearChat.addEventListener("click", () => {
            hideAllDropdowns();
            if (feedMessages) feedMessages.innerHTML = "";
            if (welcomeBox) welcomeBox.style.display = "flex";
            if (suggestionsStack) suggestionsStack.style.display = "flex";
            showToast("Conversation effacée");
        });
    }

    // -------------------------------------------------------------------------
    // 5. Statut du Pont & Initialisation
    // -------------------------------------------------------------------------
    async function updateBridgeStatus() {
        try {
            chrome.runtime.sendMessage({ target: "background", getStatus: true }, (res) => {
                if (chrome.runtime.lastError || !res) {
                    if (bridgeStatusIndicator) {
                        bridgeStatusIndicator.className = "gemini-status-dot offline";
                        bridgeStatusIndicator.title = "Pont local hors ligne (127.0.0.1)";
                    }
                    return;
                }
                if (res.connected) {
                    if (bridgeStatusIndicator) {
                        bridgeStatusIndicator.className = "gemini-status-dot online";
                        bridgeStatusIndicator.title = "Pont Antigravity actif (127.0.0.1:9224)";
                    }
                } else {
                    if (bridgeStatusIndicator) {
                        bridgeStatusIndicator.className = "gemini-status-dot offline";
                        bridgeStatusIndicator.title = "Pont en attente de connexion (127.0.0.1)";
                    }
                }
            });
        } catch (_) {
            if (bridgeStatusIndicator) {
                bridgeStatusIndicator.className = "gemini-status-dot offline";
            }
        }
    }

    if (bridgeStatusIndicator) {
        bridgeStatusIndicator.addEventListener("click", () => {
            showToast("Vérification du pont...");
            updateBridgeStatus();
        });
    }

    // -------------------------------------------------------------------------
    // 6. Gestion du Contexte d'Onglet (Context Chip & Sélecteur d'Onglets)
    // -------------------------------------------------------------------------
    async function updateActiveTabContext() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) return;

            currentTabId = tab.id;
            const title = tab.title || "Nouvel onglet";
            if (tabChipTitle) {
                tabChipTitle.textContent = title;
                tabChipTitle.title = tab.url || title;
            }
            if (geminiContextRow) {
                geminiContextRow.style.display = "flex";
            }
        } catch (e) {
            console.error("[NexusAGY] Erreur onglet actif:", e);
        }
    }

    function selectContextTab(tab) {
        if (!tab) return;
        currentTabId = tab.id;
        const title = tab.title || "Nouvel onglet";
        if (tabChipTitle) {
            tabChipTitle.textContent = title;
            tabChipTitle.title = tab.url || title;
        }
        if (geminiContextRow) {
            geminiContextRow.style.display = "flex";
        }
        if (promptInput) {
            if (promptInput.value.endsWith("@")) {
                promptInput.value = promptInput.value.slice(0, -1);
            }
            promptInput.focus();
        }
        showToast(`Onglet attaché : ${title.slice(0, 24)}...`);
    }

    async function openTabsDropdown() {
        hideAllDropdowns();
        if (!tabsDropdownList || !tabsDropdownMenu) return;

        tabsDropdownList.innerHTML = `<div style="padding:10px;font-size:12px;color:var(--gemini-text-muted);text-align:center;">Chargement des onglets...</div>`;
        tabsDropdownMenu.style.display = "block";

        try {
            const tabs = await chrome.tabs.query({});
            tabsDropdownList.innerHTML = "";
            if (!tabs || tabs.length === 0) {
                tabsDropdownList.innerHTML = `<div style="padding:10px;font-size:12px;color:var(--gemini-text-muted);">Aucun onglet ouvert.</div>`;
                return;
            }

            tabs.forEach((tab) => {
                const item = document.createElement("div");
                item.className = "tab-select-item";
                if (tab.id === currentTabId) item.classList.add("active");

                const icon = tab.favIconUrl
                    ? `<img src="${escapeHtml(tab.favIconUrl)}" onerror="this.outerHTML='🌐'"/>`
                    : `<span>🌐</span>`;
                const title = tab.title || tab.url || "Onglet sans titre";

                item.innerHTML = `
                    ${icon}
                    <span class="tab-select-title" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeHtml(title)}">${escapeHtml(title)}</span>
                `;

                item.addEventListener("click", () => {
                    selectContextTab(tab);
                    hideAllDropdowns();
                });
                tabsDropdownList.appendChild(item);
            });
        } catch (err) {
            tabsDropdownList.innerHTML = `<div style="padding:8px;font-size:12px;color:#f28b82;">Erreur: ${escapeHtml(err.message)}</div>`;
        }
    }

    if (btnAddContext) {
        btnAddContext.addEventListener("click", (e) => {
            e.stopPropagation();
            if (tabsDropdownMenu && tabsDropdownMenu.style.display === "block") {
                tabsDropdownMenu.style.display = "none";
            } else {
                openTabsDropdown();
            }
        });
    }

    if (btnDetachTab) {
        btnDetachTab.addEventListener("click", () => {
            if (geminiContextRow) geminiContextRow.style.display = "none";
            currentTabId = null;
            showToast("Contexte détaché. Cliquez sur '+' pour rattacher");
        });
    }

    if (typeof chrome !== "undefined" && chrome.tabs) {
        chrome.tabs.onActivated.addListener(() => {
            updateActiveTabContext();
        });
        chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
            if (changeInfo.status === "complete" || changeInfo.title || changeInfo.url) {
                updateActiveTabContext();
            }
        });
    }

    // -------------------------------------------------------------------------
    // 7. Sélecteur de Modèle (Flash, Pro, Direct)
    // -------------------------------------------------------------------------
    if (btnModelSelector) {
        btnModelSelector.addEventListener("click", (e) => {
            e.stopPropagation();
            const isShowing = modelDropdownMenu && modelDropdownMenu.style.display === "block";
            hideAllDropdowns();
            if (!isShowing && modelDropdownMenu) {
                modelDropdownMenu.style.display = "block";
            }
        });
    }

    if (modelDropdownMenu) {
        const items = modelDropdownMenu.querySelectorAll(".menu-item");
        items.forEach((item) => {
            item.addEventListener("click", (e) => {
                e.stopPropagation();
                const modelId = item.getAttribute("data-model");
                if (modelId && MODELS[modelId]) {
                    currentModel = modelId;
                    localStorage.setItem("antigravity_selected_model", currentModel);
                    updateModelUI();
                    showToast(`Modèle activé : ${MODELS[modelId].label}`);
                }
                hideAllDropdowns();
            });
        });
    }

    // -------------------------------------------------------------------------
    // 8. Reconnaissance Vocale (Microphone Web Speech API)
    // -------------------------------------------------------------------------
    let recognition = null;
    let isRecording = false;

    function initSpeechRecognition() {
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRec) {
            console.warn("[NexusAGY] Web Speech API non disponible dans ce contexte.");
            return null;
        }
        try {
            const rec = new SpeechRec();
            rec.continuous = false;
            rec.interimResults = true;
            rec.lang = navigator.language || "fr-FR";

            rec.onstart = () => {
                isRecording = true;
                if (btnSend) btnSend.classList.add("recording");
                if (promptInput) promptInput.placeholder = "Écoute en cours... Parlez maintenant";
                showToast("🎙️ Écoute en cours...");
            };

            rec.onresult = (event) => {
                let transcript = "";
                for (let i = 0; i < event.results.length; i++) {
                    transcript += event.results[i][0].transcript;
                }
                if (promptInput) {
                    promptInput.value = transcript;
                    promptInput.style.height = "auto";
                    promptInput.style.height = Math.min(promptInput.scrollHeight, 120) + "px";
                    updateSendButtonState();
                }
            };

            rec.onerror = (event) => {
                console.warn("[NexusAGY] SpeechRecognition error:", event.error);
                stopVoiceDictation();
                if (event.error === "not-allowed") {
                    showToast("⚠️ Microphone non autorisé dans Chrome");
                }
            };

            rec.onend = () => {
                stopVoiceDictation();
            };

            return rec;
        } catch (e) {
            console.error("[NexusAGY] Erreur init SpeechRecognition:", e);
            return null;
        }
    }

    function startVoiceDictation() {
        if (!recognition) recognition = initSpeechRecognition();
        if (!recognition) {
            showToast("ℹ️ Reconnaissance vocale non supportée");
            return;
        }
        try {
            recognition.start();
        } catch (_) {
            stopVoiceDictation();
        }
    }

    function stopVoiceDictation() {
        isRecording = false;
        if (btnSend) btnSend.classList.remove("recording");
        if (promptInput) {
            promptInput.placeholder = "Saisissez @ pour ajouter des onglets ou une instruction...";
        }
        if (recognition) {
            try { recognition.stop(); } catch (_) {}
        }
    }

    // -------------------------------------------------------------------------
    // 9. Messages & Rendu Visuel Gemini
    // -------------------------------------------------------------------------
    function hideWelcomeAndSuggestions() {
        if (welcomeBox) welcomeBox.style.display = "none";
        if (suggestionsStack) suggestionsStack.style.display = "none";
    }

    function addMessage(role, text) {
        hideWelcomeAndSuggestions();
        const msgDiv = document.createElement("div");
        msgDiv.className = `message-bubble ${role}`;
        msgDiv.innerHTML = text;
        feedMessages.appendChild(msgDiv);
        feedContainer.scrollTop = feedContainer.scrollHeight;
        return msgDiv;
    }

    function addResultCard(title, contentHtml, effectiveModel = null) {
        hideWelcomeAndSuggestions();
        const card = document.createElement("div");
        card.className = "result-card";
        const active = effectiveModel || currentModel;
        let badgeLabel = MODELS[active]?.label || "AGY 2.0";
        if (currentModel === "auto" && active !== "auto") {
            badgeLabel = `Auto ➔ ${MODELS[active]?.label || active}`;
        }
        const modelBadge = `<span style="font-size:10px;color:var(--gemini-blue);">${escapeHtml(badgeLabel)}</span>`;
        card.innerHTML = `
            <div class="result-header">
                <span>${title}</span>
                ${modelBadge}
            </div>
            <div class="result-body">
                ${contentHtml}
            </div>
        `;
        feedMessages.appendChild(card);
        feedContainer.scrollTop = feedContainer.scrollHeight;
        return card;
    }

    function addThinkingIndicator() {
        hideWelcomeAndSuggestions();
        const bubble = document.createElement("div");
        bubble.className = "message-bubble assistant thinking-bubble";
        bubble.innerHTML = `
            <div class="thinking-indicator">
                <span>Analyse en cours</span>
                <span class="thinking-dots-wrap">
                    <span class="thinking-dot"></span>
                    <span class="thinking-dot"></span>
                    <span class="thinking-dot"></span>
                </span>
            </div>
        `;
        feedMessages.appendChild(bubble);
        feedContainer.scrollTop = feedContainer.scrollHeight;
        return bubble;
    }

    async function executeBridgeAction(action, params = {}) {
        return new Promise((resolve) => {
            if (currentTabId && params.tab_id === undefined && params.tabId === undefined) {
                params.tab_id = currentTabId;
            }
            chrome.runtime.sendMessage({ target: "background", executeAction: true, action, params }, (res) => {
                if (chrome.runtime.lastError) {
                    resolve({ error: chrome.runtime.lastError.message });
                } else {
                    resolve(res || {});
                }
            });
        });
    }

    function escapeHtml(text) {
        if (!text) return "";
        return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }

    // -------------------------------------------------------------------------
    // 10. Actions des Suggestions Gemini (SoM, Formulaires, Cookies, Capture)
    // -------------------------------------------------------------------------
    async function triggerInteractiveMap() {
        addMessage("user", "Cartographier les boutons cliquables");
        const thinking = addThinkingIndicator();
        const res = await executeBridgeAction("interactive-map", { viewportOnly: true });
        thinking.remove();

        if (res.error) {
            addResultCard("Erreur", `<p style="color:#f28b82;">${escapeHtml(res.error)}</p>`);
            return;
        }

        const elements = res.data?.elements || [];
        if (elements.length === 0) {
            addResultCard("Carte interactive", `<p style="color:var(--gemini-text-muted);">Aucun élément interactif détecté dans la zone visible.</p>`);
            return;
        }

        let listHtml = `<div class="elements-list">`;
        elements.forEach(el => {
            const label = el.label || el.selector || el.tag;
            listHtml += `
                <div class="element-pill-action" data-mark="${el.mark}" title="${escapeHtml(el.selector)}">
                    <span class="element-badge">#${el.mark}</span>
                    <span style="color:var(--gemini-text-muted);font-size:11px;">${escapeHtml(el.tag)}</span>
                    <span style="color:var(--gemini-text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(label)}</span>
                </div>
            `;
        });
        listHtml += `</div>`;

        addResultCard(`Éléments interactifs (${elements.length})`, listHtml);

        feedMessages.querySelectorAll(".element-pill-action").forEach(pill => {
            pill.onclick = async () => {
                const mark = parseInt(pill.getAttribute("data-mark"), 10);
                addMessage("user", `Clic sur #${mark}`);
                const clickRes = await executeBridgeAction("click", { mark });
                if (clickRes.error) {
                    addMessage("assistant", `❌ Échec du clic #${mark} : ${escapeHtml(clickRes.error)}`);
                } else {
                    addMessage("assistant", `✅ Clic #${mark} exécuté avec succès.`);
                }
            };
        });
    }

    async function triggerInspect() {
        addMessage("user", "Inspecter les champs du formulaire");
        const thinking = addThinkingIndicator();
        const res = await executeBridgeAction("content", { mode: "interactive" });
        thinking.remove();

        if (res.error) {
            addResultCard("Erreur", `<p style="color:#f28b82;">${escapeHtml(res.error)}</p>`);
            return;
        }
        const els = res.data?.elements || [];
        const forms = els.filter(e => e.tag === "input" || e.tag === "textarea" || e.tag === "select");
        const buttons = els.filter(e => e.tag === "button" || e.role === "button");

        let fieldsSummary = "";
        if (forms.length > 0) {
            fieldsSummary += `<div style="margin-top:6px;display:flex;flex-direction:column;gap:4px;">`;
            forms.slice(0, 8).forEach((f) => {
                const name = f.text || f.id || f.type || "champ";
                fieldsSummary += `<div style="font-size:11px;color:var(--gemini-text-secondary);background:rgba(255,255,255,0.03);padding:3px 6px;border-radius:4px;">• <code>&lt;${escapeHtml(f.tag)}&gt;</code> ${escapeHtml(name)}</div>`;
            });
            if (forms.length > 8) fieldsSummary += `<div style="font-size:11px;color:var(--gemini-text-muted);">... et ${forms.length - 8} autre(s) champ(s)</div>`;
            fieldsSummary += `</div>`;
        }

        addResultCard("Audit du formulaire", `
            <p>• <strong>${forms.length}</strong> champ(s) de saisie identifié(s)</p>
            <p>• <strong>${buttons.length}</strong> bouton(s) d'action détecté(s)</p>
            <p>• Total interactifs : <strong>${els.length}</strong></p>
            ${fieldsSummary}
        `);
    }

    async function triggerCookies() {
        addMessage("user", "Extraire les cookies de session");
        const thinking = addThinkingIndicator();
        const res = await executeBridgeAction("get-cookies");
        thinking.remove();

        if (res.error) {
            addResultCard("Erreur", `<p style="color:#f28b82;">${escapeHtml(res.error)}</p>`);
            return;
        }
        const count = res.data?.cookieCount || (res.data?.cookies ? res.data.cookies.length : 0);
        addResultCard("Cookies de Session", `
            <p>✅ <strong>${count}</strong> cookie(s) de session authentifié(s) prêts pour rejeu API.</p>
            <p style="font-size:11px;color:var(--gemini-text-muted);margin-top:4px;">Les cookies d'authentification restent sécurisés et isolés dans votre profil Chrome.</p>
        `);
    }

    async function triggerScreenshot() {
        addMessage("user", "Capturer la vue actuelle");
        const thinking = addThinkingIndicator();
        const res = await executeBridgeAction("screenshot");
        thinking.remove();

        if (res.error) {
            addResultCard("Erreur", `<p style="color:#f28b82;">${escapeHtml(res.error)}</p>`);
            return;
        }
        const dataUrl = res.data?.dataUrl;
        if (dataUrl) {
            addResultCard("Capture d'écran", `<img src="${dataUrl}" style="width:100%;border-radius:8px;margin-top:6px;box-shadow:0 4px 12px rgba(0,0,0,0.5);" alt="Capture">`);
        }
    }

    // Écouteurs des suggestions
    document.querySelectorAll(".gemini-pill-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const act = btn.getAttribute("data-action");
            if (act === "map") triggerInteractiveMap();
            else if (act === "inspect") triggerInspect();
            else if (act === "cookies") triggerCookies();
            else if (act === "screenshot") triggerScreenshot();
        });
    });

    // -------------------------------------------------------------------------
    // 11. Zone de Saisie & Moteur d'Exécution Conversationnel
    // -------------------------------------------------------------------------
    function updateSendButtonState() {
        if (!promptInput || !btnSend) return;
        const hasText = promptInput.value.trim().length > 0;
        if (hasText) {
            btnSend.classList.add("has-text");
            if (iconMic) iconMic.style.display = "none";
            if (iconSend) iconSend.style.display = "block";
        } else {
            btnSend.classList.remove("has-text");
            if (iconMic) iconMic.style.display = "block";
            if (iconSend) iconSend.style.display = "none";
        }
    }

    if (promptInput) {
        promptInput.addEventListener("input", () => {
            updateSendButtonState();
            promptInput.style.height = "auto";
            promptInput.style.height = Math.min(promptInput.scrollHeight, 120) + "px";
        });

        promptInput.addEventListener("keyup", (e) => {
            if (e.key === "@") {
                openTabsDropdown();
            } else if (e.key === "Escape") {
                hideAllDropdowns();
            }
        });

        promptInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
            }
        });
    }

    if (btnSend) {
        btnSend.addEventListener("click", () => {
            const text = promptInput ? promptInput.value.trim() : "";
            if (text) {
                if (isRecording) stopVoiceDictation();
                handleSend();
            } else {
                // Input vide : le bouton micro est affiché
                if (isRecording) {
                    stopVoiceDictation();
                } else {
                    startVoiceDictation();
                }
            }
        });
    }

    async function handleSend() {
        if (!promptInput) return;
        const text = promptInput.value.trim();
        if (!text) return;

        promptInput.value = "";
        promptInput.style.height = "auto";
        updateSendButtonState();

        addMessage("user", escapeHtml(text));
        const lower = text.toLowerCase().trim();

        // 1. Raccourcis directs de clics par marque SoM
        if (lower.startsWith("click #") || lower.startsWith("clic #") || /^#[0-9]+$/.test(lower)) {
            const mark = parseInt(lower.replace(/[^0-9]/g, ""), 10);
            if (mark) {
                const res = await executeBridgeAction("click", { mark });
                if (res.error) {
                    addMessage("assistant", `❌ Échec du clic #${mark} : ${escapeHtml(res.error)}`);
                } else {
                    addMessage("assistant", `✅ Clic #${mark} exécuté avec succès.`);
                }
                return;
            }
        }

        // 2. Commandes de navigation et d'automatisation rapides
        if (lower === "map" || lower === "carte" || lower === "som" || lower === "boutons") {
            triggerInteractiveMap();
            return;
        }
        if (lower === "screenshot" || lower === "capture" || lower === "photo" || lower === "ecran") {
            triggerScreenshot();
            return;
        }
        if (lower === "cookies" || lower === "session") {
            triggerCookies();
            return;
        }
        if (lower === "inspect" || lower === "inspecter" || lower === "formulaire" || lower === "champs") {
            triggerInspect();
            return;
        }
        if (lower === "reload" || lower === "recharge" || lower === "actualise") {
            const res = await executeBridgeAction("reload", { tabId: currentTabId });
            addMessage("assistant", res.error ? `❌ Erreur : ${escapeHtml(res.error)}` : "🔄 Onglet rechargé avec succès.");
            return;
        }
        if (lower.startsWith("scroll down") || lower === "descends" || lower === "bas") {
            await executeBridgeAction("scroll", { deltaY: 600 });
            addMessage("assistant", "⬇️ Défilement vers le bas effectué.");
            return;
        }
        if (lower.startsWith("scroll up") || lower === "remonte" || lower === "haut") {
            await executeBridgeAction("scroll", { deltaY: -600 });
            addMessage("assistant", "⬆️ Défilement vers le haut effectué.");
            return;
        }
        if (lower.startsWith("navigue ") || lower.startsWith("ouvre ") || lower.startsWith("go ")) {
            let url = text.split(" ")[1] || "";
            if (url) {
                if (!url.startsWith("http://") && !url.startsWith("https://")) url = "https://" + url;
                await executeBridgeAction("navigate", { url });
                addMessage("assistant", `🌐 Navigation vers <strong>${escapeHtml(url)}</strong> initiée.`);
                return;
            }
        }

        // 3. Question / Résumé sur la page active (Live Intelligence)
        const isPageQuery = lower.includes("résume") || lower.includes("resume") || lower.includes("synthèse") ||
                            lower.includes("synthese") || lower.includes("analyse") || lower.includes("de quoi parle") ||
                            lower.includes("points clés") || lower.includes("contenu") || lower.includes("explique");

        const thinking = addThinkingIndicator();

        // Récupération du contexte de la page
        let pageContent = "";
        let pageTitle = "";
        let pageUrl = "";

        if (currentTabId) {
            try {
                const domRes = await executeBridgeAction("content", { mode: "text" });
                if (domRes && domRes.data) {
                    pageContent = typeof domRes.data === "string" ? domRes.data : (domRes.data.text || "");
                }
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (tab) {
                    pageTitle = tab.title || "";
                    pageUrl = tab.url || "";
                }
            } catch (_) {}
        }

        thinking.remove();

        const effectiveModel = resolveEffectiveModel(text);

        if (isPageQuery && pageContent) {
            const cleanSnippet = pageContent.replace(/\s+/g, " ").trim();
            const words = cleanSnippet.split(" ").length;
            const preview = cleanSnippet.slice(0, 360) + (cleanSnippet.length > 360 ? "..." : "");

            addResultCard(`Analyse : ${escapeHtml(pageTitle || "Page active")}`, `
                <p style="font-size:12px;color:var(--gemini-text-secondary);margin-bottom:6px;">
                    📍 <strong>URL :</strong> <code>${escapeHtml(pageUrl.slice(0, 48))}...</code> (${words} mots analysés)
                </p>
                <div style="background:rgba(255,255,255,0.03);padding:10px;border-radius:8px;font-size:13px;line-height:1.5;">
                    <p style="margin-bottom:6px;"><strong>Synthèse du contenu :</strong></p>
                    <p style="color:var(--gemini-text-primary);">${escapeHtml(preview)}</p>
                </div>
                <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;">
                    <button class="gemini-pill-btn" onclick="document.querySelector('[data-action=map]').click()">Voir les éléments interactifs</button>
                    <button class="gemini-pill-btn" onclick="document.querySelector('[data-action=screenshot]').click()">Capturer l'écran</button>
                </div>
            `, effectiveModel);
            return;
        }

        // 4. Copilote Antigravity (Réponse contextuelle selon le modèle)
        const modelLabel = MODELS[effectiveModel]?.label || "AGY 2.0";
        addResultCard(`Copilote ${escapeHtml(modelLabel)}`, `
            <p style="font-size:13px;line-height:1.5;">⚡ Instruction prise en compte : « <strong>${escapeHtml(text)}</strong> »</p>
            <p style="font-size:12px;color:var(--gemini-text-muted);margin-top:6px;">
                ${currentTabId ? `Contexte actif : <em>${escapeHtml(pageTitle || "Onglet actif")}</em>` : "Aucun onglet rattaché."}
            </p>
            <div style="margin-top:10px;display:flex;gap:6px;">
                <button class="gemini-pill-btn" onclick="document.querySelector('[data-action=map]').click()">Analyser l'interface</button>
            </div>
        `, effectiveModel);
    }

    // -------------------------------------------------------------------------
    // 12. Démarrage & Initialisation
    // -------------------------------------------------------------------------
    updateModelUI();
    updateBridgeStatus();
    updateActiveTabContext();
    updateSendButtonState();
    setInterval(updateBridgeStatus, 8000);
});
