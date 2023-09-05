// on startup, check if user has already clicked the checkbox
chrome.runtime.onStartup.addListener(function(){
    console.log("startup");
    chrome.storage.sync.get("active", function (result) {
      if (result.active === true) {
        console.log("sending message");
        setTimeout(function(){
          chrome.runtime.sendMessage({active: true});
        }, 5000);
        //delay so that the popup has time to load
      }
      else {
        console.log("not sending message");
      }
    });
    });


