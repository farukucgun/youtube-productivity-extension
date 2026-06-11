import React, { useState } from 'react';
import playImage from '../../../assets/img/play.png';
import deleteImage from '../../../assets/img/delete.png';
import shareImage from '../../../assets/img/share.png';

import '../Popup.css';

const Bookmark = ({bookmark, onRemoveBookmark, onEditBookmark, onPlayBookmark, onShareBookmark}) => {

    const [isEditing, setIsEditing] = useState(false);
    const [label, setLabel] = useState(bookmark.label || '');
    const [tags, setTags] = useState(bookmark.tags?.join(', ') || '');
    const [note, setNote] = useState(bookmark.note || '');

    const handleRemoveBookmark = (e) => {
        e.stopPropagation();
        onRemoveBookmark(bookmark.time);
    }

    const handlePlayBookmark = (e) => {
        e.stopPropagation();
        onPlayBookmark(bookmark.time);
    }

    const handleEditClick = (e) => {
        e.stopPropagation();
        setIsEditing(true);
    };

    const handleSaveEdit = () => {
        setIsEditing(false);
        onEditBookmark(bookmark.time, {
            label,
            tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
            note
        });
    };

    const handleShareBookmark = (e) => {
        e.stopPropagation();
        onShareBookmark(bookmark.time);
    }

    const getTime = (seconds) => {
        let date = new Date(0);
        date.setSeconds(seconds);
      
        return date.toISOString().substring(11, 19);
    };

    return (
        <div id={'bookmark-' + bookmark.time} className='bookmark'>
            {isEditing ? (
                <div className='edit_fields'>
                    <input type="text" placeholder="Label" value={label} onChange={(e) => setLabel(e.target.value)} />
                    <input type="text" placeholder="Tags (comma-separated)" value={tags} onChange={(e) => setTags(e.target.value)} />
                    <textarea placeholder="Note" value={note} onChange={(e) => setNote(e.target.value)} />
                    <button onClick={handleSaveEdit}>Save</button>
                </div>
            ) : (
                <div className='bookmark_content' onClick={() => setIsEditing(true)}>
                    <h3 className='bookmark_label'>{bookmark.label || 'Untitled'}</h3>
                    <h4 className='bookmark_tags'>{bookmark.tags?.join(', ')}</h4>
                    <p className='bookmark_note'>{bookmark.note}</p>
                    <h3 className='bookmark_time'>{getTime(bookmark.time)}</h3>
                </div>
            )}
            <div className='control_elements'>
                <img src={playImage} className='control_element' onClick={(e) => { e.stopPropagation(); onPlayBookmark(bookmark.time); }} />
                <img src={deleteImage} className='control_element' onClick={(e) => { e.stopPropagation(); onRemoveBookmark(bookmark.time); }} />
                <img src={shareImage} className='control_element' onClick={(e) => { e.stopPropagation(); onShareBookmark(bookmark.time); }} />
            </div>
        </div>
    );
};

export default Bookmark;