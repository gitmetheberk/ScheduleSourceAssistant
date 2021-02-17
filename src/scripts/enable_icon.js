// [8] - Send a message to background.js to enable the icon to show popup.html
chrome.runtime.sendMessage({"message": "activate_icon"});