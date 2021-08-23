function RefreshSchedule() 
{
    // Grab the refresh button by class (only one element on the page uses this class)
    const refreshButton = document.getElementsByClassName('glyphicon glyphicon-refresh')[0]

    const clickEvent = document.createEvent('Events');
    clickEvent.initEvent('click', true, false);
    refreshButton.dispatchEvent(clickEvent);
};

RefreshSchedule();