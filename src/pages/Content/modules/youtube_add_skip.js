/** 
 * Content.js file youtube add skipping logic 
 */

const getYouTubeVideoID = () => {
	const urlParams = new URLSearchParams(window.location.search);
  	return urlParams.get('v');
}

 const fetchSponsorBlockSegments = async (videoID) => {
  	const response = await fetch(`https://sponsor.ajay.app/api/skipSegments?videoID=${videoID}&categories=["sponsor"]`);
  	return response.json();
}

const monitorPlayback = (segments, onAdStart, onAdEnd) => {
	const video = document.querySelector('video');
	if (!video) return;

	let adVisible = false;
	setInterval(() => {
		const currentTime = video.currentTime;
		const adSegment = segments.find(seg => currentTime >= seg.segment[0] && currentTime <= seg.segment[1]);

		if (adSegment && !adVisible) {
			adVisible = true;
			onAdStart(adSegment);
		} else if (!adSegment && adVisible) {
			adVisible = false;
			onAdEnd();
		}
	}, 500);
}

const createSkipButton = (onClick) => {
	const btn = document.createElement('button');
	btn.innerText = 'Skip Sponsor';
	btn.style.position = 'fixed';
	btn.style.bottom = '100px';
	btn.style.right = '20px';
	btn.style.padding = '10px 20px';
	btn.style.background = '#ff0000';
	btn.style.color = '#fff';
	btn.style.border = 'none';
	btn.style.borderRadius = '5px';
	btn.style.zIndex = '9999';
	btn.style.cursor = 'pointer';
	btn.style.display = 'none';

	btn.onclick = onClick;
	document.body.appendChild(btn);
	return btn;
}

export const initializeSkipAddLogic = () => {
    (async function () {
		const videoID = getYouTubeVideoID();
		if (!videoID) return;
		
		const segments = await fetchSponsorBlockSegments(videoID);
		if (!segments.length) return;
		
		const skipBtn = createSkipButton(() => {
			const currentSegment = segments.find(seg =>
				document.querySelector('video').currentTime >= seg.segment[0] &&
				document.querySelector('video').currentTime <= seg.segment[1]
			);

			if (currentSegment) {
				document.querySelector('video').currentTime = currentSegment.segment[1] + 0.1;
			}

			skipBtn.style.display = 'none';
		});
		
		monitorPlayback(
			segments,
			() => skipBtn.style.display = 'block',
			() => skipBtn.style.display = 'none'
		);
    })();
};