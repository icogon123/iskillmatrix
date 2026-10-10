import { useEffect } from 'react';

const SITE = 'iSkillMatrix';
const DEFAULT_DESCRIPTION = 'Practical online courses in AI tools, graphic design, video editing, social media, marketing and more.';

function setDescription(text) {
  const tag = document.querySelector('meta[name="description"]');
  if (tag) tag.setAttribute('content', text);
}

/** Sets the browser tab title (and optionally the meta description) for a page. */
export function usePageTitle(title, description) {
  useEffect(() => {
    document.title = title ? `${title} · ${SITE}` : `${SITE} — Online courses in trending digital skills`;
    setDescription(description || DEFAULT_DESCRIPTION);
  }, [title, description]);
}
