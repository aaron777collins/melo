import React, { useMemo } from 'react';
import hljs from 'highlight.js/lib/core';

// Import specific language syntaxes
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import html from 'highlight.js/lib/languages/xml';
import css from 'highlight.js/lib/languages/css';
import json from 'highlight.js/lib/languages/json';
import rust from 'highlight.js/lib/languages/rust';
import go from 'highlight.js/lib/languages/go';

// Register the languages
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('python', python);
hljs.registerLanguage('html', html);
hljs.registerLanguage('css', css);
hljs.registerLanguage('json', json);
hljs.registerLanguage('rust', rust);
hljs.registerLanguage('go', go);

// Language aliases and detection
const LANGUAGE_ALIASES: Record<string, string> = {
  js: 'javascript',
  ts: 'typescript',
  py: 'python',
  jsx: 'javascript',
  tsx: 'typescript',
};

interface CodeBlockProps {
  code: string;
  language?: string;
  className?: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ 
  code, 
  language, 
  className = '' 
}) => {
  // Detect language if not provided
  const detectedLanguage = useMemo(() => {
    if (language) {
      // Use provided language or its alias
      return LANGUAGE_ALIASES[language] || language;
    }

    // Simple language detection based on code content
    if (code.includes('function') || code.includes('=>') || code.includes('const ')) {
      return 'javascript';
    }
    if (code.includes('def ') || code.includes('import ') || code.includes('from ')) {
      return 'python';
    }
    if (code.includes('<') && code.includes('>')) {
      return 'html';
    }
    if (code.includes('{') && code.includes(':')) {
      return 'json';
    }

    return 'plaintext';
  }, [code, language]);

  // Highlight the code
  const highlightedCode = useMemo(() => {
    try {
      if (detectedLanguage === 'plaintext' || !hljs.getLanguage(detectedLanguage)) {
        return hljs.highlightAuto(code).value;
      }
      return hljs.highlight(code, { language: detectedLanguage }).value;
    } catch (error) {
      console.warn('Code highlighting failed:', error);
      return code;
    }
  }, [code, detectedLanguage]);

  return (
    <div className={`code-block-wrapper ${className}`}>
      <div className="code-block-header flex items-center justify-between bg-[#f8f8f8] dark:bg-[#2d2d2d] px-3 py-2 border-b border-[#e5e5e5] dark:border-[#404040]">
        <span className="text-xs text-[#666] dark:text-[#ccc] font-mono">
          {detectedLanguage === 'plaintext' ? 'code' : detectedLanguage}
        </span>
        <button
          onClick={() => navigator.clipboard.writeText(code)}
          className="text-xs text-[#666] dark:text-[#ccc] hover:text-[#000] dark:hover:text-[#fff] transition-colors"
        >
          Copy
        </button>
      </div>
      <pre className="hljs overflow-x-auto bg-[#ffffff] dark:bg-[#1e1e1e] p-4 text-sm leading-relaxed">
        <code 
          dangerouslySetInnerHTML={{ __html: highlightedCode }}
          className="hljs"
        />
      </pre>
    </div>
  );
};

// CSS-in-JS styles for highlight.js (replaces external CSS import)
const codeBlockStyles = `
  .hljs {
    display: block;
    overflow-x: auto;
    padding: 0.5em;
    background: white;
    color: #333;
  }
  
  .dark .hljs {
    background: #1e1e1e;
    color: #d4d4d4;
  }
  
  .hljs-comment, .hljs-quote {
    color: #998;
    font-style: italic;
  }
  
  .hljs-keyword, .hljs-selector-tag, .hljs-subst {
    color: #333;
    font-weight: bold;
  }
  
  .dark .hljs-keyword, .dark .hljs-selector-tag, .dark .hljs-subst {
    color: #569cd6;
  }
  
  .hljs-number, .hljs-literal, .hljs-variable, .hljs-template-variable, .hljs-tag .hljs-attr {
    color: #008080;
  }
  
  .dark .hljs-number, .dark .hljs-literal, .dark .hljs-variable, .dark .hljs-template-variable, .dark .hljs-tag .hljs-attr {
    color: #b5cea8;
  }
  
  .hljs-string, .hljs-doctag {
    color: #d14;
  }
  
  .dark .hljs-string, .dark .hljs-doctag {
    color: #ce9178;
  }
  
  .hljs-title, .hljs-section, .hljs-selector-id {
    color: #900;
    font-weight: bold;
  }
  
  .dark .hljs-title, .dark .hljs-section, .dark .hljs-selector-id {
    color: #dcdcaa;
  }
`;

// Inject styles
if (typeof document !== 'undefined' && !document.getElementById('code-block-styles')) {
  const styleElement = document.createElement('style');
  styleElement.id = 'code-block-styles';
  styleElement.textContent = codeBlockStyles;
  document.head.appendChild(styleElement);
}

export default CodeBlock;