import { Node, mergeAttributes } from '@tiptap/core';

export const IframeEmbed = Node.create({
  name: 'iframeEmbed',
  group: 'block',
  selectable: true,
  draggable: true,
  atom: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      title: {
        default: 'Embed',
      },
      type: {
        default: 'generic', // 'youtube', 'vimeo', 'twitter', 'instagram', 'generic'
      }
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-iframe-embed]',
      },
      {
        tag: 'iframe[src]',
      }
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const type = HTMLAttributes.type || 'generic';
    let ratioClass = 'aspect-video'; 
    if (type === 'instagram') {
      ratioClass = 'aspect-[4/5] max-w-[450px] mx-auto';
    } else if (type === 'twitter') {
      ratioClass = 'h-[500px] max-w-[500px] mx-auto';
    }
    
    return [
      'div',
      {
        'data-iframe-embed': '',
        'data-type': type,
        class: `relative w-full rounded-xl overflow-hidden my-6 border border-white/10 bg-black/20 ${ratioClass}`,
      },
      [
        'iframe',
        mergeAttributes(HTMLAttributes, {
          class: 'absolute inset-0 w-full h-full border-0',
          allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
          allowfullscreen: 'true',
        }),
      ],
    ];
  },
});
