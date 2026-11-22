/**
 * The facilitator guide is a living Google Doc ("Intro Course — Draft Facilitator
 * Guide", maintained by James). The site embeds it rather than copying it, so edits
 * in the doc show up immediately. Set FACILITATOR_GUIDE_DOC_ID to point at another doc.
 *
 * Note: the doc is shared "anyone with the link can view", so the page only hides
 * the link from non-facilitators; restricting the doc itself is done in Google Drive.
 */
const DEFAULT_DOC_ID = "1fben8VEubwqXU5RW30xi9-auHHUKa-_yoQzhu49fQvc";

export function facilitatorGuideDocId(): string {
  return process.env.FACILITATOR_GUIDE_DOC_ID?.trim() || DEFAULT_DOC_ID;
}

export function facilitatorGuideUrls() {
  const id = facilitatorGuideDocId();
  return {
    embed: `https://docs.google.com/document/d/${id}/preview`,
    open: `https://docs.google.com/document/d/${id}/edit`,
    pdf: `https://docs.google.com/document/d/${id}/export?format=pdf`,
  };
}

/**
 * Link to a section of the guide (a Google Docs heading id, "h.…"). Heading ids only exist in
 * the default doc, so with another doc configured this falls back to the top of that doc.
 */
export function facilitatorGuideSectionUrl(headingId?: string): string {
  const { open } = facilitatorGuideUrls();
  return headingId && facilitatorGuideDocId() === DEFAULT_DOC_ID ? `${open}#heading=${headingId}` : open;
}
