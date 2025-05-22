chrome.runtime.onInstalled.addListener(function (details) {
  if(details.reason === "install" || details.reason === "update"){
    chrome.storage.sync.set({ "active": true });
    chrome.storage.sync.set({ "level": 1 });
    chrome.storage.sync.set({ "timeout": 7 });
    setTimeout(function () {
      chrome.tabs.create( {url: "https://spin311.github.io/MicrosoftRewardsWebsite/", active: true});
    }, 1000);
  }
});
// on startup, check if user has already clicked the checkbox
chrome.runtime.onStartup.addListener(function(){
    chrome.storage.sync.get("active", function (result) {
      if (result.active) {
        checkLastOpened();
      }
    });
});

//listen for messages from popup.ts
chrome.runtime.onMessage.addListener(function(request){
  if (request.action === "popup"){
    popupBg();
  }
  else if (request.action === "check"){
    checkLastOpened();
  }
});

//opens 10 tabs with bing searches
function popupBg(): void {
  const format: string = "https://www.bing.com/search?q=";
  const format2: string = "&qs=n&form=QBLH&sp=-1&pq=";
  let level: number = 1;
  let searchTimeout: number = 7;

  chrome.storage.sync.get(["level", "timeout"], function(results) {
    if (results.timeout) searchTimeout = parseInt(results.timeout);
    if (results.level > 1) level = 3;

    for (let xp = 0; xp < level; xp++) {
      let timeout: number = 1500 * xp;
      setTimeout(async () => await createTabs(format, format2, searchTimeout), timeout);
    }
  });
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function createTabs(format: string, format2: string, searchTimeout: number): Promise<void> {
  for (let i = 0; i < 10; i++) {
    let randomString = Math.random().toString(36).substring(2, 7);
    let url = format + randomString + format2;
    openAndClose(url);
    await delay(searchTimeout * 1000 - 500);
  }
}

function openAndClose(url: string): void {
  chrome.tabs.create({
        url: url, active: false
      },
      function (tab: any) {
        let idCurr: number = tab.id;
        //wait for tab to load before closing
        chrome.tabs.onUpdated.addListener(function listener(tabId: number, changeInfo: chrome.tabs.TabChangeInfo) {
          if (tabId === idCurr && changeInfo.status === "complete") {
            chrome.tabs.onUpdated.removeListener(listener);
            waitAndClose(idCurr);
          }
        });
      });
}

//check if user has already opened tabs today
function checkLastOpened(): void {
  const today = new Date().toLocaleDateString();
  chrome.storage.sync.get("lastOpened", function (result) {
    if (result.lastOpened !== today) {
      popupBg();
      chrome.storage.sync.set({ "lastOpened": today });
    }
  });
}

//wait 0.1 second before closing tab
function waitAndClose(id: number): void {
  setTimeout(function () {
    chrome.tabs.get(id, function(tab) {
      if (!chrome.runtime.lastError) {
        chrome.tabs.remove(id);
        }
    });
  }, 500);
}


