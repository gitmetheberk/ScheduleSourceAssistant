function EnableExtensionIcon()
{
    chrome.runtime.sendMessage({"message": "activate_icon"});
}

EnableExtensionIcon();