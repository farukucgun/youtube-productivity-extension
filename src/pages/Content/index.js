import { printLine } from './modules/print';
import { initializeYoutubeLogic } from './modules/youtube_bookmark';
import { initializeSkipAddLogic } from './modules/youtube_add_skip';
import { initializeGoogleSearchFilter } from './modules/google_search_filter';
import './content.styles.css';

printLine('Hello from content script!');

window.onload = () => {
    printLine('Content script loaded successfully!');
    initializeYoutubeLogic();
    initializeSkipAddLogic();
    // initializeGoogleSearchFilter();
};