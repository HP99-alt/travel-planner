import React from 'react';

const URL_REGEX = /(https?:\/\/[^\s]+)/g;

export default function LinkifiedText({ text }) {
  if (!text) return null;

  const parts = text.split(URL_REGEX);

  return (
    <span>
      {parts.map((part, index) => {
        if (part.match(URL_REGEX)) {
          return (
            <a
              key={index}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#0066cc', textDecoration: 'underline' }}
              onClick={(e) => e.stopPropagation()}
            >
              {part}
            </a>
          );
        }
        return part;
      })}
    </span>
  );
}
