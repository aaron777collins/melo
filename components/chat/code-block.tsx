import React, { useMemo } from 'react';
import hljs from 'highlight.js/lib/core';
import 'highlight.js/styles/github.css'; // Choose a theme that matches app

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

    // Attempt to auto-detect if no language specified
    const result = hljs.highlightAuto(code, [
      'javascript', 'typescript', 'python', 
      'html', 'css', 'json', 'rust', 'go'
    ]);
    return result.language || 'plaintext';
  }, [code, language]);

  // Highlight the code
  const highlightedCode = useMemo(() => {
    try {
      const result = hljs.highlight(code, { 
        language: detectedLanguage 
      });
      return result.value;
    } catch (error) {
      // Fallback to plain text if highlighting fails
      return hljs.highlightAuto(code).value;
    }
  }, [code, detectedLanguage]);

  return (
    <pre 
      className={`haos-code-block language-${detectedLanguage} ${className}`}
      style={{
        backgroundColor: 'var(--code-background)',
        color: 'var(--code-text)',
        borderRadius: '4px',
        padding: '1rem',
        overflowX: 'auto',
        fontSize: '0.9rem',
        lineHeight: '1.4',
      }}
    >
      <code 
        className={`hljs language-${detectedLanguage}`}
        dangerouslySetInnerHTML={{ __html: highlightedCode }}
      />
    </pre>
  );
};