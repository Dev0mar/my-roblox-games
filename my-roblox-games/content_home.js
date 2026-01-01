// ================== STATE ==================
let currentList = null;
let myRow = null;
let enforcerObserver = null;

// ================== INIT ==================
(async function init() {
    const result = await chrome.storage.local.get(["customLists", "lastSelectedList"]);
    const lists = result.customLists || {};

    currentList = (result.lastSelectedList && lists[result.lastSelectedList]) 
        ? result.lastSelectedList 
        : Object.keys(lists)[0] || null;

    startEnforcer();
})();

// ================== THE ENFORCER ==================
function startEnforcer() {
    if (enforcerObserver) enforcerObserver.disconnect();

    enforcerObserver = new MutationObserver(() => {
        const friendContainer = document.querySelector('.friend-carousel-container');
        if (!friendContainer) return;

        if (!myRow) {
            myRow = createRow();
        }

        if (friendContainer.nextElementSibling !== myRow) {
            friendContainer.insertAdjacentElement('afterend', myRow);
        }
    });

    const target = document.querySelector('.game-home-page-container') || document.body;
    enforcerObserver.observe(target, { childList: true, subtree: true });
}

// ================== UI BUILDER ==================
function createRow() {
    const row = document.createElement("div");
    row.id = "my-custom-game-row";
    row.className = "game-sort-carousel-wrapper"; 
    row.style.marginBottom = "6px"; 
    row.style.minHeight = "auto"; 

    // Header
    const headerContainer = document.createElement("div");
    headerContainer.className = "home-sort-header-container";
    headerContainer.style.marginBottom = "8px"; 
    headerContainer.style.display = "flex";
    headerContainer.style.alignItems = "center";
    headerContainer.style.justifyContent = "space-between"; 
    headerContainer.style.gap = "12px";

    const title = document.createElement("h2");
    title.textContent = "My Lists";
    title.style.fontSize = "20px";
    title.style.fontWeight = "700";
    title.style.color = "white";
    title.style.margin = "0";
    title.style.lineHeight = "1";

    const controlsDiv = document.createElement("div");
    controlsDiv.style.display = "flex";
    controlsDiv.style.alignItems = "center";
    controlsDiv.style.gap = "10px";

    const select = document.createElement("select");
    select.className = "custom-list-select"; 

    // Scroll Container
    const scrollWindow = document.createElement("div");
    scrollWindow.className = "horizontal-scroller games-list home-page-games-list"; 
    scrollWindow.style.overflowX = "auto"; 
    scrollWindow.style.overflowY = "hidden";
    scrollWindow.style.paddingBottom = "8px"; 
    scrollWindow.style.display = "flex";
    scrollWindow.style.width = "100%";

    const grid = document.createElement("ul");
    grid.className = "hlist games game-cards game-tile-list home-page-carousel";
    grid.style.display = "flex";
    grid.style.flexWrap = "nowrap"; 
    grid.style.gap = "12px"; 
    grid.style.paddingLeft = "0";
    grid.style.marginLeft = "0";
    grid.style.width = "max-content"; 

    // Create Buttons
    const addBtn = createHeaderAddButton(select, grid);
    const delBtn = createHeaderRemoveButton(select, grid); // New Delete Button

    controlsDiv.appendChild(select);
    controlsDiv.appendChild(addBtn);
    controlsDiv.appendChild(delBtn); // Append Delete Button
    
    headerContainer.appendChild(title);
    headerContainer.appendChild(controlsDiv);
    scrollWindow.appendChild(grid);
    row.appendChild(headerContainer);
    row.appendChild(scrollWindow);

    populateSelectAndGrid(select, grid);

    select.onchange = e => {
        currentList = e.target.value;
        chrome.storage.local.set({ lastSelectedList: currentList });
        updateGrid(currentList, grid);
    };

    return row;
}

// ================== UI COMPONENTS ==================
function createHeaderAddButton(selectElement, gridElement) {
    const btn = document.createElement("button");
    btn.textContent = "+ New";
    btn.title = "Create a new list";
    btn.style.cssText = `
        background-color: #232527;
        color: white;
        border: 1px solid #656668;
        border-radius: 4px;
        padding: 0 12px;
        font-family: 'Gotham', sans-serif;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        height: 30px;
        white-space: nowrap;
        transition: background-color 0.2s;
    `;

    btn.onmouseenter = () => { btn.style.backgroundColor = "#393b3d"; btn.style.borderColor = "white"; };
    btn.onmouseleave = () => { btn.style.backgroundColor = "#232527"; btn.style.borderColor = "#656668"; };

    btn.onclick = (e) => {
        e.preventDefault();
        const newName = prompt("Enter a name for your new list:");
        if (newName && newName.trim() !== "") {
            const cleanName = newName.trim();
            chrome.storage.local.get(['customLists'], result => {
                const lists = result.customLists || {};
                if (lists[cleanName]) {
                    alert("A list with this name already exists!");
                    return;
                }
                lists[cleanName] = [];
                currentList = cleanName;
                chrome.storage.local.set({ customLists: lists, lastSelectedList: currentList }, () => {
                    populateSelectAndGrid(selectElement, gridElement);
                });
            });
        }
    };
    return btn;
}

function createHeaderRemoveButton(selectElement, gridElement) {
    const btn = document.createElement("button");
    btn.textContent = "- Delete";
    btn.title = "Delete current list";
    btn.style.cssText = `
        background-color: #232527;
        color: #ff4d4d; /* Red text for warning */
        border: 1px solid #656668;
        border-radius: 4px;
        padding: 0 12px;
        font-family: 'Gotham', sans-serif;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        height: 30px;
        white-space: nowrap;
        transition: background-color 0.2s;
    `;

    btn.onmouseenter = () => { btn.style.backgroundColor = "#393b3d"; btn.style.borderColor = "#ff4d4d"; };
    btn.onmouseleave = () => { btn.style.backgroundColor = "#232527"; btn.style.borderColor = "#656668"; };

    btn.onclick = (e) => {
        e.preventDefault();
        
        chrome.storage.local.get(['customLists', 'lastSelectedList'], result => {
            const lists = result.customLists || {};
            // currentList global variable is synced, but let's check storage to be safe
            const selected = result.lastSelectedList || currentList;

            if (!selected || !lists[selected]) {
                alert("No list selected to delete.");
                return;
            }

            if (confirm(`Are you sure you want to delete "${selected}"? This cannot be undone.`)) {
                delete lists[selected];
                
                // Select a new default list
                const keys = Object.keys(lists);
                const nextList = keys.length > 0 ? keys[0] : null;
                currentList = nextList;

                // Save new state
                chrome.storage.local.set({ customLists: lists, lastSelectedList: nextList }, () => {
                    populateSelectAndGrid(selectElement, gridElement);
                });
            }
        });
    };
    return btn;
}

function populateSelectAndGrid(select, grid) {
    chrome.storage.local.get(["customLists"], res => {
        const lists = res.customLists || {};
        select.innerHTML = "";
        
        const keys = Object.keys(lists);
        if (keys.length === 0) {
            const opt = document.createElement("option");
            opt.textContent = "No Lists";
            select.appendChild(opt);
            grid.innerHTML = `<li style="color:#bdbebe; font-size:14px; padding:10px; white-space:nowrap;">No lists found. Click "+ New" to start!</li>`;
            return;
        }

        keys.forEach(name => {
            const opt = document.createElement("option");
            opt.value = name;
            opt.textContent = name;
            if (name === currentList) opt.selected = true;
            select.appendChild(opt);
        });

        // Ensure currentList is valid
        if (!currentList || !lists[currentList]) currentList = keys[0];
        updateGrid(currentList, grid);
    });
}

// ================== ROBUST DATA FETCHING ==================
async function updateGrid(listName, container) {
    container.innerHTML = `<li style="color:#bdbebe; font-size:14px; padding:10px; white-space:nowrap;">Loading games...</li>`;

    chrome.storage.local.get(["customLists"], async res => {
        const rawIds = res.customLists?.[listName] || [];
        const ids = rawIds.filter(id => id !== null && !isNaN(Number(id)));

        if (ids.length === 0) {
            container.innerHTML = `<li style="color:#bdbebe; font-size:14px; padding:10px; white-space:nowrap;">No games in this list yet.</li>`;
            return;
        }

        const idString = ids.join(",");
        const fetchOpts = { credentials: 'include', cache: 'no-store' };

        try {
            // 1. Fetch Universe Data
            let response = await fetch(`https://games.roblox.com/v1/games?universeIds=${idString}`, fetchOpts);
            let data = await response.json();
            let games = data.data || [];

            // 2. Fallback for Place IDs
            if (games.length === 0) {
                const placeResponse = await fetch(`https://games.roblox.com/v1/games/multiget-place-details?placeIds=${idString}`, fetchOpts);
                const placeData = await placeResponse.json();
                
                if (placeData && Array.isArray(placeData) && placeData.length > 0) {
                    const recoveredUniverseIds = placeData.map(p => p.universeId);
                    const recoveredString = recoveredUniverseIds.join(",");
                    // Re-fetch using corrected Universe IDs to get stats
                    const retryResponse = await fetch(`https://games.roblox.com/v1/games?universeIds=${recoveredString}`, fetchOpts);
                    const retryData = await retryResponse.json();
                    games = retryData.data || [];
                }
            }

            if (games.length === 0) {
                container.innerHTML = `<li style="color:#ff4d4d; font-size:14px; padding:10px; white-space:nowrap;">API returned no data. Are the IDs valid?</li>`;
                return;
            }

            // 3. Fetch Thumbnails
            const universeIds = games.map(g => g.id).join(",");
            const thumbResp = await fetch(`https://thumbnails.roblox.com/v1/games/icons?universeIds=${universeIds}&returnPolicy=PlaceHolder&size=150x150&format=Png&isCircular=false`, fetchOpts);
            const thumbJson = await thumbResp.json();
            
            const thumbMap = {};
            if (thumbJson.data) {
                thumbJson.data.forEach(t => { thumbMap[t.targetId] = t.imageUrl; });
            }

            // 4. Render
            container.innerHTML = "";
            games.forEach(game => {
                container.appendChild(createGameTile(game, thumbMap[game.id], listName));
            });

        } catch (e) {
            console.error("[MyLists] Fetch Error:", e);
            container.innerHTML = `<li style="color:#ff4d4d; font-size:14px; padding:10px; white-space:nowrap;">Failed to load. Check Console.</li>`;
        }
    });
}

function createGameTile(game, thumb, listName) {
    const li = document.createElement("li");
    li.className = "list-item game-card game-tile";
    
    li.style.cssText = `
        position: relative;
        width: 150px;
        min-width: 150px;
        flex: 0 0 auto;
        display: block;
        cursor: pointer;
    `;

    // 1. Format Player Count (e.g., 21.5K)
    const kFormatter = (num) => {
        if (!num) return '-';
        if (num < 1000) return num;
        if (num > 999 && num < 1000000) return (num/1000).toFixed(1) + 'K'; // Uppercase K matches Roblox
        if (num > 1000000) return (num/1000000).toFixed(1) + 'M';
        return num;
    };

    li.innerHTML = `
        <div class="game-card-container" data-testid="game-tile">
            <a class="game-card-link" href="https://www.roblox.com/games/${game.rootPlaceId}">
                <span class="thumbnail-2d-container game-card-thumb-container">
                    <img class="" src="${thumb || ''}" alt="${game.name}" title="${game.name}">
                </span>
                <div class="game-card-name game-name-title" title="${game.name}">
                    ${game.name}
                </div>
                <div class="game-card-info" data-testid="game-tile-stats">
                    <span class="info-label icon-playing-counts-gray"></span>
                    <span class="info-label playing-counts-label">${kFormatter(game.playing)}</span>
                </div>
            </a>
        </div>
    `;

    const removeBtn = document.createElement('div');
    removeBtn.className = 'custom-remove-btn';
    removeBtn.textContent = '×';
    removeBtn.title = "Remove from list";

    removeBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if(!confirm(`Remove "${game.name}" from ${listName}?`)) return;

        chrome.storage.local.get(['customLists'], result => {
            const lists = result.customLists;
            if (lists[listName]) {
                lists[listName] = lists[listName].filter(id => id !== game.id && id !== game.rootPlaceId);
                chrome.storage.local.set({ customLists: lists }, () => li.remove());
            }
        });
    };

    li.appendChild(removeBtn);
    return li;
}