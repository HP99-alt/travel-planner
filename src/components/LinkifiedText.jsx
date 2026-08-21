import React from 'react';

// 支持所有常见的 http, https, www 链接
const URL_REGEX = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;

export default function LinkifiedText({ text }) {
  if (!text) return null;

  const parts = text.split(URL_REGEX);

  return (
    <span>
      {parts.map((part, index) => {
        if (part.match(URL_REGEX)) {
          // 如果是以 www. 开头但没带 http(s)，自动补齐开头的 https://
          const href = part.startsWith('http') ? part : `https://${part}`;

          return (
            <a
              key={index}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: '#38bdf8', // 漂亮的浅蓝色，适合暗黑模式
                textDecoration: 'underline',
                wordBreak: 'break-all', // 防止长链接溢出卡片
                cursor: 'pointer'
              }}
              onClick={(e) => e.stopPropagation()} // 防止触发拖拽或编辑事件
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
