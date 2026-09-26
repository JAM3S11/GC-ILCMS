/**
 * Theme bootstrap script.
 *
 * This snippet is inlined into <head> (see index.html) and executed *before*
 * the app bundle loads so the correct theme class is on <html> for the very
 * first paint. Without it the dark UI would flash white (FOUC) on every load.
 *
 * Keep this file dependency-free — it must run standalone in the browser.
 */
export const THEME_STORAGE_KEY = 'gc-ilcms-theme';

/**
 * Serialised bootstrap function. `THEME_STORAGE_KEY` is injected at build time
 * by the `buildThemeScript()` helper below so the key lives in exactly one place.
 */
export const buildThemeScript = (): string => `(function(){try{
var k='${THEME_STORAGE_KEY}';
var s=localStorage.getItem(k);
var m=(s==='light'||s==='dark'||s==='system')?s:'light';
var d=m==='dark'||(m==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);
var e=document.documentElement;
e.classList.toggle('dark',d);
e.style.colorScheme=d?'dark':'light';
}catch(e){}})();`;
