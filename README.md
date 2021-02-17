# Schedule Source Assistant
With all the duties a Student Leader must perform on a daily basis, it can be challenging to remember the little things such as monitoring the schedule. This extension aims to help with that. Utilizing advanced programming technology, and hours of pain, sweat, and tears, this extension now does the thinking for you. It reminds you when technicians should be starting their shifts, when they should be ending their shifts, and who should be on shift right now.


## Installation
1. Download and extract the .zip file containing the extension
2. Save the folder somewhere you'll be able to find later
3. Open Google Chrome and navigate to the options menu by clicking on the three dots in the top right corner of the browser
4. Click "More tools"
5. Click "Extensions"
6. In the top right, click "Developer Mode"
7. Click "Load unpacked"
8. Open the folder containing the extension and then select the <b>src</b> folder
9. The extension should now be showing up in your browser
10. If you can't see the extension, you may have to click on the small puzzle piece to show all extensions


### MacOS - Additional Instructions
Due to an issue with Chrome native notifications and macs running Catalina or higher versions of MacOS, there are a few extra steps to take to enable extension functionality:
1. Enter chrome://flags in the address bar and hit enter
2. Search for "Enable native notifications"
3. Change "Enable native notifications" to <b>Disabled</b>
4. Restart Google Chrome


### Updating the extension
1. To update the extension, first download the new .zip file containing the updated code
2. Unzip the file and copy all of the files (including src)
3. Paste the new files into the folder where the old version of the extension is currently installed
4. Click "replace" or "overwrite" if prompted
5. Open up the extensions menu in Chrome and click "Update"
6. Check the options page for new options
      * Your old preferences will be saved between versions


## Using the extension
1. Right click on the extension and click "Options"
2. Configure the extenion as you'd like and save the configuration
    * Even if you don't change anything, make sure to save the configuration
3. Navigate to todays schedule in schedule source
4. Click on the extension (Schedule Source icon) in your extensions
5. Click "Run once" to make sure you're receiving notifications from the extension and it's able to interact with Schedule Source (It may take a few seconds, so be patient)
6. Click "Toggle" to activate the extension
7. Wait for the next shift change and see what happens, or click "Run once" again to highlight the schedule


### Other information while using the extension
* Color key:
    * Shift highlighted in <b>red</b>:       This shift is ending
    * Shift highlighted in <b>orange</b>:    This shift is starting
    * Shift highlighted in <b>green</b>:     This shift is on-going
    * Shift highlighted in <b>yellow</b>:    This is your shift
* Clicking the notification will bring you to Schedule Source
* There are a lot configuration options in the extension's options page, if something's bothering you, see if you can change it there
* If you have any suggestions, questions, or run into any bugs, send an email to becker@tamu.edu or open an issue in the repository (https://github.tamu.edu/matthew-becker/ScheduleSourceAssistant)


## Issues
### Not receiving notifications
* Make sure notifications are enabled in Windows/MacOS for Google Chrome


## Planned Features
* Bug squashing (I'm sure they're lurking around every function)
* No further plans for now, but I'm always open to suggestions!


## Sources/Referenced:
1. https://developer.chrome.com/
2. https://stackoverflow.com/questions/38261197/how-to-check-if-a-key-is-set-in-chrome-storage/38261950
3. https://stackoverflow.com/questions/40613173/chrome-extension-oninstalled-event
4. https://www.w3schools.com/ (Essentially all the CSS)
5. https://levelup.gitconnected.com/how-to-use-background-script-to-fetch-data-in-chrome-extension-ef9d7f69625d
6. https://stackoverflow.com/questions/39840560/chrome-extension-get-active-tab-id-in-browser-action-popup
7. https://sung.codes/blog/2019/02/17/getting-dom-content-from-chrome-extension-2/
8. https://stackoverflow.com/questions/35882089/popup-is-not-appearing-when-used-page-action/35882614
9. https://stackoverflow.com/questions/11821261/how-to-get-all-selected-values-from-select-multiple-multiple
10. https://stackoverflow.com/questions/14707313/set-checkbox-label-to-right-side-or-fixed-position
11. https://stackoverflow.com/questions/16571393/the-best-way-to-check-if-tab-with-exact-id-exists-in-chrome
12. https://stackoverflow.com/questions/2705583/how-to-simulate-a-click-with-javascript
13. https://developer.mozilla.org/en-US/
13. https://stackoverflow.com/questions/17567624/pass-a-parameter-to-a-content-script-injected-using-chrome-tabs-executescript
14. https://stackoverflow.com/questions/11517150/how-to-change-background-color-of-cell-in-table-using-java-script
