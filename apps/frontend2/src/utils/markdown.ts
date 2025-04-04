import MarkdownIt from 'markdown-it';
import markdownItColor from 'markdown-it-color';
import markdownItDefList from 'markdown-it-deflist';

export const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
});

// Add plugins
md.use(markdownItColor);
md.use(markdownItDefList);

export function renderMarkdown(content: string): string {
  return md.render(content);
} 