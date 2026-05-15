/**
 * Shared address validation regexes for backend collection hooks and endpoint guards.
 */
export const ADDRESS_LABEL_RE = /^[\p{L}\p{M}0-9][\p{L}\p{M}0-9\s.'()/#,&-]{1,39}$/u
export const ADDRESS_PERSON_NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M}\s.'-]{0,62}$/u
export const ADDRESS_STREET_RE = /^[\p{L}\p{M}0-9#][\p{L}\p{M}0-9\s.,'()/#-]{2,119}$/u
export const ADDRESS_PLACE_RE = /^[\p{L}\p{M}0-9][\p{L}\p{M}0-9\s.'()/#,-]{1,79}$/u
export const ADDRESS_POSTAL_RE = /^(?=.{3,12}$)[A-Za-z0-9][A-Za-z0-9 -]*$/
export const ADDRESS_ISO_COUNTRY_RE = /^[A-Za-z]{2}$/
export const ADDRESS_PHONE_RE = /^[0-9+()\-\s]{5,20}$/
