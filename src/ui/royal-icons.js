const paths = {
  book: '<path d="M3 4h7a3 3 0 0 1 3 3v14a4 4 0 0 0-4-2H3V4Zm18 0h-5a3 3 0 0 0-3 3v14a4 4 0 0 1 4-2h4V4Z"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m16 8-2 6-6 2 2-6 6-2Z"/>',
  palace: '<path d="m2 9 10-5 10 5M3 10h18M5 10v9m7-9v9m7-9v9M2 20h20M7 4l5-2 5 2"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
}
export const royalIcon = name => `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] ?? paths.compass}</svg>`
