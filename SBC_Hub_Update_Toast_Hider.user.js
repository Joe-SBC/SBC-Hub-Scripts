// ==UserScript==
// @name         SBC Hub Update Toast Hider
// @namespace    https://hub.sbcwork.com/
// @version      1.0.2
// @description  Removes the "A new version of SBC Hub is available" Sonner notification without affecting other Hub toasts.
// @match        https://hub.sbcwork.com/*
// @run-at       document-start
// @noframes
// @updateURL    https://raw.githubusercontent.com/Joe-SBC/SBC-Hub-Scripts/main/SBC_Hub_Update_Toast_Hider.user.js
// @downloadURL  https://raw.githubusercontent.com/Joe-SBC/SBC-Hub-Scripts/main/SBC_Hub_Update_Toast_Hider.user.js
// ==/UserScript==

(() => {
    "use strict";

    const UPDATE_TITLE = "A new version of SBC Hub is available.";
    const UPDATE_DESCRIPTION_FRAGMENT = "Reload to get the latest features and fixes.";

    function isHubUpdateToast(element) {
        if (!(element instanceof Element)) return false;

        const toast = element.matches('li[data-sonner-toast]')
            ? element
            : element.closest?.('li[data-sonner-toast]');

        if (!toast) return false;

        const title = toast.querySelector('[data-title]')?.textContent?.trim() || "";
        const description = toast.querySelector('[data-description]')?.textContent?.trim() || "";

        return title === UPDATE_TITLE
            || (title.includes("new version of SBC Hub") && description.includes(UPDATE_DESCRIPTION_FRAGMENT));
    }

    function removeHubUpdateToast(root = document) {
        if (!root) return;

        if (root instanceof Element && isHubUpdateToast(root)) {
            root.closest('li[data-sonner-toast]')?.remove();
            return;
        }

        const scope = root.querySelectorAll ? root : document;
        for (const toast of scope.querySelectorAll('li[data-sonner-toast]')) {
            if (isHubUpdateToast(toast)) toast.remove();
        }
    }

    function startObserver() {
        removeHubUpdateToast(document);

        const observer = new MutationObserver(mutations => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (!(node instanceof Element)) continue;
                    removeHubUpdateToast(node);
                }
            }
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });
    }

    if (document.documentElement) {
        startObserver();
    } else {
        document.addEventListener("readystatechange", () => {
            if (document.documentElement) startObserver();
        }, { once: true });
    }
})();
