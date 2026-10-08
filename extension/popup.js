document.addEventListener("DOMContentLoaded", async () => {
    if (window.location.search.includes("reload=true")) {
        try { chrome.runtime.reload(); } catch (_) {}
        setTimeout(() => window.close(), 300);
        return;
    }

    const statusBadge = document.getElementById("statusBadge");
    const statusDot = document.getElementById("statusDot");
    const statusText = document.getElementById("statusText");
    const btnTest = document.getElementById("btnTest");
    const output = document.getElementById("output");

    function updateStatus(connected, text) {
        if (!statusBadge || !statusDot || !statusText) return;
        statusText.innerText = text;
        if (connected) {
            statusBadge.style.background = "rgba(16, 185, 129, 0.15)";
            statusBadge.style.color = "#34d399";
            statusBadge.style.border = "1px solid rgba(16, 185, 129, 0.3)";
            statusDot.style.background = "#10b981";
        } else {
            statusBadge.style.background = "rgba(239, 68, 68, 0.15)";
            statusBadge.style.color = "#f87171";
            statusBadge.style.border = "1px solid rgba(239, 68, 68, 0.3)";
            statusDot.style.background = "#ef4444";
        }
    }

    try {
        if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
            chrome.runtime.sendMessage({ target: "background", getStatus: true }, (res) => {
                if (chrome.runtime.lastError || !res) {
                    updateStatus(false, "En attente");
                    return;
                }
                if (res.connected) {
                    updateStatus(true, "Actif & Connecté");
                } else {
                    updateStatus(false, "Pont déconnecté");
                }
            });
        }
    } catch (_) {
        updateStatus(false, "Non connecté");
    }

    if (btnTest && output) {
        btnTest.addEventListener("click", async () => {
            output.innerText = "Inspection de l'onglet...";
            try {
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (!tab) {
                    output.innerText = "Aucun onglet actif détecté.";
                    return;
                }
                output.innerText = `Onglet #${tab.id} : ${tab.title.slice(0, 40)}... (${tab.url.slice(0, 35)}...)`;
            } catch (e) {
                output.innerText = "Erreur : " + e.message;
            }
        });
    }
});
