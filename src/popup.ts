
function popup(){
  let format: string = "https://www.bing.com/search?q=";
    let searches: string[] = ["weather", "sport", "news", "stocks", "movies", "music", "games", "maps", "travel", "restaurants"];
    for (let i: number = 0; i < searches.length; i++) {
      let url: string = format + searches[i];
      chrome.tabs.create({url: url, active: false}, function (tab: any) {
        let idCurr: number = tab.id; // id of the tab that was just opened
        chrome.tabs.onUpdated.addListener(function listener(tabId:number, changeInfo:chrome.tabs.TabChangeInfo) {
          if(tabId === idCurr && changeInfo.status === "complete"){
            chrome.tabs.onUpdated.removeListener(listener);
            waitAndClose(idCurr);
          }

        });
        
      });
      
    }
  
}

document.addEventListener('DOMContentLoaded',
function () {
  popup();
}); 

const button: any = document.getElementById("button");
// if (button) {
  button.addEventListener("click", popup);
// }
// else {
//   console.log("button not found");
// }
    



function waitAndClose(id: number){
  console.log("waitAndClose");
  setTimeout(function(){
    chrome.tabs.remove(id);
  },1000);
}
