document.addEventListener('DOMContentLoaded', function() {

    let format = "https://www.bing.com/search?q=";
    let searches = ["weather", "sport", "news", "stocks", "movies", "music", "games", "maps", "travel", "restaurants"];
    for (i = 0; i < searches.length; i++) {
        let url = format + searches[i];
        chrome.tabs.create({url: url, active: false});
    }
});