// content_game.js

let checkInterval = null;
let isChecking = false;

// --- ICONS ---
const ICON_BOOKMARK_EMPTY = `
<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M17 3H7C5.9 3 5 3.9 5 5V21L12 18L19 21V5C19 3.9 18.1 3 17 3Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const ICON_BOOKMARK_FILLED = `
<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M17 3H7C5.9 3 5 3.9 5 5V21L12 18L19 21V5C19 3.9 18.1 3 17 3Z" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

// --- HELPER: Get Valid Universe ID ---
function getUniverseId() {
    const meta = document.getElementById("game-detail-meta-data");
    if (meta) {
        const id = parseInt(meta.getAttribute('data-universe-id'));
        if (!isNaN(id) && id > 0) return id;
    }
    return null;
}

function injectSaveButton() {
    if (isChecking) return;
    isChecking = true;

    // 1. Prevent Duplicate Injection
    if (document.getElementById('my-custom-save-wrapper')) {
        isChecking = false;
        return;
    }

    const universeId = getUniverseId();
    if (!universeId) {
        isChecking = false;
        return;
    }

    // 2. FIND TARGET CONTAINER
    let targetContainer = document.getElementById('game-context-menu');

    if (!targetContainer) {
        const titleContainer = document.querySelector('.game-title-container');
        if (titleContainer) {
            // FIX: Ensure parent is relative so absolute positioning works inside it
            titleContainer.style.position = 'relative';

            // Create a fake container that mimics the native Roblox one
            targetContainer = document.createElement('div');
            targetContainer.id = 'my-custom-context-container'; 
            targetContainer.className = 'game-context-menu'; 
            
            // Custom styling for games you don't own (align right)
            targetContainer.style.position = 'absolute';
            targetContainer.style.right = '0px';
            targetContainer.style.top = '4%';
            targetContainer.style.display = 'flex';
            targetContainer.style.alignItems = 'center';
            
            titleContainer.appendChild(targetContainer);
        } else {
            // If title container isn't loaded yet, try again later
            isChecking = false;
            return;
        }
    }

    // 3. Create Wrapper for our Button
    const wrapper = document.createElement('div');
    wrapper.id = 'my-custom-save-wrapper';
    wrapper.style.position = 'relative'; 
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.alignItems = 'center';
    wrapper.style.width = '36px'; 
    wrapper.style.height = '36px';

    // 4. Create The Button
    const btn = document.createElement('div'); 
    btn.id = 'my-custom-bookmark-btn';
    btn.className = 'btn-generic-more-sm custom-context-btn'; 
    btn.innerHTML = ICON_BOOKMARK_EMPTY;
    btn.title = "Save to List";
    
    // 5. Click Handler
    btn.onclick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        toggleModal(wrapper, btn, universeId);
    };

    // 6. Insert into DOM (UPDATED LOGIC)
    wrapper.appendChild(btn);

    // Check if the native "..." button exists
    const existingMoreBtn = targetContainer.querySelector('.rbx-menu-item');

    if (existingMoreBtn) {
        // If "..." exists, place ours AFTER it (to the right)
        if (existingMoreBtn.nextSibling) {
            targetContainer.insertBefore(wrapper, existingMoreBtn.nextSibling);
        } else {
            targetContainer.appendChild(wrapper);
        }
    } else {
        // If "..." doesn't exist, just place ours at the start (or inside empty container)
        if (targetContainer.firstChild) {
            targetContainer.insertBefore(wrapper, targetContainer.firstChild);
        } else {
            targetContainer.appendChild(wrapper);
        }
    }

    // 7. Update Status
    updateButtonState(btn, universeId);
    
    // 8. Global Listener to Close Modal
    if (!window.hasCustomModalListener) {
        document.addEventListener('click', (e) => {
            const modal = document.getElementById('save-game-modal');
            const targetBtn = document.getElementById('my-custom-bookmark-btn');
            if (modal && !modal.contains(e.target) && (!targetBtn || !targetBtn.contains(e.target))) {
                modal.remove();
            }
        });
        window.hasCustomModalListener = true;
    }
    isChecking = false;
}

function updateButtonState(btn, universeId) {
    chrome.storage.local.get(['customLists'], (result) => {
        if (chrome.runtime.lastError) return; 

        const lists = result.customLists || {};
        let isSaved = false;
        for (let name in lists) {
            if (lists[name].includes(universeId)) {
                isSaved = true;
                break;
            }
        }
        
        if (isSaved) {
            btn.innerHTML = ICON_BOOKMARK_FILLED;
            btn.title = "Saved";
            btn.style.color = "#ffffffff"; 
        } else {
            btn.innerHTML = ICON_BOOKMARK_EMPTY;
            btn.title = "Add to List";
            btn.style.color = "white"; 
        }
    });
}

function toggleModal(wrapper, btn, universeId) {
    const existing = document.getElementById('save-game-modal');
    if (existing) {
        existing.remove();
        return;
    }

    const modal = document.createElement('div');
    modal.id = 'save-game-modal';
    modal.className = 'custom-save-modal';
    
    modal.style.position = 'absolute';
    modal.style.top = '100%'; 
    modal.style.marginTop = '8px'; 
    
    chrome.storage.local.get(['customLists'], (result) => {
        if (chrome.runtime.lastError) {
            console.error("Storage Error:", chrome.runtime.lastError);
            return;
        }

        let lists = result.customLists || { "Favorites": [] };
        
        const header = document.createElement('div');
        header.className = 'modal-header';
        header.innerText = 'Save to List';

        const listContainer = document.createElement('ul');
        listContainer.className = 'modal-list-container';

        Object.keys(lists).forEach(listName => {
            const row = document.createElement('li');
            row.className = 'modal-row';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = lists[listName].includes(universeId);
            
            const toggleState = () => {
                chrome.storage.local.get(['customLists'], (freshResult) => {
                    const freshLists = freshResult.customLists || {};
                    if (!freshLists[listName]) freshLists[listName] = [];

                    if (checkbox.checked) {
                        if (!freshLists[listName].includes(universeId)) {
                            freshLists[listName].push(universeId);
                        }
                    } else {
                        freshLists[listName] = freshLists[listName].filter(id => id !== universeId);
                    }

                    chrome.storage.local.set({ customLists: freshLists }, () => {
                        updateButtonState(btn, universeId);
                    });
                });
            };

            checkbox.onchange = toggleState;
            
            row.onclick = (e) => {
                if (e.target !== checkbox) {
                    checkbox.checked = !checkbox.checked;
                    toggleState();
                }
                e.stopPropagation();
            };

            const span = document.createElement('span');
            span.innerText = listName;
            
            row.appendChild(checkbox);
            row.appendChild(span);
            listContainer.appendChild(row);
        });

        const inputWrapper = document.createElement('div');
        inputWrapper.className = 'new-list-wrapper';

        const input = document.createElement('input');
        input.className = 'new-input-field input-field'; 
        input.placeholder = '+ Create new list';
        
        input.onkeydown = (e) => {
            if (e.key === 'Enter' && input.value.trim() !== "") {
                const newName = input.value.trim();
                chrome.storage.local.get(['customLists'], (freshResult) => {
                    const freshLists = freshResult.customLists || {};

                    if (!freshLists[newName]) {
                        freshLists[newName] = [universeId];
                        chrome.storage.local.set({ customLists: freshLists }, () => {
                            updateButtonState(btn, universeId);
                            modal.remove(); 
                            toggleModal(wrapper, btn, universeId); 
                        });
                    } else {
                        alert("List already exists!");
                    }
                });
            }
        };

        inputWrapper.appendChild(input);
        modal.appendChild(header);
        modal.appendChild(listContainer);
        modal.appendChild(inputWrapper);
        
        wrapper.appendChild(modal); 
    });
}

if (checkInterval) clearInterval(checkInterval);
checkInterval = setInterval(injectSaveButton, 1000); 
injectSaveButton();