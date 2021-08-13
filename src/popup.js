function AddToggleButtonHandler(buttonID)
{
  const popup_enable = document.getElementById(buttonID);
  popup_enable.addEventListener("click", ToggleButtonHandler);
}

function ToggleButtonHandler()
{
  chrome.storage.sync.get({
    schedulesource_url: "schedulesource.net/Enterprise/TeamWork5/Emp/Sch/#All", 
    interval_minutes : 15,
    before_minutes: 0,
    padding_minutes: 5,
    status: false,
  }, function(configuration)
  {
    if (configuration.status){
      chrome.tabs.query({active: true, currentWindow: true}, function(data){
        console.log(data[0].url)
        if (!data[0].url.endsWith(configuration.schedulesource_url)){
          chrome.tabs.executeScript(undefined, {code: `window.alert("Please activate the extension after navigating to today's schedule");`})
          return;
        }
        
      chrome.storage.sync.set({status: true}, function() {
        UpdateStatus();
      });

      // Store the tabID and start the timer in the callback to prevent race conditions
      chrome.storage.sync.set({tabId: data[0].id}, function() {

        // Store the WindowID (Async delay is fine, shouldn't cause race conditiions)
        chrome.windows.getCurrent({}, function(window){
          chrome.storage.sync.set({windowId: window.id})
        });

        // Calculate delayInMinutes (ex. time until minutes == 00, 15, 30, 45 - minutes_before)
        let now = new Date();
        let alarmDelay_minutes = configuration.interval_minutes - now.getMinutes() % configuration.interval_minutes;

        // Modify alarmDelay_minutes based on configuration variables
        let run_now = false
        if (now.getMinutes() % configuration.interval_minutes < configuration.padding_minutes){
          run_now = true;
        }

        // Check for a negative value after applying before_minutes
        alarmDelay_minutes = alarmDelay_minutes - configuration.before_minutes
        if (alarmDelay_minutes < 0) {
          alarmDelay_minutes += configuration.interval_minutes;
          run_now = true
        }

        // Possibly causing issue #1
        let alarmStart_ms = (alarmDelay_minutes) * 60000 - (60 + now.getSeconds()) - (1000 + now.getMilliseconds());

        if (alarmStart_ms < 0){
          alarmStart_ms += configuration.interval_minutes * 60000;
          run_now = true;
        }

        CreateRunAlarm(configuration.interval_minutes, alarmStart_ms);

        if (run_now){
          CreateRunOnceAlarm();
        }
      });
      })

    } else {
      ToggleOff();
    }
  });
}

function ToggleOff(){
  chrome.storage.sync.set({
    status: false,
    tabId: -1,
    windowId: -1
  }, 
  function() 
  {
    UpdateStatus();
    chrome.alarms.clear('run');
  });
}

function AddRunOnceButtonHandler(buttonID){
  const run_once_button = document.getElementById("popup_run_once");
  run_once_button.addEventListener("click", () => {RunOnceButtonHandler(run_once_button)});
}

function RunOnceButtonHandler(run_once_button)
{
  // Get the schedulesource_url from storage
  chrome.storage.sync.get({schedulesource_url: "schedulesource.net/Enterprise/TeamWork5/Emp/Sch/#All"}, function(configuration_dict){

    // Get the current tab and verify the url is correct
    chrome.tabs.query({active: true, currentWindow: true}, function(data){
      if (!data[0].url.endsWith(configuration_dict.schedulesource_url)){
        chrome.tabs.executeScript(undefined, {code: `window.alert("Please activate the extension after navigating to today's schedule");`})
        return;
      }

      chrome.windows.getCurrent({}, function(window){
        chrome.storage.sync.set({
          windowId: window.id,
          tabId: data[0].id
        },
        CreateRunOnceAlarm)
      });
    });
  });

  UpdateRunOnceText(run_once_button);
}

function CreateRunOnceAlarm()
{
  chrome.alarms.create('run_once',{
    when: Date.now() + 1000,
  });
}

function CreateRunAlarm(interval_minutes, alarmStart_ms)
{
  chrome.alarms.create('run',{
    when: Date.now() + alarmStart_ms,
    periodInMinutes: configuration.interval_minutes
  });
}

function UpdateRunOnceText(run_once)
{
  run_once.disabled = true;
  run_once.innerHTML = "<strong>Running...</strong>"

  setTimeout(() => {
    run_once.disabled = false;
    run_once.innerHTML = "<strong>Run once</strong>"
  }, 6000);
}

function UpdateStatus(){
  // Get the current application status and update
  chrome.storage.sync.get({status: false}, function(current_status){
    if (current_status.status == true){
      document.getElementById("status").innerHTML = "<p><strong>Status: Active</strong></p>";
    } else {
      document.getElementById("status").innerHTML = "<p><strong>Status: Disabled</strong></p>";
    }
  });
}

AddToggleButtonHandler("popup_enable");
AddRunOnceButtonHandler("popup_run_once");
UpdateStatus();