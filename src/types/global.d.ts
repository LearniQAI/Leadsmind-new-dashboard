import React from 'react';

declare global {
  var process: {
    env: {
      [key: string]: string | undefined;
    };
  };
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}
