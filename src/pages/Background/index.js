console.log('Background script running');

chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
      checkCommandShortcuts();
    }
});
  
// Only use this function during the initial install phase. After
// installation the user may have intentionally unassigned commands.
function checkCommandShortcuts() {
    chrome.commands.getAll((commands) => {
        let missingShortcuts = [];
    
        for (let {name, shortcut} of commands) {
            if (shortcut === '') {
                missingShortcuts.push(name);
            }
        }

        if (missingShortcuts.length > 0) {
            console.log('The following commands are missing shortcuts:', missingShortcuts);
        }

        else {
            console.log('All commands have shortcuts assigned.');
        }
    });
}

chrome.commands.onCommand.addListener((command) => {
    console.log(`Command "${command}" triggered`);
    switch (command) {
        case 'next-tab':
            chrome.tabs.query({currentWindow: true}, function(tabs) {
                let activeTab = tabs.find(tab => tab.active);
                let nextTab = tabs[(tabs.indexOf(activeTab) + 1) % tabs.length];
                chrome.tabs.update(nextTab.id, {active: true}); 
            });
            break;
        
        case 'previous-tab':
            chrome.tabs.query({currentWindow: true}, function(tabs) {
                let activeTab = tabs.find(tab => tab.active);
                let previousTab = tabs[(tabs.indexOf(activeTab) - 1 + tabs.length) % tabs.length];
                chrome.tabs.update(previousTab.id, {active: true}); 
            });
            break;
    }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const { type, videoId, value, label, tags, note } = request;

    if (type === 'GET_BOOKMARKS') {
        chrome.storage.sync.get([videoId], (data) => {
            const bookmarks = data[videoId] ? JSON.parse(data[videoId]) : [];
            sendResponse(bookmarks);
        });

        return true;
    }

    else if (type === 'GET_ALL_BOOKMARKS') {
        chrome.storage.sync.get(null, (data) => {
            const allBookmarks = [];
            Object.keys(data).forEach((key) => {
                if (Array.isArray(JSON.parse(data[key]))) {
                    allBookmarks.push({ videoId: key, bookmarks: JSON.parse(data[key]) });
                }
            });
            sendResponse(allBookmarks);
        });

        return true;
    }

    else if (type === 'PLAY_BOOKMARK') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
              chrome.tabs.sendMessage(tabs[0].id, { type: 'PLAY_BOOKMARK', value: value }); // Propagate message to content script
            }
        });
    }

    // place the bookmark arrays in an object 
    else if (type === 'ADD_BOOKMARK') {
        chrome.storage.sync.get([videoId], (data) => {
            const bookmarks = data[videoId] ? JSON.parse(data[videoId]) : [];
            const newBookmark = {
                time: parseFloat(value.toFixed(2)),
                label: label || '',
                tags: tags || [],
                note: note || '',
                createdAt: new Date().toISOString()
            };

            if (bookmarks.some((b) => b.time === newBookmark.time)) {
                return;
            }

            const updatedBookmarks = [...bookmarks, newBookmark].sort((a, b) => a.time - b.time);
            chrome.storage.sync.set({ [videoId]: JSON.stringify(updatedBookmarks) });
        });

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, { type: 'ADD_BOOKMARK', value: value });
            }
        });
    }

    else if (type === 'REMOVE_BOOKMARK') {
        chrome.storage.sync.get([videoId], (data) => {
            const bookmarks = data[videoId] ? JSON.parse(data[videoId]) : [];
            const updatedBookmarks = bookmarks.filter((bookmark) => bookmark.time !== value);

            if (updatedBookmarks.length === 0) {
                chrome.storage.sync.remove(videoId);
            } else {
                chrome.storage.sync.set({ [videoId]: JSON.stringify(updatedBookmarks) });
            }

            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]) {
                    chrome.tabs.sendMessage(tabs[0].id, { type: 'REMOVE_BOOKMARK', value: value });
                }
            });
        });
    }

    else if (type === 'REMOVE_VIDEO_BOOKMARKS') {
        chrome.storage.sync.remove(videoId);

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, { type: 'REMOVE_VIDEO_BOOKMARKS' });
            }
        });
    }

    else if (type === 'REMOVE_ALL_BOOKMARKS') {
        chrome.storage.sync.get(null, (data) => {
            Object.keys(data).forEach((key) => {
                if (Array.isArray(JSON.parse(data[key]))) { // careful, removes all the keys that are arrays
                    chrome.storage.sync.remove(key);
                }
            });
        });

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, { type: 'REMOVE_ALL_BOOKMARKS' });
            }
        });
    }

    else if (type === 'EDIT_BOOKMARK') {
        chrome.storage.sync.get([videoId], (data) => {
            const bookmarks = data[videoId] ? JSON.parse(data[videoId]) : [];
            const updatedBookmarks = bookmarks.map(bookmark =>
                bookmark.time === value ? {
                    ...bookmark,
                    label: request.label || bookmark.label,
                    tags: request.tags || bookmark.tags,
                    note: request.note || bookmark.note
                } : bookmark
            );
            chrome.storage.sync.set({ [videoId]: JSON.stringify(updatedBookmarks) });
        });
    }

    else if (type === 'SET_NEW_TAB_OPTION') {
        chrome.storage.sync.set({ "newTabOption": value });
    }

    else if (type === 'GET_NEW_TAB_OPTION') {
        chrome.storage.sync.get('newTabOption', function (data) {
            const enableNewTabPage = data.newTabOption || false;
            sendResponse(enableNewTabPage);
        });
        return true;
    }

    else if (type === 'VIDEO_METADATA') {
        const { videoId, title } = request;

        if (!title || title === 'YouTube') return;

        chrome.storage.sync.get(`video_title_${videoId}`, (data) => {
            const key = `video_title_${videoId}`;
            if (data[key]) return;

            chrome.storage.sync.set({ [key]: title });
        });
    }


    else if (type === 'SYNC_TO_NOTION') {
        const titleKey = `video_title_${videoId}`;

        chrome.storage.sync.get(
            [videoId, titleKey, 'NOTION_PAGE_ID', 'NOTION_TOKEN'],
            async (data) => {
                const bookmarks = data[videoId]
                    ? JSON.parse(data[videoId])
                    : [];

                const token = data.NOTION_TOKEN;
                const pageId = data.NOTION_PAGE_ID;

                const videoTitle =
                    typeof data[titleKey] === 'string' && data[titleKey].length
                        ? data[titleKey]
                        : `YouTube: ${videoId}`;

                await removeVideoSection(pageId, videoTitle, token);

                if (!bookmarks.length) return;

                const children = [
                    buildVideoHeader(videoId, videoTitle),
                    ...bookmarks.map(b => buildBookmarkItem(videoId, b))
                ];

                await fetch(
                    `https://api.notion.com/v1/blocks/${pageId}/children`,
                    {
                        method: 'PATCH',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Notion-Version': '2022-06-28',
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ children })
                    }
                );
            }
        );

        return true;
    }
});

const sendMessageToContentScript = (tabId, url) => {
  	if (url && url.includes("youtube.com/watch")) {
		const queryParameters = url.split("?")[1];
		const urlParameters = new URLSearchParams(queryParameters);

		chrome.tabs.sendMessage(tabId, { type: "NEW_VIDEO", videoId: urlParameters.get("v") }, (response) => {
			if (chrome.runtime.lastError) {
				console.log(`Error: ${chrome.runtime.lastError.message}`);
			} else {
				console.log(`Received response: ${response}`);
			}
		});
	}
};

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  	if (changeInfo.status === 'complete') {
    	sendMessageToContentScript(tabId, tab.url);
  	}
});

chrome.tabs.onActivated.addListener((activeInfo) => {
	chrome.tabs.get(activeInfo.tabId, (tab) => {
		sendMessageToContentScript(activeInfo.tabId, tab.url);
	});
});

const newTabURL = "chrome://newtab/";

chrome.tabs.onCreated.addListener((tab) => {

    chrome.storage.sync.get('newTabOption', function (data) {
        const enableNewTabPage = data.newTabOption || false;
        const isNewTab = newTabURL === (tab.url || tab.pendingUrl);
        
        if (enableNewTabPage && isNewTab) {
            chrome.tabs.update(tab.id, { url: chrome.runtime.getURL('newtab.html') });
        }
    });
});

chrome.action.onClicked.addListener((tab) => {
    chrome.tabs.create({ url: newTabURL });
});

import secrets from 'secrets';

const { NOTION_TOKEN, NOTION_PAGE_ID } = secrets;

chrome.storage.sync.set({
  NOTION_TOKEN: NOTION_TOKEN,
  NOTION_PAGE_ID: NOTION_PAGE_ID
});

const formatTime = (seconds) =>
  new Date(seconds * 1000).toISOString().substring(11, 19);

async function getPageBlocks(pageId, token) {
  const res = await fetch(
    `https://api.notion.com/v1/blocks/${pageId}/children?page_size=100`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Notion-Version': '2022-06-28'
      }
    }
  );
  return res.json();
}

async function deleteBlock(blockId, token) {
  await fetch(`https://api.notion.com/v1/blocks/${blockId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Notion-Version': '2022-06-28'
    }
  });
}

async function removeVideoSection(pageId, videoTitle, token) {
  const data = await getPageBlocks(pageId, token);
  const blocks = data.results;

  let deleting = false;
  for (const block of blocks) {
    if (
      block.type === 'heading_2' &&
      block.heading_2.rich_text[0]?.plain_text === videoTitle
    ) {
      deleting = true;
      await deleteBlock(block.id, token);
      continue;
    }

    if (deleting) {
      if (block.type.startsWith('heading_')) break;
      await deleteBlock(block.id, token);
    }
  }
}

function buildVideoHeader(videoId, title) {
  return {
    object: 'block',
    type: 'heading_2',
    heading_2: {
      rich_text: [{
        type: 'text',
        text: {
          content: title,
          link: { url: `https://www.youtube.com/watch?v=${videoId}` }
        }
      }]
    }
  };
}

function buildBookmarkItem(videoId, b) {
  return {
    object: 'block',
    type: 'bulleted_list_item',
    bulleted_list_item: {
      rich_text: [{
        type: 'text',
        text: {
          content: `${formatTime(b.time)} — ${b.label || 'Untitled'} — ${b.note || ''}`,
          link: {
            url: `https://www.youtube.com/watch?v=${videoId}&t=${Math.floor(b.time)}`
          }
        }
      }]
    }
  };
}

