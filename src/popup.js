// Add a handler for the enable button
let popup_enable = document.getElementById("popup_enable");
popup_enable.addEventListener("click", async () =>{
  //* Temporary hardcoded configuration variables
  let interval_minutes = 15  // Length of the interval (15 for deployment)
  let before_minutes = 0  // Minutes before 00, 15, 30, 45 the alarm will trigger
  let padding_minutes = 0  // Upon activating the extension, number of minutes past 00, 15, 30, 45 where it will still trigger
  let schedulesource_url = "https://www.schedulesource.net/Enterprise/TeamWork5/Emp/Sch/#All"

  // TODO Fix indentation on this section, it's all sorts of messed up
  // Get the current status and swap it, activating and deacting the alarm as needed
  chrome.storage.sync.get({status: false}, function(current_status){
    // Technically I could just assign to !status.status, but this is safer if status = undefined
    if (current_status.status == false){
      // Verify the current tab has the correct URL
      chrome.tabs.query({active: true, currentWindow: true}, function(data){
        if (data[0].url != schedulesource_url){
          // TODO this should happen on the active tab, not popup.html
          window.alert("Please activate the extension after navigating to today's schedule");
          return;
        }
        
      //* This code only runs if the URL comes back as correct ------------------------

      // Set the status to true
      chrome.storage.sync.set({status: true}, function() {
        console.log("Status: true")
        update_status();
      });

      // Store the tabID and start the timer in the callback to prevent race conditions
      chrome.storage.sync.set({tabId: data[0].id}, function() {
        console.log(`tabID updated to ${data[0].id}`)

        // Calculate delayInMinutes (ex. time until minutes == 00, 15, 30, 45 - minutes_before)
        let now = new Date();
        let alarmDelay_minutes = interval_minutes - now.getMinutes() % interval_minutes;

        // Modify alarmDelay_minutes based on configuration variables
        if (alarmDelay_minutes < padding_minutes){
          alarmDelay_minutes = 0;
        } else {
          // Check for a negative value after applying before_minutes
          alarmDelay_minutes = alarmDelay_minutes - before_minutes
          if (alarmDelay_minutes < 0) {
            alarmDelay_minutes = 0
          }
        }

        // Only trigger on the minute
        console.log(alarmDelay_minutes)
        let alarmStart_ms = (alarmDelay_minutes) * 60000 - (60 + now.getSeconds()) - (1000 + now.getMilliseconds());
        console.log(alarmStart_ms)
        if (alarmStart_ms < 0){
          alarmStart_ms = 0;
        }
        console.log(`Alarm starting in ${alarmStart_ms / 1000} seconds or ${alarmStart_ms / 60000} minutes`)

          // TODO If the alarm was started with alarmStart_ms=0, delay, then start an alarm which starts on the correct minute
          // Activate the alarm, if alarmDelay_minutes = 0, to avoid error, use a different alarm creation
          chrome.alarms.create('run',{
            when: Date.now() + alarmStart_ms,
            periodInMinutes: interval_minutes
          }
        )
        console.log("alarm set")
      });
      })

    } else {
      chrome.storage.sync.set({status: false}, function() {
        console.log("Status: false")
        update_status();

        // Clear the alarm
        chrome.alarms.clear('run', function() {
          console.log("Alarm cleared")
        })
      });
    }
  })
});

// Update the status text based on current operational status
function update_status(){
  // Get the current application status and update
  chrome.storage.sync.get({status: false}, function(current_status){
    if (current_status.status == true){
      document.getElementById("status").innerHTML = "<p><strong>Status: Active</strong></p>";
    } else {
      document.getElementById("status").innerHTML = "<p><strong>Status: Disabled</strong></p>";
    }
  });
}


update_status();  // Run update_status when the script is called


// TEMP CODE
let popup_test = document.getElementById("popup_test");
popup_test.addEventListener("click", async () =>{
  console.log("test button")

  // let notif = {
  //   type: 'basic',
  //   title: 'notification test',
  //   message: "big test",
  //   iconUrl: "images/icon48.png"
  //chrome.notifications.create('limitNotif', notif)
  console.log("test alarm triggering in 1 second(s)")
  chrome.alarms.create('run',{
    when: Date.now() + 1000,
  })
});