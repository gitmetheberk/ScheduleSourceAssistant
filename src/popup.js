// Add a handler for the enable button
let popup_enable = document.getElementById("popup_enable");
popup_enable.addEventListener("click", async () =>{
// Load configuration variables from storage (welcome to the highest level of callback hell (I didn't tab this because there are two many tabs as is))
chrome.storage.sync.get({
  schedulesource_url: "https://www.schedulesource.net/Enterprise/TeamWork5/Emp/Sch/#All",  // This is here as a failsafe in the event the URL changes in the future and needs to be configured manually
  interval_minutes : 15,
  before_minutes: 0,  // Minutes before 00, 15, 30, 45 the alarm will trigger
  padding_minutes: 5  // Upon activating the extension, number of minutes past 00, 15, 30, 45 where it will still trigger
}, function(configuration_dict){

  // Get the current status and swap it, activating and deacting the alarm as needed
  chrome.storage.sync.get({status: false}, function(current_status){
    // Technically I could just assign to !status.status, but this is safer if status = undefined
    if (current_status.status == false){
      // Verify the current tab has the correct URL
      chrome.tabs.query({active: true, currentWindow: true}, function(data){
        if (data[0].url != configuration_dict.schedulesource_url){
          chrome.tabs.executeScript(undefined, {code: `window.alert("Please activate the extension after navigating to today's schedule");`})
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
        let alarmDelay_minutes = configuration_dict.interval_minutes - now.getMinutes() % configuration_dict.interval_minutes;

        // Modify alarmDelay_minutes based on configuration variables
        let run_now = false
        if (now.getMinutes() % configuration_dict.interval_minutes < configuration_dict.padding_minutes){
          run_now = true;
        }

        // Check for a negative value after applying before_minutes
        alarmDelay_minutes = alarmDelay_minutes - configuration_dict.before_minutes
        if (alarmDelay_minutes < 0) {
          alarmDelay_minutes += configuration_dict.interval_minutes;
          run_now = true
        }

        // Only trigger on the minute
        console.log(alarmDelay_minutes)
        let alarmStart_ms = (alarmDelay_minutes) * 60000 - (60 + now.getSeconds()) - (1000 + now.getMilliseconds());
        console.log(alarmStart_ms)
        if (alarmStart_ms < 0){
          alarmStart_ms += configuration_dict.interval_minutes * 60000;
          run_now = true;
          console.log("ERROR: You shouldn't be seeing this log")
        }

        console.log(`Alarm starting in ${alarmStart_ms / 1000} seconds or ${alarmStart_ms / 60000} minutes`)
        console.log(`Alarm also running now: ${run_now}`)

        // Activate the alarm(s)
        chrome.alarms.create('run',{
          when: Date.now() + alarmStart_ms,
          periodInMinutes: configuration_dict.interval_minutes
        });

        if (run_now){
          chrome.alarms.create('run_once', {
            when: Date.now() + 1000,
          })
        }
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
});


// Add an event handler for the run once button
let popup_run_once = document.getElementById("popup_run_once");
popup_run_once.addEventListener("click", async () =>{
  // Trigger the run_once alarm in one second
  chrome.alarms.create('run_once',{
    when: Date.now() + 1000,
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


//* TEMP CODE
let popup_test = document.getElementById("popup_test");
popup_test.addEventListener("click", async () =>{
  console.log("test button")

  console.log("test alarm triggering in 1 second(s)")
  chrome.alarms.create('run_once',{
    when: Date.now() + 1000,
  })
});