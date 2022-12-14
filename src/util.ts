import type { Action } from 'svelte/types/runtime/action';

export const click_outside: Action = (node) => {
	const handle_click = (event: MouseEvent) =>
		node &&
		!node.contains(event.target as HTMLElement) &&
		!event.defaultPrevented &&
		node.dispatchEvent(new CustomEvent('click_outside', node as any));

	document.addEventListener('click', handle_click, true);

	return {
		destroy() {
			document.removeEventListener('click', handle_click, true);
		}
	};
};

export function change_theme(dark: boolean) {
	if (dark) {
		document.documentElement.classList.add('dark');
		dark_mode = true;
	} else {
		document.documentElement.classList.remove('dark');
		dark_mode = false;
	}
}


export const get_theme = () => {
	if (
		localStorage.theme === 'dark' ||
		(!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)
	) {
		document.documentElement.classList.add('dark');
		return true;
	} else {
		document.documentElement.classList.remove('dark');
		return false;
	}
};

export let dark_mode = get_theme();