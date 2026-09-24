// Default props for a freshly inserted Image element with no source yet — opens on the upload
// placeholder with empty alt text (so the missing-alt prompt shows) instead of a stock photo
// labelled "Placeholder" that could ship as-is. Shared by every insertion path (Lesson Builder
// Elements panel, Website/Funnel command palette) so their prop names can't drift from
// Image.tsx again (the palette once passed `imageUrl`/`altText`, which Image never read).
//
// Deliberately import-free: LessonBuilderSidebar can't eagerly import component modules
// without hitting a webpack init-order error (see the note at the top of that file).
export const EMPTY_IMAGE_PROPS = {
  src: '',
  alt: '',
  align: 'center',
  width: '100%',
  borderRadius: 12,
  objectFit: 'cover',
} as const;
