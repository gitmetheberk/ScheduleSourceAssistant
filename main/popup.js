// Add a handler for the enable button
popup_enable = document.getElementById("popup_enable");
popup_enable.addEventListener("click", async () =>{
  // If the extension is already loaded, this should cause it to reload
  window.alert("test")
});



// Source: https://developer.chrome.com/docs/extensions/mv3/getstarted/
// // Initialize button with user's preferred color
// let changeColor = document.getElementById("changeColor");

// chrome.storage.sync.get("color", ({ color }) => {
//   changeColor.style.backgroundColor = color;
// });