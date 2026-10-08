const BRIDGE_WS_URL = "ws://127.0.0.1:9224";
let ws = null;
let reconnectTimeout = null;

function scheduleReconnect(delayMs = 2000) {
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
    reconnectTimeout = setTimeout(connectWS, delayMs);
}

function connectWS() {
    if (ws) {
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
            return;
        }
        try { ws.close(); } catch (_) {}
        ws = null;
    }

    try {
        ws = new WebSocket(BRIDGE_WS_URL);

        ws.onopen = () => {
            console.log("[Antigravity Offscreen] Connected to " + BRIDGE_WS_URL);
            if (reconnectTimeout) {
                clearTimeout(reconnectTimeout);
                reconnectTimeout = null;
            }
            ws.send(JSON.stringify({ event: "bridge_connected", timestamp: Date.now() }));
        };

        ws.onmessage = async (event) => {
            try {
                const request = JSON.parse(event.data);
                chrome.runtime.sendMessage({ target: "background", request }, (response) => {
                    const lastErr = chrome.runtime.lastError;
                    if (ws && ws.readyState === WebSocket.OPEN) {
                        const errMsg = response ? response.error : (lastErr ? lastErr.message : "No response from background");
                        ws.send(JSON.stringify({
                            requestId: request.requestId || request.id,
                            success: response ? !response.error : false,
                            data: response ? response.data : null,
                            error: errMsg
                        }));
                    }
                });
            } catch (err) {
                console.error("[Antigravity Offscreen] Error handling message:", err);
            }
        };

        ws.onclose = () => {
            ws = null;
            scheduleReconnect(2000);
        };

        ws.onerror = () => {
            // onclose will follow and trigger scheduleReconnect
        };
    } catch (e) {
        ws = null;
        scheduleReconnect(3000);
    }
}

connectWS();
// Health check guard every 10s to recover from suspended PC sleep states
setInterval(() => {
    if (!ws || ws.readyState === WebSocket.CLOSED) {
        connectWS();
    }
}, 10000);
