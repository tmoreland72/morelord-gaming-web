import DOMPurify from 'dompurify';

export function sanitizeCharacterHtml(html: string): string {
	// Rich text tabs open in the browser; never emit unsanitized HTML during SSR.
	return typeof DOMPurify.sanitize === 'function'
		? DOMPurify.sanitize(html, {
				USE_PROFILES: { html: true },
				FORBID_TAGS: ['style', 'form', 'input', 'button'],
				FORBID_ATTR: ['style']
			})
		: '';
}
