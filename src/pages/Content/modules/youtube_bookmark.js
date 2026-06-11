/** 
 * Content.js file youtube bookmarking logic 
 */

export const initializeYoutubeLogic = () => {
    let youtubeLeftControls, youtubePlayer;
    let currentVideo = "";
    let currentVideoBookmarks = [];

    const fetchBookmarks = (callback) => {
        chrome.runtime.sendMessage({ type: 'GET_BOOKMARKS', videoId: currentVideo }, (response) => {
            callback(response);
        });
    };

    const newVideoLoaded = async () => {
        setTimeout(() => {
            const bookmarkBtnExists = document.getElementsByClassName("bookmark_btn").length > 0;

            // add the bookmark button
            if (!bookmarkBtnExists) {
                const bookmarkButton = document.createElement('img');
                bookmarkButton.src = chrome.runtime.getURL('bookmark.png');
                bookmarkButton.className = 'bookmark_btn' + ' ytp-button';
                bookmarkButton.title = 'Bookmark this moment';

                youtubeLeftControls = document.getElementsByClassName('ytp-left-controls')[0];

                if (!youtubeLeftControls) {
                    return;
                }

                youtubeLeftControls.appendChild(bookmarkButton);
                youtubePlayer = document.getElementsByClassName('video-stream')[0];

                bookmarkButton.addEventListener('click', () => {
                    const currentTime = youtubePlayer.currentTime;

                    const label = prompt("Add a label for this bookmark (optional):", "");
                    const tags = prompt("Add tags (comma-separated):", "");
                    const note = prompt("Add a note for this moment:", "");

                    chrome.runtime.sendMessage({
                        type: 'ADD_BOOKMARK',
                        videoId: currentVideo,
                        value: currentTime,
                        label: label,
                        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
                        note: note
                    });
                });
            }

            // place bookmark indicators
            fetchBookmarks((bookmarks) => {
                currentVideoBookmarks = bookmarks;
                const progressBar = document.querySelector('.ytp-progress-bar');
                currentVideoBookmarks.forEach(bookmark => {
                    const indicator = document.createElement('div');
                    indicator.className = 'bookmark-indicator ytp-scrubber-container';
                    indicator.style.left = `${bookmark.time / youtubePlayer.duration * 100}%`;
                    progressBar.appendChild(indicator);
                });
            });
        }, 1000);
    }

    const getStableTitle = () => {
        const title = document.title.replace(' - YouTube', '').trim();
        if (!title || title === 'YouTube' || title.length < 8) return null;
        return title;
    };

    const sendVideoMetadataWhenReady = (videoId, retries = 10) => {
        const title = getStableTitle();

        if (title) {
            chrome.runtime.sendMessage({
                type: 'VIDEO_METADATA',
                videoId,
                title
            });
            return;
        }

        if (retries > 0) {
            setTimeout(() => sendVideoMetadataWhenReady(videoId, retries - 1), 500);
        }
    };

    chrome.runtime.onMessage.addListener((request, sender, response) => {
        const { type, value, description, videoId } = request;

        if (type === "NEW_VIDEO") {
            currentVideo = videoId;
            sendVideoMetadataWhenReady(videoId);
            newVideoLoaded();
        } 
        
        else if (type === "PLAY_BOOKMARK") {
            youtubePlayer.currentTime = value;
            youtubePlayer.play();
        } 

        else if (type === "ADD_BOOKMARK") {
            const indicator = document.createElement('div');
            indicator.className = 'bookmark-indicator ytp-scrubber-container';
            const position = (value / youtubePlayer.duration * 100).toFixed(2);
            // setTimeout(() => {
                indicator.style.left = `${position}%`;
                document.querySelector('.ytp-progress-bar').appendChild(indicator);
        //     }, 500);
        }

        else if (type === "REMOVE_BOOKMARK") {
            const progressBar = document.querySelector('.ytp-progress-bar');
            const position = (value / youtubePlayer.duration * 100).toFixed(2);
            const indicator = progressBar.querySelector(`.bookmark-indicator[style*="left: ${position}%"]`);
            if (indicator) {
                progressBar.removeChild(indicator);
            } 
        }

        else if (type === "REMOVE_VIDEO_BOOKMARKS" || type === "REMOVE_ALL_BOOKMARKS") {
            const progressBar = document.querySelector('.ytp-progress-bar');
            const indicators = progressBar.querySelectorAll('.bookmark-indicator');
            indicators.forEach(indicator => progressBar.removeChild(indicator));
        }
    });
};