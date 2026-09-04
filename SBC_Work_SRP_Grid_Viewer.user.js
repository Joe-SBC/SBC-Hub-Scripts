// ==UserScript==
// @name         SBC Work SRP Grid Viewer
// @namespace    https://hub.sbcwork.com/
// @version      3.1.1
// @description  Embeds the SRP grid viewer in the SBC Work client area and loads listings/orders from the authenticated API.
// @match        https://hub.sbcwork.com/*
// @updateURL    https://raw.githubusercontent.com/Joe-SBC/SBC-Hub-Scripts/main/SBC_Work_SRP_Grid_Viewer.user.js
// @downloadURL  https://raw.githubusercontent.com/Joe-SBC/SBC-Hub-Scripts/main/SBC_Work_SRP_Grid_Viewer.user.js
// @grant        GM_registerMenuCommand
// @run-at       document-start
// @noframes
// ==/UserScript==

(() => {
"use strict";

const VIEWER_HOST_ID = "tm-srp-grid-viewer-host";
const HIDDEN_MARKER = "data-tm-srp-hidden";
const VIEWER_HTML = "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n<title>SRP Grid Viewer</title>\n<style>\n    :root {\n        color-scheme: light dark;\n        --bg: #ffffff;\n        --panel: #ffffff;\n        --input-bg: #f4f4f5;\n        --border: #e4e4e7;\n        --text: #18181b;\n        --muted: #71717a;\n        --accent: #6a9a1e;\n        --accent-foreground: #ffffff;\n        --button-bg: #ffffff;\n        --button-hover: #f4f4f5;\n        --listing-bg: #ffffff;\n        --badge-bg: #f4f4f5;\n        --defined: #a1a1aa;\n        --listed: var(--accent);\n        --out: #d97706;\n        --mixed: #0d9488;\n    }\n\n    * { box-sizing: border-box; }\n\n    body {\n        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif;\n        background: var(--bg);\n        color: var(--text);\n        margin: 0;\n        padding: 20px;\n    }\n\n    h1, h2, h3 { margin-top: 0; }\n\n    .controls {\n        display: grid;\n        grid-template-columns: 1fr;\n        gap: 12px;\n        background: var(--panel);\n        border: 1px solid var(--border);\n        border-radius: 10px;\n        padding: 16px;\n        margin-bottom: 18px;\n    }\n\n    .control-row {\n        display: flex;\n        gap: 12px;\n        align-items: center;\n        flex-wrap: wrap;\n    }\n\n    .control-row label {\n        font-size: 14px;\n        color: var(--muted);\n    }\n\n    button {\n        background: var(--button-bg);\n        color: var(--text);\n        border: 1px solid var(--border);\n        border-radius: 8px;\n        padding: 10px 14px;\n        cursor: pointer;\n    }\n\n    button:hover { background: var(--button-hover); }\n\n    select {\n        background: var(--input-bg);\n        color: var(--text);\n        border: 1px solid var(--border);\n        border-radius: 8px;\n        padding: 10px 32px 10px 12px;\n        cursor: pointer;\n    }\n\n    .status {\n        font-size: 13px;\n        color: var(--muted);\n    }\n\n    .status.error-report {\n        white-space: pre-wrap;\n        line-height: 1.5;\n        padding: 12px;\n        border: 1px solid rgba(239, 68, 68, .55);\n        border-radius: 8px;\n        background: rgba(127, 29, 29, .18);\n        font-family: Consolas, monospace;\n    }\n\n    .legend {\n        display: flex;\n        gap: 16px;\n        flex-wrap: wrap;\n        margin-bottom: 20px;\n        font-size: 14px;\n    }\n\n    .legend-item {\n        display: flex;\n        align-items: center;\n        gap: 8px;\n    }\n\n    .swatch {\n        width: 18px;\n        height: 18px;\n        border: 1px solid #777;\n        border-radius: 4px;\n    }\n\n    .layout {\n        display: grid;\n        grid-template-columns: 1fr 440px;\n        gap: 24px;\n        align-items: start;\n    }\n\n    .left-panel { min-width: 0; }\n\n    .right-panel {\n        position: sticky;\n        top: 20px;\n        background: var(--panel);\n        border: 1px solid var(--border);\n        border-radius: 8px;\n        padding: 16px;\n        max-height: calc(100vh - 40px);\n        overflow: auto;\n    }\n\n    .summary {\n        margin-bottom: 18px;\n        color: var(--muted);\n        font-size: 14px;\n        line-height: 1.45;\n    }\n\n    #app {\n        display: flex;\n        flex-wrap: wrap;\n        gap: 28px;\n        align-items: flex-start;\n    }\n\n    .section {\n        margin-bottom: 0;\n        flex: 0 1 auto;\n        min-width: 0;\n        max-width: 100%;\n    }\n    .section-title { font-size: 20px; margin: 10px 0; }\n    .grid-wrap { overflow-x: auto; }\n\n    .grid {\n        display: grid;\n        gap: 2px;\n        background: var(--border);\n        padding: 5px;\n        width: fit-content;\n        border-radius: 6px;\n    }\n\n    .cell {\n        width: 52px;\n        height: 48px;\n        font-size: 10px;\n        display: flex;\n        flex-direction: column;\n        align-items: center;\n        justify-content: center;\n        border: none;\n        cursor: pointer;\n        color: #fff;\n        padding: 2px;\n        position: relative;\n    }\n\n    .cell:hover { outline: 2px solid #fff; z-index: 2; }\n    .valid { background: var(--defined); }\n    .listed { background: var(--listed); }\n    .out-of-stock { background: var(--out); color: #111; font-weight: bold; }\n    .mixed-stock { background: var(--mixed); }\n\n    .cell-pos { font-size: 10px; line-height: 1.1; }\n    .cell-count { font-size: 11px; font-weight: bold; margin-top: 2px; }\n    .cell-flag {\n        position: absolute;\n        bottom: 2px;\n        right: 4px;\n        font-size: 9px;\n        line-height: 1;\n        opacity: 0.95;\n    }\n\n    .selected { outline: 3px solid #fff !important; }\n    .details-title { font-size: 18px; }\n    .details-subtitle { color: var(--muted); font-size: 13px; margin-bottom: 14px; line-height: 1.4; }\n    .muted { color: var(--muted); }\n\n    .stats {\n        display: flex;\n        gap: 14px;\n        flex-wrap: wrap;\n        margin-bottom: 18px;\n        font-size: 14px;\n    }\n\n    .stat {\n        background: var(--panel);\n        border: 1px solid var(--border);\n        padding: 8px 12px;\n        border-radius: 6px;\n    }\n\n    .listing-list {\n        display: grid;\n        gap: 12px;\n    }\n\n    .listing-card {\n        border: 1px solid var(--border);\n        border-radius: 8px;\n        background: var(--listing-bg);\n        padding: 12px;\n    }\n\n    .listing-title {\n        font-size: 14px;\n        line-height: 1.35;\n        margin-bottom: 8px;\n    }\n\n    .listing-id {\n        color: var(--accent);\n        font-size: 13px;\n        margin-bottom: 6px;\n        word-break: break-word;\n    }\n\n    .badges {\n        display: flex;\n        flex-wrap: wrap;\n        gap: 8px;\n        margin-bottom: 10px;\n    }\n\n    .badge {\n        font-size: 12px;\n        padding: 4px 8px;\n        border-radius: 999px;\n        border: 1px solid var(--border);\n        background: var(--badge-bg);\n    }\n\n    .badge.oos {\n        background: rgba(217,119,6,.18);\n        border-color: rgba(217,119,6,.6);\n        color: #ffcb8a;\n    }\n\n    .badge.ok {\n        background: rgba(46,139,87,.2);\n        border-color: rgba(46,139,87,.6);\n        color: #9be0bc;\n    }\n\n    .meta {\n        display: grid;\n        grid-template-columns: repeat(2, minmax(0, 1fr));\n        gap: 8px 12px;\n        font-size: 12px;\n        color: var(--text);\n    }\n\n    .meta div { min-width: 0; }\n    .meta strong { display: block; color: var(--muted); margin-bottom: 2px; }\n\n    .order-card {\n        border-left: 3px solid var(--accent);\n    }\n\n    .note {\n        margin-top: 14px;\n        padding: 10px 12px;\n        border-radius: 8px;\n        border: 1px solid rgba(217,119,6,.5);\n        background: rgba(217,119,6,.12);\n        color: #ffcf98;\n        font-size: 13px;\n        line-height: 1.4;\n    }\n\n    @media (max-width: 1100px) {\n        .layout { grid-template-columns: 1fr; }\n        .right-panel { position: static; max-height: none; }\n    }\n\n.listing-id {\n    display: flex;\n    flex-wrap: wrap;\n    align-items: center;\n    gap: 7px;\n}\n\n.listing-id .link-separator {\n    color: var(--muted);\n}\n\n.listing-id a {\n    color: var(--accent);          /* brighter blue */\n    text-decoration: none;\n    font-weight: 500;\n}\n\n.listing-id a:hover {\n    color: color-mix(in srgb, var(--accent) 80%, white);          /* even brighter on hover */\n    text-decoration: underline;\n}\n\n/* Out of stock = very visible */\n.listing-id a.oos {\n    color: #ff5c5c;          /* bright red */\n    font-weight: 700;\n}\n\n.listing-id a.oos:hover {\n    color: #ff8080;\n}\n</style>\n</head>\n<body>\n<h1>SRP Grid Viewer</h1>\n\n<div class=\"controls\">\n    <div class=\"control-row\">\n        <label for=\"viewMode\">View</label>\n        <select id=\"viewMode\" aria-label=\"Select viewer dataset\">\n            <option value=\"listings\">Listed Items</option>\n            <option value=\"orders\">Orders</option>\n        </select>\n        <button id=\"refreshApiBtn\" type=\"button\">Refresh from API</button>\n    </div>\n    <div class=\"status\" id=\"jsonStatus\">Loading listing data from the API…</div>\n</div>\n\n<div class=\"legend\">\n    <div class=\"legend-item\"><span class=\"swatch\" style=\"background:#555\"></span>Defined Slot</div>\n    <div class=\"legend-item\"><span class=\"swatch\" style=\"background:#2e8b57\"></span>Listed / In Stock</div>\n    <div class=\"legend-item\"><span class=\"swatch\" style=\"background:#d97706\"></span>Listed / Out of Stock</div>\n    <div class=\"legend-item\"><span class=\"swatch\" style=\"background:#0ea5a4\"></span>Mixed Stock Status</div>\n</div>\n\n<div class=\"layout\">\n    <div class=\"left-panel\">\n        <div class=\"stats\" id=\"stats\"></div>\n        <div class=\"summary\" id=\"summary\"></div>\n        <div id=\"app\"></div>\n    </div>\n\n    <aside class=\"right-panel\">\n        <h2 class=\"details-title\" id=\"detailsTitle\">Select an SRP</h2>\n        <div class=\"details-subtitle\" id=\"detailsSubtitle\">Click any valid slot to view details.</div>\n        <div id=\"detailsBody\" class=\"muted\">No slot selected.</div>\n    </aside>\n</div>\n</body>\n</html>";

let viewerOpen = false;
let viewerHost = null;

function findMainClientArea() {
    return document.querySelector('main[data-slot="sidebar-inset"] > main')
        || document.querySelector('main[data-slot="sidebar-inset"] main.flex-1');
}

function hideNativeContent(mainArea, host) {
    for (const child of [...mainArea.children]) {
        if (child === host || child.hasAttribute(HIDDEN_MARKER)) continue;
        child.setAttribute(HIDDEN_MARKER, child.style.display || "__empty__");
        child.style.setProperty("display", "none", "important");
    }
}

function restoreNativeContent(mainArea) {
    for (const child of [...mainArea.querySelectorAll(`:scope > [${HIDDEN_MARKER}]`)]) {
        const previousDisplay = child.getAttribute(HIDDEN_MARKER);
        child.removeAttribute(HIDDEN_MARKER);
        if (previousDisplay === "__empty__") child.style.removeProperty("display");
        else child.style.display = previousDisplay;
    }
}

function closeViewer() {
    viewerOpen = false;
    const mainArea = viewerHost?.parentElement || findMainClientArea();
    if (mainArea) restoreNativeContent(mainArea);
    viewerHost?.remove();
    viewerHost = null;
}

function initializeViewerFrame(frame) {
    try {
        initializeViewer(frame.contentDocument);
    } catch (error) {
        console.error("SRP Grid Viewer initialization failed:", error);
        const message = frame.contentDocument?.createElement("pre");
        if (message) {
            message.style.cssText = "padding:20px;color:#fecaca;background:#111;white-space:pre-wrap";
            message.textContent = `Could not initialize SRP Grid Viewer: ${error.message}`;
            frame.contentDocument.body.replaceChildren(message);
        }
    }
}

function mountViewer() {
    const mainArea = findMainClientArea();
    if (!mainArea) return false;

    if (viewerHost?.isConnected && viewerHost.parentElement === mainArea) {
        hideNativeContent(mainArea, viewerHost);
        return true;
    }

    viewerHost?.remove();

    const host = document.createElement("section");
    host.id = VIEWER_HOST_ID;
    host.style.cssText = "width:100%;min-width:0;border:1px solid var(--border);border-radius:12px;overflow:hidden;background:var(--background);box-shadow:0 1px 3px rgba(0,0,0,.10)";

    const toolbar = document.createElement("div");
    toolbar.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 14px;background:var(--card);color:var(--foreground);border-bottom:1px solid var(--border);font:600 14px Inter,ui-sans-serif,system-ui,sans-serif";

    const title = document.createElement("span");
    title.textContent = "SRP Grid Viewer";

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.textContent = "Close Viewer";
    closeButton.style.cssText = "border:1px solid var(--border);border-radius:7px;padding:7px 11px;background:var(--secondary);color:var(--secondary-foreground);cursor:pointer";
    closeButton.addEventListener("click", closeViewer);

    const frame = document.createElement("iframe");
    frame.title = "SRP Grid Viewer";
    frame.style.cssText = "display:block;width:100%;height:calc(100vh - 155px);min-height:680px;border:0;background:var(--background)";
    frame.addEventListener("load", () => initializeViewerFrame(frame), { once: true });
    frame.srcdoc = VIEWER_HTML;

    toolbar.append(title, closeButton);
    host.append(toolbar, frame);
    mainArea.appendChild(host);
    viewerHost = host;
    hideNativeContent(mainArea, host);
    host.scrollIntoView({ block: "start" });
    return true;
}

function closeMegaMenu() {
    const expandedButtons = [...document.querySelectorAll('button[aria-expanded="true"]')];
    const menuToggle = expandedButtons.find(button =>
        /navigation menu/i.test(button.getAttribute("aria-label") || "")
        || button.querySelector("svg.lucide-menu")
    );
    if (menuToggle) menuToggle.click();
}

function openSrpGridViewer() {
    viewerOpen = true;
    if (!mountViewer()) {
        console.warn("SRP Grid Viewer could not find the Hub main client area.");
    }
}

if (typeof GM_registerMenuCommand === "function") {
    GM_registerMenuCommand("Open SRP Grid Viewer", openSrpGridViewer);
}

const MENU_ITEM_ID = "tm-srp-grid-menu-item";
    const SIDEBAR_ITEM_ID = "tm-srp-grid-sidebar-item";

    const createMenuItem = () => {
        const item = document.createElement("li");
        item.id = MENU_ITEM_ID;
        item.className = "group/item";

        const row = document.createElement("div");
        row.className = "flex items-center";

        const button = document.createElement("button");
        button.type = "button";
        button.className = "flex items-center gap-2.5 flex-1 px-2 py-[7px] rounded-md text-[13px] text-gray-700 hover:bg-[var(--sbc-green)]/8 hover:text-[var(--sbc-green)] transition-colors group min-h-[32px]";
        button.setAttribute("aria-label", "Open SRP Grid Viewer");
        button.title = "Open SRP Grid Viewer in the Hub client area";

        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("width", "24");
        svg.setAttribute("height", "24");
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("fill", "none");
        svg.setAttribute("stroke", "currentColor");
        svg.setAttribute("stroke-width", "2");
        svg.setAttribute("stroke-linecap", "round");
        svg.setAttribute("stroke-linejoin", "round");
        svg.setAttribute("class", "h-4 w-4 text-gray-400 group-hover:text-[var(--sbc-green)] transition-colors shrink-0");
        svg.setAttribute("aria-hidden", "true");

        for (const [x, y] of [[3, 3], [14, 3], [3, 14], [14, 14]]) {
            const square = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            square.setAttribute("x", x);
            square.setAttribute("y", y);
            square.setAttribute("width", "7");
            square.setAttribute("height", "7");
            square.setAttribute("rx", "1");
            svg.appendChild(square);
        }

        const label = document.createElement("span");
        label.className = "whitespace-nowrap";
        label.textContent = "SRP Grid Viewer";

        button.append(svg, label);
        button.addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();
            openSrpGridViewer();
            closeMegaMenu();
        });
        row.appendChild(button);
        item.appendChild(row);
        return item;
    };

    const injectMenuItem = () => {
        if (document.getElementById(MENU_ITEM_ID)) return;

        const menuRow = document.querySelector('[data-mega-menu-column-row="true"]')
            || document.querySelector('[role="region"][aria-label*="Mega menu"] > div');
        if (!menuRow) return;

        const headings = [...menuRow.querySelectorAll("h3")];
        const targetHeading = headings.find(h => h.textContent.trim() === "Sales & Outbound")
            || headings.find(h => h.textContent.trim() === "Inventory");
        const targetList = targetHeading?.parentElement?.querySelector("ul");
        if (!targetList) return;

        const item = createMenuItem();
        const ebayLabel = [...targetList.querySelectorAll("span")]
            .find(span => span.textContent.trim() === "eBay Lister");
        const ebayItem = ebayLabel?.closest("li");

        if (ebayItem) ebayItem.insertAdjacentElement("afterend", item);
        else targetList.appendChild(item);
    };

    const createSidebarItem = () => {
        const item = document.createElement("li");
        item.id = SIDEBAR_ITEM_ID;
        item.className = "group/menu-item relative";
        item.setAttribute("data-slot", "sidebar-menu-item");
        item.setAttribute("data-sidebar", "menu-item");

        const button = document.createElement("button");
        button.type = "button";
        button.className = "peer/menu-button flex w-full items-center gap-2 rounded-md p-2 text-left outline-hidden ring-sidebar-ring focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-data-[sidebar=menu-action]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! group-data-[collapsible=icon]:overflow-hidden [&>svg]:size-4 [&>svg]:shrink-0 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground h-10 min-h-[44px] transition-all font-normal text-[15px]";
        button.setAttribute("data-slot", "sidebar-menu-button");
        button.setAttribute("data-sidebar", "menu-button");
        button.setAttribute("data-size", "default");
        button.setAttribute("data-active", "false");
        button.setAttribute("data-state", "closed");
        button.setAttribute("aria-label", "Open SRP Grid Viewer");
        button.title = "Open SRP Grid Viewer in the Hub client area";

        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("width", "24");
        svg.setAttribute("height", "24");
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("fill", "none");
        svg.setAttribute("stroke", "currentColor");
        svg.setAttribute("stroke-width", "2");
        svg.setAttribute("stroke-linecap", "round");
        svg.setAttribute("stroke-linejoin", "round");
        svg.setAttribute("class", "lucide h-4 w-4");
        svg.setAttribute("aria-hidden", "true");

        for (const [x, y] of [[3, 3], [14, 3], [3, 14], [14, 14]]) {
            const square = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            square.setAttribute("x", x);
            square.setAttribute("y", y);
            square.setAttribute("width", "7");
            square.setAttribute("height", "7");
            square.setAttribute("rx", "1");
            svg.appendChild(square);
        }

        const label = document.createElement("span");
        label.className = "flex-1";
        label.textContent = "SRP Grid Viewer";

        button.append(svg, label);
        button.addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();
            openSrpGridViewer();
        });
        item.appendChild(button);
        return item;
    };

    const injectSidebarItem = () => {
        if (document.getElementById(SIDEBAR_ITEM_ID)) return;

        const groups = [...document.querySelectorAll('[data-sidebar="group"]')];
        const ebayGroup = groups.find(group => {
            const label = group.querySelector('[data-sidebar="group-label"]');
            return label?.textContent.trim() === "eBay Lister";
        });
        const targetList = ebayGroup?.querySelector('ul[data-sidebar="menu"]');
        if (!targetList) return;

        const item = createSidebarItem();
        const dashboardLabel = [...targetList.querySelectorAll("span")]
            .find(span => span.textContent.trim() === "Dashboard");
        const dashboardItem = dashboardLabel?.closest("li");

        if (dashboardItem) dashboardItem.insertAdjacentElement("afterend", item);
        else targetList.prepend(item);
    };

    const injectNavigationItems = () => {
        injectMenuItem();
        injectSidebarItem();
    };

    let injectionScheduled = false;
    const scheduleMenuInjection = () => {
        if (injectionScheduled) return;
        injectionScheduled = true;
        requestAnimationFrame(() => {
            injectionScheduled = false;
            injectNavigationItems();
            if (viewerOpen) mountViewer();
        });
    };

    const startMenuObserver = () => {
        injectNavigationItems();
        if (viewerOpen) mountViewer();
        const observer = new MutationObserver(scheduleMenuInjection);
        observer.observe(document.documentElement, { childList: true, subtree: true });
    };

    if (document.documentElement) startMenuObserver();
    else document.addEventListener("readystatechange", startMenuObserver, { once: true });
document.addEventListener("click", event => {
    if (!viewerOpen) return;
    const nativeNavigation = event.target.closest(
        '[data-sidebar="menu-button"], [data-mega-menu-column-row="true"] button'
    );
    if (!nativeNavigation) return;
    if (nativeNavigation.closest("#tm-srp-grid-menu-item, #tm-srp-grid-sidebar-item")) return;
    closeViewer();
}, true);

function initializeViewer(document) {
const definitions = [
    ["100","16-19","10-15"], ["101","15-19","10-15"], ["102","10,15-19","10-15"],
    ["103","10,13-19","10-15"], ["104","10,13-19","10-15"], ["105","10,13-19","10-15"],
    ["106","10,12-17","10-15"], ["109","10-17","10-15"], ["110","10-17","10-15"],
    ["111","10-17","10-15"], ["112","17,19","10-15"], ["113","13-19","10-15"],
    ["114","16-19","10-15"], ["115","16-19","10-15"], ["117","10-17","10-15"],
    ["118","10-17","10-15"], ["119","10-17","10-15"], ["120","10,12-17","10-15"],
    ["121","10-21","10-15"], ["122","10,13-21","10-15"], ["123","10-21","10-15"],
    ["124","18-21","10-15"], ["125","16-21","10-15"], ["127","10-17,21-22","10-15"],
    ["128","13-17,21-22","10-15"], ["129","13-17,21-22","10-15"], ["130","10-18","10-15"],
    ["131","10-20","10-15"], ["132","20","10-15"], ["133","10,15,19","10-15"],
    ["134","10,15","10-15"], ["135","10,15,18,20","10-15"], ["136","15","10-15"],
    ["137","15,20","10-15"], ["138","18","10-15"], ["139","15","10-15"],
    ["140","15,20","10-15"], ["141","15,20","10-15"], ["142","15","10-15"],
    ["143","15","10-15"], ["144","15,20","10-15"], ["145","16,19","10-15"],
    ["146","19","10-15"], ["147","15,19","10-15"], ["148","15,18,20","10-15"],
    ["149","15,20,25","10-15"], ["150","16,24","10-15"], ["151","16,24","10-15"],
    ["152","15,24","10-15"], ["153","15,24","10-15"], ["154","15,24","10-15"],
    ["156","15,20,25","10-15"], ["157","15,20,25","10-15"], ["158","10-15","10-24"],
    ["159","10-13","10-12"], ["160","10-13","10-12"]
];

let activeListings = new Map();
let activeOrders = new Map();
let loadedFileName = "";
let selectedCell = null;
let currentView = "listings";

const LISTINGS_API_URL = "https://hub.sbcwork.com/api/trpc/ebayLister.listings.list?batch=1&input={%220%22:{%22json%22:{%22search%22:null,%22teamMemberId%22:null,%22status%22:null,%22qualityGrade%22:null,%22priceEnding%22:null,%22limit%22:10000,%22offset%22:0},%22meta%22:{%22values%22:{%22search%22:[%22undefined%22],%22teamMemberId%22:[%22undefined%22],%22status%22:[%22undefined%22],%22qualityGrade%22:[%22undefined%22],%22priceEnding%22:[%22undefined%22]}}}}";
const ORDERS_API_URL = "https://hub.sbcwork.com/api/trpc/ebayLister.orders.list?batch=1&input={%220%22:{%22json%22:{%22limit%22:100,%22offset%22:0}}}";

function expand(rangeStr) {
    const result = new Set();
    rangeStr.split(",").forEach(part => {
        if (part.includes("-")) {
            const [start, end] = part.split("-").map(Number);
            for (let i = start; i <= end; i++) result.add(i);
        } else {
            result.add(Number(part));
        }
    });
    return [...result].sort((a, b) => a - b);
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

const HUB_LISTING_BASE_PATH = "/ebay-lister/listings/";

function buildHubListingUrl(internalId) {
    return `${window.location.origin}${HUB_LISTING_BASE_PATH}${encodeURIComponent(internalId)}`;
}

function renderListingLinks(item) {
    const links = [];
    if (item.InternalId) {
        links.push(`<a class="hub-link" href="${escapeHtml(buildHubListingUrl(item.InternalId))}" target="_blank" rel="noopener">Hub #${escapeHtml(item.InternalId)}</a>`);
    }
    if (item.ListingId) {
        links.push(`<a href="https://www.ebay.com/itm/${encodeURIComponent(item.ListingId)}" target="_blank" rel="noopener" class="${item.OutOfStock ? "oos" : ""}">eBay #${escapeHtml(item.ListingId)}</a>`);
    }
    return links.length ? links.join('<span class="link-separator">•</span>') : "No listing IDs";
}

function normalizeKeyString(key) {
    if (!key) return null;
    const input = String(key).trim();
    const match = input.match(/(\d+)-(\d+)-(\d+)([a-z]?)/i);
    if (!match) return null;
    return `${Number(match[1])}-${Number(match[2])}-${Number(match[3])}${(match[4] || "").toLowerCase()}`;
}

function baseKey(key) {
    return String(key || "").replace(/[a-z]$/i, "");
}

function normalizeListingData(item = {}) {
    const inventoryQuantityRaw = item.InventoryQuantity ?? item.inventoryQuantity;
    const listingQuantityRaw = item.ListingQuantity ?? item.quantity;
    const inventoryQuantity = inventoryQuantityRaw == null ? null : Number(inventoryQuantityRaw);
    const listingQuantity = listingQuantityRaw == null ? null : Number(listingQuantityRaw);
    const available = Number(item.AvailableQuantity ?? item.availableQuantity ?? inventoryQuantityRaw ?? listingQuantityRaw ?? 0);
    const sold = Number(item.SoldQuantity ?? item.soldQuantity ?? 0);
    const views = Number(item.Views ?? item.views ?? 0);
    const pending = Number(item.PendingOffers ?? item.pendingOffers ?? 0);
    const watch = Number(item.WatchCount ?? item.watchCount ?? 0);
    const questions = Number(item.Questions ?? item.questions ?? 0);

    let outOfStock;
    if (typeof item.OutOfStock === "boolean") {
        outOfStock = item.OutOfStock;
    } else if (typeof item.outOfStock === "boolean") {
        outOfStock = item.outOfStock;
    } else {
        outOfStock = available <= 0;
    }

    return {
        ListingId: item.ListingId ?? item.listingId ?? item.ebayItemId ?? "",
        InternalId: item.InternalId ?? item.internalId ?? item.id ?? "",
        Title: item.Title ?? item.title ?? "",
        SKU: item.SKU ?? item.sku ?? "",
        Price: item.Price ?? item.price ?? "",
        PurchaseOption: item.PurchaseOption ?? item.purchaseOption ?? item.publishStatus ?? "",
        AvailableQuantity: Number.isFinite(available) ? available : 0,
        InventoryQuantity: Number.isFinite(inventoryQuantity) ? inventoryQuantity : "",
        ListingQuantity: Number.isFinite(listingQuantity) ? listingQuantity : "",
        SoldQuantity: Number.isFinite(sold) ? sold : 0,
        Views: Number.isFinite(views) ? views : 0,
        PendingOffers: Number.isFinite(pending) ? pending : 0,
        WatchCount: Number.isFinite(watch) ? watch : 0,
        Questions: Number.isFinite(questions) ? questions : 0,
        StartDate: item.StartDate ?? item.startDate ?? item.createdAt ?? "",
        TimeRemaining: item.TimeRemaining ?? item.timeRemaining ?? item.updatedAt ?? "",
        SRP: normalizeKeyString(item.SRP ?? item.srp ?? item.warehouseLocation ?? "") || "",
        Status: item.Status ?? item.status ?? "",
        Condition: item.Condition ?? item.condition ?? "",
        Category: item.Category ?? item.category ?? "",
        PublishStatus: item.PublishStatus ?? item.publishStatus ?? "",
        QualityGrade: item.QualityGrade ?? item.qualityGrade ?? "",
        QualityScore: item.QualityScore ?? item.qualityScore ?? "",
        TeamMemberName: item.TeamMemberName ?? item.teamMemberName ?? "",
        OutOfStock: !!outOfStock
    };
}

function setStatus(message, isError = false) {
    const el = document.getElementById("jsonStatus");
    el.textContent = message;
    el.style.color = isError ? "#dc2626" : "var(--muted)";
    el.classList.toggle("error-report", isError);
}

function compactResponseBody(text, maxLength = 800) {
    const compact = String(text || "").replace(/\s+/g, " ").trim();
    if (!compact) return "(empty response body)";
    return compact.length > maxLength ? `${compact.slice(0, maxLength)}…` : compact;
}

async function buildFetchDiagnostic(error, apiUrl = LISTINGS_API_URL, apiLabel = "LISTINGS") {
    const endpoint = new URL(apiUrl);
    const pageOrigin = window.location.origin === "null" ? "null (local file)" : window.location.origin;
    const isCrossOrigin = window.location.origin !== endpoint.origin;
    const lines = [
        `${apiLabel} API LOAD FAILED`,
        `Browser error: ${error?.name || "Error"}: ${error?.message || String(error)}`,
        `Page: ${window.location.href}`,
        `Page origin: ${pageOrigin}`,
        `API origin: ${endpoint.origin}`,
        `Cross-origin request: ${isCrossOrigin ? "yes" : "no"}`,
        `Browser reports online: ${navigator.onLine ? "yes" : "no"}`
    ];

    if (!navigator.onLine) {
        lines.push("Likely cause: this device is offline.");
        return lines.join("\n");
    }

    if (error?.diagnosticType === "http") {
        lines.push(`HTTP status: ${error.status} ${error.statusText || ""}`.trim());
        lines.push(`Response content type: ${error.contentType || "not provided"}`);
        lines.push(`Response body: ${compactResponseBody(error.responseBody)}`);
        lines.push("Likely cause: the server returned an HTTP error. The response body above may contain the exact API or authentication problem.");
        return lines.join("\n");
    }

    if (error?.diagnosticType === "json") {
        lines.push(`HTTP status: ${error.status}`);
        lines.push(`Response content type: ${error.contentType || "not provided"}`);
        lines.push(`Response body: ${compactResponseBody(error.responseBody)}`);
        lines.push("Likely cause: the server responded, but the response was not valid JSON (often a sign-in page or proxy error page).");
        return lines.join("\n");
    }

    if (error?.diagnosticType === "format") {
        lines.push(`HTTP status: ${error.status}`);
        lines.push(`Response body: ${compactResponseBody(error.responseBody)}`);
        lines.push("Likely cause: the server returned JSON, but its structure did not match result.data.json.listings.");
        return lines.join("\n");
    }

    // A normal fetch() TypeError deliberately hides CORS response details.
    // A no-cors probe cannot read the response, but it can distinguish a
    // reachable server from many DNS, TLS, and network failures.
    try {
        await fetch(apiUrl, {
            method: "GET",
            mode: "no-cors",
            credentials: "include",
            cache: "no-store"
        });
        lines.push("Reachability probe: the endpoint was reachable, but its response was opaque to this page.");
        if (window.location.protocol === "file:") {
            lines.push("Most likely cause: CORS. This HTML is open as a file:// page, which gives it a null origin. The API must explicitly permit that origin, or the page must be served from an allowed web origin.");
        } else if (isCrossOrigin) {
            lines.push(`Most likely cause: CORS. The API must allow origin ${window.location.origin} and, because cookies are used, return Access-Control-Allow-Credentials: true.`);
        } else {
            lines.push("Likely cause: a browser privacy rule, extension, service worker, or authentication redirect blocked access to the response.");
        }
        lines.push("Also confirm that you are signed in to hub.sbcwork.com in this browser and that third-party cookie restrictions are not blocking its session cookie.");
    } catch (probeError) {
        lines.push(`Reachability probe failed: ${probeError?.name || "Error"}: ${probeError?.message || String(probeError)}`);
        lines.push("Likely causes: DNS/network failure, TLS/certificate error, browser or extension blocking, or the endpoint being unavailable.");
    }

    lines.push("Open the browser Developer Tools → Network tab for the browser's lowest-level request details.");
    return lines.join("\n");
}

function buildListingsMapFromObject(obj) {
    const map = new Map();
    for (const [rawKey, rawItems] of Object.entries(obj || {})) {
        const normalizedKey = normalizeKeyString(rawKey);
        if (!normalizedKey) continue;
        const items = Array.isArray(rawItems) ? rawItems.map(normalizeListingData) : [];
        const storageKey = baseKey(normalizedKey);
        if (!map.has(storageKey)) map.set(storageKey, []);
        map.get(storageKey).push(...items.map(item => ({ ...item, SRP: item.SRP || normalizedKey })));
    }
    return map;
}

function buildListingsMapFromArray(arr) {
    const map = new Map();
    for (const entry of arr || []) {
        const rawKey = entry?.Key?.Section !== undefined
            ? `${entry.Key.Section}-${entry.Key.Row}-${entry.Key.Column}${entry.Key.Suffix || ""}`
            : entry?.Key ?? entry?.key ?? entry?.SRP ?? entry?.srp;
        const normalizedKey = normalizeKeyString(rawKey);
        if (!normalizedKey) continue;

        const rawItems = entry?.Value ?? entry?.value ?? entry?.Listings ?? entry?.listings ?? [];
        const items = Array.isArray(rawItems) ? rawItems.map(normalizeListingData) : [];
        const storageKey = baseKey(normalizedKey);
        if (!map.has(storageKey)) map.set(storageKey, []);
        map.get(storageKey).push(...items.map(item => ({ ...item, SRP: item.SRP || normalizedKey })));
    }
    return map;
}

function extractTrpcListings(parsed) {
    const listings = parsed?.[0]?.result?.data?.json?.listings;
    return Array.isArray(listings) ? listings : null;
}

function buildListingsMapFromApiListings(listings) {
    const map = new Map();
    for (const rawItem of listings || []) {
        const item = normalizeListingData(rawItem);
        if (!item.SRP) continue;
        const storageKey = baseKey(item.SRP);
        if (!map.has(storageKey)) map.set(storageKey, []);
        map.get(storageKey).push(item);
    }
    return map;
}

function parseJsonDataToListingsMap(parsed) {
    const apiListings = extractTrpcListings(parsed);
    if (apiListings) return buildListingsMapFromApiListings(apiListings);

    if (Array.isArray(parsed)) return buildListingsMapFromArray(parsed);
    if (parsed && typeof parsed === "object") return buildListingsMapFromObject(parsed);

    throw new Error("Unsupported JSON format.");
}

function parseJsonToListingsMap(jsonText) {
    return parseJsonDataToListingsMap(JSON.parse(jsonText));
}

function extractTrpcOrders(parsed) {
    const orders = parsed?.[0]?.result?.data?.json?.orders;
    return Array.isArray(orders) ? orders : null;
}

function extractOrderLocation(rawSku = "") {
    const input = String(rawSku || "");
    const preferred = input.split("||").slice(1).join("||").trim();
    const match = (preferred || input).match(/(\d+-\d+-\d+[a-z]?)\b/i);
    return match ? normalizeKeyString(match[1]) : null;
}

function normalizeOrderData(order = {}) {
    const lineItems = Array.isArray(order.lineItems) ? order.lineItems : [];
    const unfulfilledLineItems = lineItems.filter(item =>
        String(item?.lineItemFulfillmentStatus || "").toUpperCase() !== "FULFILLED"
    );

    const mappedItems = unfulfilledLineItems.map(lineItem => {
        const srp = extractOrderLocation(lineItem?.sku);
        return {
            orderId: order.id ?? "",
            ebayOrderId: order.ebayOrderId ?? "",
            buyerUsername: order.buyerUsername ?? "",
            buyerName: order.buyerName ?? "",
            orderTotal: order.orderTotal ?? "",
            currency: order.currency ?? "",
            orderStatus: order.orderStatus ?? "",
            paymentStatus: order.paymentStatus ?? "",
            fulfillmentStatus: order.fulfillmentStatus ?? "",
            createdDate: order.createdDate ?? "",
            paidAt: order.paidAt ?? "",
            shippedAt: order.shippedAt ?? null,
            deliveredAt: order.deliveredAt ?? null,
            trackingNumber: order.trackingNumber ?? null,
            carrier: order.carrier ?? null,
            shippingAddress: order.shippingAddress ?? null,
            inventoryProcessedAt: order.inventoryProcessedAt ?? null,
            lineItemId: lineItem.lineItemId ?? "",
            legacyItemId: lineItem.legacyItemId ?? "",
            title: lineItem.title ?? "",
            sku: lineItem.sku ?? "",
            quantity: lineItem.quantity ?? 0,
            lineItemCost: lineItem.lineItemCost?.value ?? "",
            maxEstimatedDeliveryDate: lineItem.lineItemFulfillmentInstructions?.maxEstimatedDeliveryDate ?? "",
            minEstimatedDeliveryDate: lineItem.lineItemFulfillmentInstructions?.minEstimatedDeliveryDate ?? "",
            shipByDate: lineItem.lineItemFulfillmentInstructions?.shipByDate ?? "",
            lineItemFulfillmentStatus: lineItem.lineItemFulfillmentStatus ?? "",
            srp
        };
    });

    return { ...order, unfulfilledLineItems: mappedItems };
}

function buildOrdersMapFromApiOrders(orders) {
    const map = new Map();
    let unfulfilledOrderCount = 0;
    let unfulfilledLineItemCount = 0;

    for (const rawOrder of orders || []) {
        const normalized = normalizeOrderData(rawOrder);
        if (String(normalized.paymentStatus || "").toUpperCase() !== "PAID") continue;
        const mappedItems = normalized.unfulfilledLineItems.filter(item => item.srp);
        if (!mappedItems.length) continue;

        unfulfilledOrderCount++;
        for (const item of mappedItems) {
            const storageKey = baseKey(item.srp);
            if (!map.has(storageKey)) map.set(storageKey, []);
            map.get(storageKey).push({
                ...normalized,
                ...item,
                SRP: item.srp
            });
            unfulfilledLineItemCount++;
        }
    }

    return { map, unfulfilledOrderCount, unfulfilledLineItemCount };
}

function getActiveDataMap() {
    return currentView === "orders" ? activeOrders : activeListings;
}

function getSectionHasData(section, rowStr, colStr) {
    const activeMap = getActiveDataMap();
    const rows = expand(rowStr);
    const cols = expand(colStr);
    return rows.some(r => cols.some(c => activeMap.has(`${section}-${r}-${c}`)));
}

function formatDate(value) {
    if (!value) return "-";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

function formatCurrency(value, currency = "USD") {
    if (value === "" || value == null) return "-";
    const amount = Number(value);
    if (!Number.isFinite(amount)) return `${value} ${currency}`.trim();
    try {
        return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
    } catch {
        return `${currency} ${amount.toFixed(2)}`;
    }
}

function renderOrderDetails(item) {
    const address = item.shippingAddress?.contactAddress || {};
    const orderUrl = item.ebayOrderId
        ? `https://www.ebay.com/sh/ord/details?orderId=${encodeURIComponent(item.ebayOrderId)}`
        : "#";

    return `
        <div class="listing-card order-card">
            <div class="listing-id">
                <a href="${escapeHtml(orderUrl)}" target="_blank" rel="noopener">eBay Order #${escapeHtml(item.ebayOrderId || item.orderId)}</a>
                <span class="link-separator">•</span>
                <span>Hub Order #${escapeHtml(item.orderId)}</span>
            </div>
            <div class="listing-title">${escapeHtml(item.title || "Untitled order item")}</div>
            <div class="badges">
                <span class="badge ${String(item.paymentStatus).toUpperCase() === "PAID" ? "ok" : "oos"}">${escapeHtml(item.paymentStatus || "Payment unknown")}</span>
                <span class="badge oos">Unfulfilled</span>
                ${item.SRP ? `<span class="badge">SRP ${escapeHtml(item.SRP)}</span>` : ""}
                <span class="badge">Qty ${escapeHtml(item.quantity)}</span>
            </div>
            <div class="meta">
                <div><strong>Buyer</strong>${escapeHtml(item.buyerName || item.buyerUsername || "-")}</div>
                <div><strong>Username</strong>${escapeHtml(item.buyerUsername || "-")}</div>
                <div><strong>Order Total</strong>${escapeHtml(formatCurrency(item.orderTotal, item.currency))}</div>
                <div><strong>Line Item Cost</strong>${escapeHtml(formatCurrency(item.lineItemCost, item.currency))}</div>
                <div><strong>SKU</strong>${escapeHtml(item.sku || "-")}</div>
                <div><strong>Line Item Status</strong>${escapeHtml(item.lineItemFulfillmentStatus || item.fulfillmentStatus || "-")}</div>
                <div><strong>Ship By</strong>${escapeHtml(formatDate(item.shipByDate))}</div>
                <div><strong>Estimated Delivery</strong>${escapeHtml(item.minEstimatedDeliveryDate ? `${formatDate(item.minEstimatedDeliveryDate)} – ${formatDate(item.maxEstimatedDeliveryDate)}` : "-")}</div>
                <div><strong>Order Created</strong>${escapeHtml(formatDate(item.createdDate))}</div>
                <div><strong>Paid</strong>${escapeHtml(formatDate(item.paidAt))}</div>
                <div><strong>Ship To</strong>${escapeHtml(address.fullName || item.shippingAddress?.fullName || "-")}</div>
                <div><strong>Address</strong>${escapeHtml([address.addressLine1, address.city, address.stateOrProvince, address.postalCode].filter(Boolean).join(", ") || "-")}</div>
            </div>
            <div class="note">This order has an unfulfilled line item assigned to SRP ${escapeHtml(item.SRP || "unknown")}.</div>
        </div>
    `;
}

function getCellState(key, items) {
    const listedCount = items.length;
    const outCount = items.filter(x => x.OutOfStock).length;
    const inStockCount = listedCount - outCount;
    const hasOut = outCount > 0;
    const hasIn = inStockCount > 0;
    const needsManualCheck = hasOut;

    let className = "valid";
    let flag = "";

    if (hasIn && hasOut) {
        className = "mixed-stock";
        flag = "M";
    } else if (hasOut) {
        className = "out-of-stock";
        flag = "O";
    } else if (hasIn) {
        className = "listed";
    }

    return {
        className,
        flag,
        listedCount,
        outCount,
        inStockCount,
        needsManualCheck
    };
}

function buildStats() {
    const stats = document.getElementById("stats");
    const summary = document.getElementById("summary");

    if (currentView === "orders") {
        let totalOrders = 0;
        let totalLineItems = 0;
        for (const [, items] of activeOrders.entries()) {
            totalLineItems += items.length;
            totalOrders += new Set(items.map(item => item.orderId)).size;
        }

        stats.innerHTML = `
            <div class="stat">Sections Shown: <strong>${document.querySelectorAll(".section").length}</strong></div>
            <div class="stat">SRP Slots with Orders: <strong>${activeOrders.size}</strong></div>
            <div class="stat">Unfulfilled Line Items: <strong>${totalLineItems}</strong></div>
            <div class="stat">Unfulfilled Orders: <strong>${totalOrders}</strong></div>
        `;
        summary.textContent =
            "Orders view shows only sections containing PAID orders with unfulfilled line items. Orders are mapped to SRPs from the warehouse-location portion of each line-item SKU.";
        return;
    }

    let totalDefined = 0;
    let totalListedSlots = 0;
    let totalListings = 0;
    let totalOutOfStockListings = 0;
    let totalOutOfStockSlots = 0;
    let totalMixedSlots = 0;
    let totalManualChecks = 0;

    for (const [, rowStr, colStr] of definitions) {
        const rows = expand(rowStr);
        const cols = expand(colStr);
        totalDefined += rows.length * cols.length;
    }

    for (const [key, items] of activeListings.entries()) {
        const state = getCellState(key, items);
        totalListings += items.length;
        totalOutOfStockListings += state.outCount;
        totalListedSlots++;
        if (state.outCount > 0 && state.inStockCount === 0) totalOutOfStockSlots++;
        if (state.outCount > 0 && state.inStockCount > 0) totalMixedSlots++;
        if (state.needsManualCheck) totalManualChecks++;
    }

    stats.innerHTML = `
        <div class="stat">Defined Slots: <strong>${totalDefined}</strong></div>
        <div class="stat">Listed Slots: <strong>${totalListedSlots}</strong></div>
        <div class="stat">Total Listings: <strong>${totalListings}</strong></div>
        <div class="stat">Out-of-Stock Listings: <strong>${totalOutOfStockListings}</strong></div>
        <div class="stat">Out-of-Stock Slots: <strong>${totalOutOfStockSlots}</strong></div>
        <div class="stat">Mixed Slots: <strong>${totalMixedSlots}</strong></div>
        <div class="stat">Manual Checks: <strong>${totalManualChecks}</strong></div>
    `;

    summary.textContent =
        "Green bins have in-stock listings. Orange bins contain only out-of-stock listings and should be manually verified. Teal bins contain a mix of in-stock and out-of-stock listings.";
}
function showDetails(key, items) {
    const body = document.getElementById("detailsBody");
    document.getElementById("detailsTitle").textContent = key;

    if (currentView === "orders") {
        document.getElementById("detailsSubtitle").textContent =
            items.length ? `${items.length} paid + unfulfilled line item(s)` : "No paid + unfulfilled order data";
        if (!items.length) {
            body.innerHTML = `<div class="muted">No paid + unfulfilled order data loaded for this SRP.</div>`;
            return;
        }
        body.innerHTML = `<div class="listing-list">${items.map(renderOrderDetails).join("")}</div>`;
        return;
    }

    const state = getCellState(key, items);
    const subtitle = [];
    if (state.listedCount) subtitle.push(`${state.listedCount} listing(s)`);
    if (state.inStockCount) subtitle.push(`${state.inStockCount} in stock`);
    if (state.outCount) subtitle.push(`${state.outCount} out of stock`);
    if (state.needsManualCheck) subtitle.push("manual verification recommended");

    document.getElementById("detailsSubtitle").textContent = subtitle.length
        ? subtitle.join(" • ")
        : "Defined slot with no listing data";

    if (!items.length) {
        body.innerHTML = `<div class="muted">No listing data loaded for this SRP.</div>`;
        return;
    }

    body.innerHTML = `
        <div class="listing-list">
            ${items.map(item => `
                <div class="listing-card">
                    <div class="listing-id">
                        ${renderListingLinks(item)}
                    </div>
                    <div class="listing-title">${escapeHtml(item.Title || "Untitled listing")}</div>
                    <div class="badges">
                        <span class="badge ${item.OutOfStock ? "oos" : "ok"}">${item.OutOfStock ? "Out of stock" : "In stock"}</span>
                        ${item.SRP ? `<span class="badge">SRP ${escapeHtml(item.SRP)}</span>` : ""}
                        ${item.SKU ? `<span class="badge">SKU ${escapeHtml(item.SKU)}</span>` : ""}
                    </div>
                    <div class="meta">
                        <div><strong>Price</strong>${escapeHtml(item.Price || "-")}</div>
                        <div><strong>Publish Status</strong>${escapeHtml(item.PublishStatus || item.PurchaseOption || "-")}</div>
                        <div><strong>Hub Inventory Qty</strong>${escapeHtml(item.InventoryQuantity !== "" ? item.InventoryQuantity : "-")}</div>
                        <div><strong>Listing Qty (Hub)</strong>${escapeHtml(item.ListingQuantity !== "" ? item.ListingQuantity : "-")}</div>
                        <div><strong>Status</strong>${escapeHtml(item.Status || "-")}</div>
                        <div><strong>Condition</strong>${escapeHtml(item.Condition || "-")}</div>
                        <div><strong>Category</strong>${escapeHtml(item.Category || "-")}</div>
                        <div><strong>Quality</strong>${escapeHtml(item.QualityGrade || "-")}${item.QualityScore !== "" ? ` (${escapeHtml(item.QualityScore)})` : ""}</div>
                        <div><strong>Team Member</strong>${escapeHtml(item.TeamMemberName || "-")}</div>
                        <div><strong>Created</strong>${escapeHtml(item.StartDate || "-")}</div>
                        <div><strong>Updated</strong>${escapeHtml(item.TimeRemaining || "-")}</div>
                    </div>
                    ${item.OutOfStock ? `<div class="note">This listing is marked out of stock. Please manually verify the physical bin before considering the SRP clear.</div>` : ""}
                </div>
            `).join("")}
        </div>
    `;
}
function selectCell(btn) {
    if (selectedCell) selectedCell.classList.remove("selected");
    selectedCell = btn;
    selectedCell.classList.add("selected");
}

function render() {
    const app = document.getElementById("app");
    app.innerHTML = "";
    if (selectedCell) {
        selectedCell.classList.remove("selected");
        selectedCell = null;
    }

    const activeMap = getActiveDataMap();
    let renderedSectionCount = 0;

    definitions.forEach(([section, rowStr, colStr]) => {
        if (currentView === "orders" && !getSectionHasData(section, rowStr, colStr)) return;

        const rows = expand(rowStr);
        const cols = expand(colStr);

        const container = document.createElement("div");
        container.className = "section";

        const title = document.createElement("div");
        title.className = "section-title";
        title.textContent = `Section ${section}`;
        container.appendChild(title);

        const wrap = document.createElement("div");
        wrap.className = "grid-wrap";

        const grid = document.createElement("div");
        grid.className = "grid";
        grid.style.gridTemplateColumns = `repeat(${cols.length}, 52px)`;

        const displayRows = [...rows].sort((a, b) => b - a);

        displayRows.forEach(r => {
            cols.forEach(c => {
                const key = `${section}-${r}-${c}`;
                const items = activeMap.get(key) || [];
                const state = currentView === "orders"
                    ? { listedCount: items.length, inStockCount: items.length, outCount: 0, className: items.length ? "listed" : "valid", flag: items.length ? "O" : "", needsManualCheck: false }
                    : getCellState(key, items);

                const cell = document.createElement("button");
                cell.type = "button";
                cell.className = `cell ${state.className}`;
                cell.innerHTML = `
                    <div class="cell-pos">${r}-${c}</div>
                    <div class="cell-count">${state.listedCount ? state.listedCount : ""}</div>
                    <div class="cell-flag">${state.flag}</div>
                `;

                const titleParts = [key];
                if (currentView === "orders") {
                    if (state.listedCount) titleParts.push(`${state.listedCount} paid + unfulfilled line item(s)`);
                } else {
                    if (state.inStockCount) titleParts.push(`${state.inStockCount} in stock`);
                    if (state.outCount) titleParts.push(`${state.outCount} out of stock`);
                    if (state.needsManualCheck) titleParts.push("manual check");
                }
                cell.title = titleParts.join(" • ");

                cell.addEventListener("click", () => {
                    selectCell(cell);
                    showDetails(key, items);
                });

                grid.appendChild(cell);
            });
        });

        wrap.appendChild(grid);
        container.appendChild(wrap);
        app.appendChild(container);
        renderedSectionCount++;
    });

    if (currentView === "orders" && renderedSectionCount === 0) {
        app.innerHTML = `<div class="muted">No sections contain paid + unfulfilled orders mapped to an SRP.</div>`;
    }

    buildStats();
}
async function fetchJsonApi(apiUrl, apiLabel) {
    const response = await fetch(apiUrl, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
        headers: { "Accept": "application/json" }
    });
    const responseText = await response.text();
    const contentType = response.headers.get("content-type") || "";

    if (!response.ok) {
        const httpError = new Error(`The API returned HTTP ${response.status} ${response.statusText}`.trim());
        Object.assign(httpError, {
            diagnosticType: "http",
            status: response.status,
            statusText: response.statusText,
            contentType,
            responseBody: responseText
        });
        throw httpError;
    }

    try {
        return JSON.parse(responseText);
    } catch (parseError) {
        const jsonError = new Error(`The API response could not be parsed as JSON: ${parseError.message}`);
        Object.assign(jsonError, {
            diagnosticType: "json",
            status: response.status,
            contentType,
            responseBody: responseText
        });
        throw jsonError;
    }
}

async function loadListingsFromApi() {
    const refreshButton = document.getElementById("refreshApiBtn");
    refreshButton.disabled = true;
    setStatus("Loading listing data from the API…");

    try {
        const data = await fetchJsonApi(LISTINGS_API_URL, "LISTINGS");
        const listings = extractTrpcListings(data);
        if (!listings) {
            const formatError = new Error("The API response did not contain result.data.json.listings.");
            Object.assign(formatError, {
                diagnosticType: "format",
                status: 200,
                responseBody: JSON.stringify(data)
            });
            throw formatError;
        }

        activeListings = buildListingsMapFromApiListings(listings);
        loadedFileName = "SBC Work listings API";
        const mappedCount = [...activeListings.values()].reduce((sum, items) => sum + items.length, 0);
        const skippedCount = listings.length - mappedCount;
        setStatus(`Loaded ${listings.length} listing(s) from the API: ${mappedCount} mapped to ${activeListings.size} SRP slot(s)${skippedCount ? `; ${skippedCount} skipped because they have no valid warehouse location` : ""}.`);
        if (currentView === "listings") render();
    } catch (error) {
        console.error("Listing API load failed:", error);
        setStatus(await buildFetchDiagnostic(error, LISTINGS_API_URL, "LISTINGS"), true);
    } finally {
        refreshButton.disabled = false;
    }
}

async function loadOrdersFromApi() {
    const refreshButton = document.getElementById("refreshApiBtn");
    refreshButton.disabled = true;
    setStatus("Loading paid + unfulfilled orders from the API…");

    try {
        const data = await fetchJsonApi(ORDERS_API_URL, "ORDERS");
        const orders = extractTrpcOrders(data);
        if (!orders) {
            const formatError = new Error("The API response did not contain result.data.json.orders.");
            Object.assign(formatError, {
                diagnosticType: "format",
                status: 200,
                responseBody: JSON.stringify(data)
            });
            throw formatError;
        }

        const result = buildOrdersMapFromApiOrders(orders);
        activeOrders = result.map;
        loadedFileName = "SBC Work orders API";

        setStatus(`Loaded ${orders.length} order(s): ${result.unfulfilledOrderCount} PAID order(s) with ${result.unfulfilledLineItemCount} unfulfilled line item(s) mapped to ${activeOrders.size} SRP slot(s).`);
        if (currentView === "orders") render();
    } catch (error) {
        console.error("Orders API load failed:", error);
        setStatus(await buildFetchDiagnostic(error, ORDERS_API_URL, "ORDERS"), true);
    } finally {
        refreshButton.disabled = false;
    }
}

async function refreshCurrentView() {
    return currentView === "orders" ? loadOrdersFromApi() : loadListingsFromApi();
}

function setViewMode(view) {
    currentView = view === "orders" ? "orders" : "listings";
    document.getElementById("detailsTitle").textContent = currentView === "orders" ? "Select an Order SRP" : "Select an SRP";
    document.getElementById("detailsSubtitle").textContent =
        currentView === "orders" ? "Click an SRP with a paid + unfulfilled order to view order details." : "Click any valid slot to view details.";
    document.getElementById("detailsBody").innerHTML =
        currentView === "orders" ? `<div class="muted">No order slot selected.</div>` : `<div class="muted">No slot selected.</div>`;

    if (currentView === "orders") {
        render();
        if (!activeOrders.size) loadOrdersFromApi();
    } else {
        render();
        if (!activeListings.size) loadListingsFromApi();
    }
}



document.getElementById("refreshApiBtn").addEventListener("click", refreshCurrentView);
document.getElementById("viewMode").addEventListener("change", event => setViewMode(event.target.value));

render();
loadListingsFromApi();
}

})();
