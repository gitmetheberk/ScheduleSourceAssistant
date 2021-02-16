// [12] Code from source 12 modified for use below
// Create the event object
let eventObject = document.createEvent('Events');
eventObject.initEvent('click', true, false);

// Grab the refresh button by class (only one element on the page uses this class)
let refresh = document.getElementsByClassName('glyphicon glyphicon-refresh')[0]

// Dispatch the event
refresh.dispatchEvent(eventObject)