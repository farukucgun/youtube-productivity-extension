/** 
 * Content.js file google search filter logic 
 */

// Content.js - floating "Filter: PDF" button for search inputs on any page

class FiletypeFilter {
	constructor() {
		this.buttonId = 'filetype-pdf-btn';
		this.button = null;
		this.searchInput = null;
		this.init();
	}

	// List of selectors to detect search inputs on various sites
	findSearchInput() {
		const selectors = [
			'input[name="q"]',          // Google
			'input#search',             // YouTube
			'input[type="search"]',     // Generic search inputs
			'input[aria-label*="search"]',
			'input[placeholder*="Search"]',
			'input[type="text"]',       // fallback: any visible text input
		];

		for (const sel of selectors) {
			const input = document.querySelector(sel);
			if (input && this.isVisible(input)) return input;
		}

		// fallback: first visible input[type=text]
		const inputs = [...document.querySelectorAll('input[type="text"]')];
		for (const input of inputs) {
			if (this.isVisible(input)) return input;
		}

		return null;
	}

	isVisible(el) {
		return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
	}

	waitForSearchInput() {
		return new Promise((resolve, reject) => {
			const maxRetries = 20;
			let tries = 0;

			const tryFind = () => {
				const input = this.findSearchInput();
				if (input) resolve(input);
				else {
					tries++;
					if (tries > maxRetries) reject();
					else setTimeout(tryFind, 300);
				}
			};

			tryFind();
		});
	}

	init() {
		this.waitForSearchInput().then(input => {
			this.searchInput = input;
			this.createButton();
			this.setupListeners();
		}).catch(() => {
			console.warn('Search input not found.');
		});
	}

	createButton() {
		this.button = document.createElement('button');
		this.button.id = this.buttonId;
		this.button.innerText = 'Filter: PDF';
		Object.assign(this.button.style, {
			position: 'absolute',
			display: 'none',
			padding: '6px 10px',
			fontSize: '12px',
			backgroundColor: '#4285f4',
			color: '#fff',
			border: 'none',
			borderRadius: '4px',
			cursor: 'pointer',
			boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
			opacity: '0.9',
			zIndex: '99999',
		});

		this.button.onclick = this.handleClick.bind(this);
		document.body.appendChild(this.button);
	}

	positionButton() {
		if (!this.searchInput || !this.button) return;
		const rect = this.searchInput.getBoundingClientRect();
		this.button.style.top = `${rect.bottom + window.scrollY + 4}px`;
		this.button.style.left = `${rect.left + window.scrollX}px`;
	}

	setupListeners() {
		this.searchInput.addEventListener('focus', () => {
			this.positionButton();
			this.button.style.display = 'inline-block';
		});

		this.searchInput.addEventListener('blur', () => {
			// Delay hiding so button clicks register
			setTimeout(() => {
				this.button.style.display = 'none';
			}, 200);
		});

		window.addEventListener('resize', () => {
			if (this.button.style.display !== 'none') {
				this.positionButton();
			}
		});

		window.addEventListener('scroll', () => {
			if (this.button.style.display !== 'none') {
				this.positionButton();
			}
		});
	}

	handleClick() {
		if (!this.searchInput) return;

		const currentQuery = this.searchInput.value;

		if (currentQuery.includes('filetype:pdf')) return;

		this.searchInput.value = `${currentQuery} filetype:pdf`;

		// Submit the form if possible
		const form = this.searchInput.form;
		if (form && typeof form.submit === 'function') {
			form.submit();
		} else {
			// fallback: trigger Enter key event
			const evt = new KeyboardEvent('keydown', {
				bubbles: true,
				cancelable: true,
				key: 'Enter',
				code: 'Enter',
			});
			this.searchInput.dispatchEvent(evt);
		}
	}
}

// Exported initializer function
export const initializeGoogleSearchFilter = () => {
	new FiletypeFilter();
};

