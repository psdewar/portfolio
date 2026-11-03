export const LIVE_DESKTOP_MEDIA_QUERY =
  "(orientation: landscape) and (min-width: 1024px) and (min-height: 500px)";

export const LIVE_DESKTOP_HIDDEN =
  "[@media(orientation:landscape)_and_(min-width:1024px)_and_(min-height:500px)]:hidden";

export const LIVE_DESKTOP_FLEX =
  "[@media(orientation:landscape)_and_(min-width:1024px)_and_(min-height:500px)]:flex";

// Height of the closed menu button and the open menu header.
export const MENU_HEADER_PX = 56;

// For a max-w-7xl layout starting on the menu button's row: insets content past the 170px button
// plus a 24px gap, shrinking to the usual 2rem once the centered margin already clears the button.
export const RAIL_BUTTON_INSET =
  "[@media(orientation:landscape)_and_(min-width:1024px)_and_(min-height:500px)]:!pl-[max(2rem,calc(194px_-_max(0px,(100vw_-_80rem)_/_2)))]";

// Puts a 30px Bebas heading's cap top level with the menu button's PEYT SPENCER wordmark.
export const RAIL_ROW_TOP = "[@media(orientation:landscape)_and_(min-width:1024px)_and_(min-height:500px)]:!pt-[12px]";

// Pulls a page's own background up under the reserved menu header band.
export const RAIL_HEADER_BLEED =
  "[@media(orientation:landscape)_and_(min-width:1024px)_and_(min-height:500px)]:-mt-14 [@media(orientation:landscape)_and_(min-width:1024px)_and_(min-height:500px)]:pt-14";
