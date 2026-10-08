import React from 'react';
import type { Signal } from '../lib/format';

interface Props {
  signal: Signal;
  size?: number;
  className?: string;
}

// State is carried by shape before color: ▲ buy, ◆ watch, ▼ pass, ○ no call.
// Each shape stays distinct in grayscale and at peripheral-vision size. A same-color
// stroke with round joins softens the corners the way a filled symbol glyph does.
const SignalShape: React.FC<Props> = ({ signal, size = 24, className }) => {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    className: `signal-shape${className ? ` ${className}` : ''}`,
    'aria-hidden': true,
    focusable: false,
  } as const;
  const solid = { fill: 'currentColor', stroke: 'currentColor', strokeWidth: 2.5, strokeLinejoin: 'round' } as const;

  switch (signal) {
    case 'GREEN':
      return (
        <svg {...common}>
          <path d="M12 3.75 21 19.75H3Z" {...solid} />
        </svg>
      );
    case 'YELLOW':
      return (
        <svg {...common}>
          <path d="M12 2.75 21.25 12 12 21.25 2.75 12Z" {...solid} />
        </svg>
      );
    case 'RED':
      return (
        <svg {...common}>
          <path d="M12 20.25 3 4.25h18Z" {...solid} />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.25" fill="none" stroke="currentColor" strokeWidth="3.25" />
        </svg>
      );
  }
};

export default SignalShape;
