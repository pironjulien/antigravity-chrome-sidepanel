/**
 * Antigravity Visual Feedback & Set-of-Mark (SoM) Grounding Overlay
 * Manifest V3 Content Script for NexusAGY Browser Bridge (v1.9.0)
 */

// 0. Proactive Background Service Worker Wakeup on Page Load (Top window only)
try {
    if (window === window.top && typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
        chrome.runtime.sendMessage({ target: "background", ping: true }, () => {
            if (chrome.runtime.lastError) {}
        });
    }
} catch (_) {}

// 1. Visual Click Ripple (Laser feedback)
window.addEventListener("__antigravity_visual_click", (e) => {
    const detail = e.detail || {};
    const x = detail.x;
    const y = detail.y;
    if (x === undefined || y === undefined) return;

    const ripple = document.createElement("div");
    ripple.style.position = "fixed";
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    ripple.style.width = "24px";
    ripple.style.height = "24px";
    ripple.style.borderRadius = "50%";
    ripple.style.transform = "translate(-50%, -50%) scale(0.4)";
    ripple.style.backgroundColor = "rgba(6, 182, 212, 0.7)";
    ripple.style.border = "2px solid #38bdf8";
    ripple.style.boxShadow = "0 0 18px #38bdf8, 0 0 36px #6366f1";
    ripple.style.pointerEvents = "none";
    ripple.style.zIndex = "2147483647";
    ripple.style.transition = "transform 0.4s cubic-bezier(0.1, 0.8, 0.3, 1), opacity 0.4s ease-out";

    document.documentElement.appendChild(ripple);

    requestAnimationFrame(() => {
        ripple.style.transform = "translate(-50%, -50%) scale(3.2)";
        ripple.style.opacity = "0";
    });

    setTimeout(() => {
        if (ripple.parentNode) ripple.parentNode.removeChild(ripple);
    }, 450);
});

// 2. Set-of-Mark (SoM) Visual Markers Overlay for Gemini Vision (Recursive Shadow DOM support)
window.__antigravity_som_elements = new Map();

window.addEventListener("__antigravity_render_som", (e) => {
    document.querySelectorAll(".__antigravity_som_marker").forEach(m => {
        if (m && typeof m.remove === "function") m.remove();
        else if (m?.parentNode) m.parentNode.removeChild(m);
    });
    window.__antigravity_som_elements.clear();

    const selector = "button, a, input, select, textarea, [role='button'], [role='link'], [role='tab'], [role='checkbox'], [role='menuitem'], [onclick], [tabindex]";

    function collectCandidates(root, list = []) {
        if (!root || !root.querySelectorAll) return list;
        try {
            const found = Array.from(root.querySelectorAll(selector));
            for (const el of found) list.push(el);
            const all = root.querySelectorAll("*");
            for (const el of all) {
                if (el.shadowRoot) {
                    collectCandidates(el.shadowRoot, list);
                }
            }
        } catch(err) {}
        return list;
    }

    const candidates = collectCandidates(document);
    let markerId = 1;

    for (const el of candidates) {
        if (markerId > 80) break;
        const rect = el.getBoundingClientRect();
        if (rect.width > 8 && rect.height > 8 && rect.bottom > 0 && rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth) {
            let style = null;
            try { style = window.getComputedStyle ? window.getComputedStyle(el) : null; } catch(_) {}
            if (style && (style.display === "none" || style.visibility === "hidden" || style.opacity === "0")) continue;

            const badge = document.createElement("div");
            badge.className = "__antigravity_som_marker";
            badge.innerText = String(markerId);
            badge.style.position = "fixed";
            badge.style.left = `${Math.max(0, rect.left)}px`;
            badge.style.top = `${Math.max(0, rect.top)}px`;
            badge.style.backgroundColor = "#ff0055";
            badge.style.color = "#ffffff";
            badge.style.fontSize = "11px";
            badge.style.fontWeight = "bold";
            badge.style.padding = "1px 5px";
            badge.style.borderRadius = "3px";
            badge.style.border = "1px solid #ffffff";
            badge.style.boxShadow = "0 2px 5px rgba(0,0,0,0.6)";
            badge.style.zIndex = "2147483646";
            badge.style.pointerEvents = "none";
            badge.style.fontFamily = "monospace";

            document.documentElement.appendChild(badge);
            window.__antigravity_som_elements.set(markerId, el);
            markerId++;
        }
    }
});

window.addEventListener("__antigravity_clear_som", () => {
    document.querySelectorAll(".__antigravity_som_marker").forEach(m => {
        if (m && typeof m.remove === "function") m.remove();
        else if (m?.parentNode) m.parentNode.removeChild(m);
    });
    if (window.__antigravity_som_elements) {
        window.__antigravity_som_elements.clear();
    }
});
