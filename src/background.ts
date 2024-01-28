chrome.runtime.onInstalled.addListener(function (details) {
  if(details.reason === "install"){
    chrome.storage.sync.set({ "active": true });
    chrome.storage.sync.set({ "level": 1 });
    setTimeout(function () {
      chrome.tabs.create( {url: "https://spin311.github.io/MicrosoftRewardsWebsite/", active: true});
    }, 1000);
  }
});
// on startup, check if user has already clicked the checkboxx§
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
  let format: string = "https://www.bing.com/search?q=";
  let format2: string = "&qs=n&form=QBLH&sp=-1&pq=";
  let level: number = 1;
  chrome.storage.sync.get("level", function(result){
    if (result.level > 1) level = 3;
    for (let xp = 0; xp < level; xp++) { 
      let timeout: number = 1500 * xp;
      setTimeout(function(){
        for (let i: number = 0; i < 10; i++) {
          let randomString: string = Math.random().toString(36).substring(2,7);
          let url: string = format + randomString + format2;
          openAndClose(url);
        }
      }, timeout);
  }
  });

  function openAndClose(url: string): void {
    chrome.tabs.create({
      url: url, active: false
    },
      function (tab: any) {
        let idCurr: number = tab.id;
        //wait for tab to load before closing
        chrome.tabs.onUpdated.addListener(function listener(tabId: number, changeInfo: chrome.tabs.TabChangeInfo) {
          if (tabId === idCurr &&  changeInfo.status === "complete") {
            chrome.tabs.onUpdated.removeListener(listener);
            waitAndClose(idCurr);
          }
        });
      });
  }




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
    chrome.tabs.remove(id);
  }, 1000);
}


