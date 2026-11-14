import { BorderChars, type BorderCharacters } from '@opentui/core'

/**
 * Border set for a left-edge bar: a left half-block fills the left half of the cell, so the bar sits
 * flush against the block's background. Use it with `border={['left']}`; only the left edge is drawn.
 */
export const LEFT_BAR_CHARS: BorderCharacters = { ...BorderChars.single, vertical: '▌' }
