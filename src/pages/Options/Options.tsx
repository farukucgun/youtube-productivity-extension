import React, { useState, useEffect } from 'react';
import './Options.css';

interface Props {
    title: string;
}

interface Bookmark {
    time: string,
    description: string,
}

interface videoBookmarks {
    videoId: string;
    bookmarks: Bookmark[];
}

const Options: React.FC<Props> = ({ title }: Props) => {

    const [newTabEnabled, setNewTabEnabled] = useState<boolean>(false);
    const [bookmarks, setBookmarks] = useState<videoBookmarks[]>([]);

    useEffect(() => {
        chrome.runtime.sendMessage({ type: 'GET_NEW_TAB_OPTION' }, (response) => {
            setNewTabEnabled(response);
        });

        chrome.runtime.sendMessage({ type: 'GET_ALL_BOOKMARKS' }, (response) => {
            setBookmarks(response);
        });
    }, []);

    const handleDropDownChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        setNewTabEnabled(e.target.value === 'true');

        await chrome.runtime.sendMessage({ type: 'SET_NEW_TAB_OPTION', value: e.target.value === 'true' });
    }

    const handleRemoveAllBookmarks = async () => {
        await chrome.runtime.sendMessage({ type: 'REMOVE_ALL_BOOKMARKS' });
    }

    return (
        <div className="OptionsContainer">
            <h1>{title} Page</h1>
            <div className="OptionsContent">
                <div className='Option'>
                    <label htmlFor="newTabEnabled">Custom New Tab: </label>
                    <select name="newTabEnabled" id="newTabEnabled" onChange={handleDropDownChange} value={newTabEnabled.toString()}>
                        <option value="true">Enabled</option>
                        <option value="false">Disabled</option>
                    </select>
                </div>
                <div className='Option'>
                    <label htmlFor="removeAllBookmarks">Remove All Bookmarks: </label>
                    <button onClick={handleRemoveAllBookmarks}>Remove All Bookmarks</button>
                </div>
                <div className="BookmarkList">
                    <h3>Bookmarks</h3>
                    {bookmarks.length === 0 ? <p>No Bookmarks</p> :
                        bookmarks.map((video, index) => {
                            return (
                                <div key={index} className="Bookmark">
                                    <a 
                                        href={`https://www.youtube.com/watch?v=${video.videoId}`} 
                                        target="_blank" 
                                        rel="noreferrer"
                                    >
                                        {video.videoId}
                                    </a>
                                    {video.bookmarks.map((bookmark, index) => {
                                        return (
                                            <p>{bookmark.description}{bookmark.time}</p>
                                        );
                                    })}
                                </div>
                            );
                        })
                    }
                </div>
            </div>
        </div>
    );
};

export default Options;