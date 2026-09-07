export interface ExperienceMediaMetadata {
  width: number;
  height: number;
  layout?: 'phone';
}

// Intrinsic dimensions reserve space before lazy images load. Unknown assets
// retain the normal Markdown image rendering; no new content field is required.
export const EXPERIENCE_MEDIA: Readonly<Record<string, ExperienceMediaMetadata>> = {
  '/media/experiences/accessibility-study/instruction-comparison.png': { width: 909, height: 340 },
  '/media/experiences/accessibility-study/naver-editor.png': { width: 1280, height: 720 },
  '/media/experiences/interaction-prototype/layout-overlap-before.png': {
    width: 1440,
    height: 469,
  },
  '/media/experiences/interaction-prototype/product-history.png': { width: 2256, height: 1270 },
  '/media/experiences/interaction-prototype/slide-demo.gif': { width: 400, height: 204 },
  '/media/experiences/interaction-prototype/training-data.png': { width: 1365, height: 733 },
  '/media/experiences/peer-review-retrospective/ai-nomad-study.png': { width: 919, height: 1099 },
  '/media/experiences/peer-review-retrospective/department-mentoring.png': {
    width: 921,
    height: 954,
  },
  '/media/experiences/product-team-collaboration/architecture.png': { width: 1536, height: 1024 },
  '/media/experiences/product-team-collaboration/project-overview.png': {
    width: 1249,
    height: 1045,
  },
  '/media/experiences/product-team-collaboration/web-qa.png': { width: 1265, height: 712 },
  '/media/experiences/project-b/album.png': { width: 444, height: 960, layout: 'phone' },
  '/media/experiences/project-b/customize-scrolled.png': {
    width: 444,
    height: 960,
    layout: 'phone',
  },
  '/media/experiences/project-b/customize-start.png': { width: 444, height: 960, layout: 'phone' },
  '/media/experiences/project-b/home.png': { width: 444, height: 960, layout: 'phone' },
};
