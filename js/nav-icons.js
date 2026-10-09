// Complete vector silhouettes: no bitmap background or partially cropped edges.
const shapes={
 home:'<path d="M3 12 16 2l13 10-3 4-2-2v15H8V14l-2 2Z"/><path class="nav-icon-cut" d="M13 29V18h6v11"/>',
 news:'<path d="M5 3h23v26H5Z"/><path class="nav-icon-cut" d="M10 8h13M10 13h13M10 18h5M10 23h13M20 17h3v3h-3Z"/>',
 market:'<path d="M4 17h6v12H4ZM13 9h6v20h-6ZM22 3h6v26h-6Z"/>',
 assets:'<path d="M4 7 25 3v5H4ZM4 8h24v21H4Z"/><path class="nav-icon-cut" d="M21 15h8v9h-8Z"/><circle class="nav-icon-cut" cx="24.5" cy="19.5" r="1"/>',
 settings:'<path d="m13 2 6 0 1 4 3 2 4-1 3 5-3 3v3l3 3-3 5-4-1-3 2-1 4h-6l-1-4-3-2-4 1-3-5 3-3v-3l-3-3 3-5 4 1 3-2Z"/><circle class="nav-icon-cut" cx="16" cy="16" r="5"/>'
};
export function navIcon(name){return `<svg class="nav-icon" viewBox="0 0 32 32" aria-hidden="true"><defs><linearGradient id="nav-metal-${name}" x2=".25" y2="1"><stop stop-color="#f7fff2"/><stop offset=".45" stop-color="#c2d1bd"/><stop offset="1" stop-color="#809980"/></linearGradient></defs><g fill="url(#nav-metal-${name})">${shapes[name]||shapes.home}</g></svg>`;}
