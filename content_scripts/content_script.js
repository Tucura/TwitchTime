let CURRENT_CHANNEL = "";
let CHANNEL_TIME = 0;
let INTERVAL_SECONDS = 2;

/**
 * Converts time in seconds to the form: `Watched: [${d} d] ${h} h`
 * @param {number} time - Time, in seconds.
 * @return {string} A formatted time string.
 */
function formatTime(time) {
  const timeInHours = Math.floor(time / 3600);

  const days = Math.floor(timeInHours / 24);
  const hours = timeInHours % 24;

  const formattedDays = days === 0 ? "" : `${days} d `;
  const formattedHours = `${hours} h`;
  const formattedTime = "Watched: " + formattedDays + formattedHours;

  return formattedTime;
}

/**
 * Removes the time indicator element from the Twitch page.
 */
function removeTimeIndicator() {
  let timeIndicator = document.querySelector(".twitch-time-display");
  if (timeIndicator !== null) {
    timeIndicator.remove();
  }
}

/**
 * Inserts a text element next to the Follow and Subscribe buttons on a
 * Twitch channel.
 * @param {Object.<string, number>} storedTime - The channel name and time, in seconds.
 */
function injectTimeIndicator(storedTime) {
  removeTimeIndicator();

  CHANNEL_TIME = Object.values(storedTime)[0];  // Should have one k:v pair.
  const formattedTime = formatTime(CHANNEL_TIME);

  let div = document.createElement("div");
  const text = document.createTextNode(formattedTime);

  div.className = "twitch-time-display"
  div.appendChild(text);

  let parent = document.querySelector("main div.channel-header__right")  // Brittle.
  parent.appendChild(div);
}

/**
 * Generic error handler.
 */
function onError(error) {
  console.log(error);
}

/**
 * Injects an Element onto the Twitch page indicating the time spent watching
 * the channel.
 * @param {string} channelName - The channel name.
 */
function setupForChannel(channelName) {
  CURRENT_CHANNEL = channelName;
  const gettingChannelTime = browser.storage.sync.get({ [CURRENT_CHANNEL]: 0 });
  gettingChannelTime.then(injectTimeIndicator, onError);
}

/**
 * Updates the text content of the time indicator element on the Twitch channel,
 * IF there is a difference in the new text (i.e. on an hour / day rollover).
 */
function lazyUpdateTimeIndicator() {
  let timeIndicator = document.querySelector(".twitch-time-display");

  const oldFormattedTime = timeIndicator.textContent;
  const newFormattedTime = formatTime(CHANNEL_TIME);

  if (newFormattedTime !== oldFormattedTime) {
    timeIndicator.textContent = newFormattedTime;
  }
}

/**
 * Saves the new time spent watching to sync storage, and calls a UI updater.
 */
function addWatchTime() {
  CHANNEL_TIME += INTERVAL_SECONDS;
  const storingChannelTime = browser.storage.sync.set({ [CURRENT_CHANNEL]: CHANNEL_TIME});
  storingChannelTime.then(lazyUpdateTimeIndicator, onError);
}

/**
 * Gets the Twitch channel name if available. Raises an Error if name not found.
 * @return {string} The channel name.
 */
function getChannelName() {
  const pathname = window.location.pathname;
  const splitPath = pathname.split("/");
  /*
   * To my knowledge, the only paths you can start to watch videos from are:
   *   1. twitch.tv/[channel]
   *   2. twitch.tv/videos/*
   * As such, these are the only paths I'll try to find the channel name from.
   */
  if (splitPath[1] === "videos" || splitPath.length === 2) {
    const channelNameElement = document.querySelector("main h5");  // Brittle.
    const channelName = channelNameElement.textContent.toLowerCase();  // *display* names have capitals, not account names.

    return channelName;

  } else {
    throw new Error("Channel name not found.");
  }
}

/**
 * If it can find a channel name, it either:
 * 1. updates the time spent watching
 * 2. sets stuff up for a newly navigated-to channel
 * Otherwise, it resets the `current channel`.
 */
function main() {
  try {
    const channelName = getChannelName();
    if (channelName === CURRENT_CHANNEL) {
      addWatchTime();
    } else {
      setupForChannel(channelName)
    }
  } catch (e) {
    removeTimeIndicator();  // Not sure if needed.
    CURRENT_CHANNEL = "";
  }
}

window.setInterval(main, 1000 * INTERVAL_SECONDS);
