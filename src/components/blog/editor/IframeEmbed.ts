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
        parseHTML: (element) => element.getAttribute('src') || element.getAttribute('data-href'),
      },
      title: {
        default: 'Embed',
      },
      type: {
        default: 'generic', // 'youtube', 'vimeo', 'twitter', 'instagram', 'facebook', 'generic'
        parseHTML: (element) =>
          element.getAttribute('data-type') ||
          (element.classList.contains('fb-post') ? 'facebook' : 'generic'),
      }
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div.fb-post[data-href]',
      },
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

    // Facebook posts render via the official Page Plugin markup (div.fb-post +
    // page-wide SDK script), not an iframe — the SDK's XFBML parser hydrates
    // this div client-side, comment thread included.
    if (type === 'facebook') {
      return [
        'div',
        {
          class: 'fb-post my-6 mx-auto',
          'data-href': HTMLAttributes.src,
          'data-show-text': 'true',
        },
      ];
    }

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
