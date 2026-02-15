import React, { useState, useEffect, useRef } from 'react';
import { searchEmojis, EmojiEntry } from '../../lib/emoji/search';

interface EmojiAutocompleteProps {
  query: string;
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export const EmojiAutocomplete: React.FC<EmojiAutocompleteProps> = ({ 
  query, 
  onSelect, 
  onClose 
}) => {
  const [matchedEmojis, setMatchedEmojis] = useState<EmojiEntry[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Performance optimization: search with 50ms max
    const start = performance.now();
    const results = searchEmojis(query);
    const end = performance.now();
    
    console.log(`Emoji search took ${end - start}ms`);
    setMatchedEmojis(results);
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            (prev + 1) % Math.max(1, matchedEmojis.length)
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : matchedEmojis.length - 1
          );
          break;
        case 'Enter':
          if (matchedEmojis[selectedIndex]) {
            onSelect(matchedEmojis[selectedIndex].emoji);
          }
          break;
        case 'Escape':
          onClose();
          break;
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current && 
        !containerRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [matchedEmojis, selectedIndex, onSelect, onClose]);

  if (matchedEmojis.length === 0) return null;

  return (
    <div 
      ref={containerRef}
      className="emoji-autocomplete"
      style={{
        position: 'absolute',
        zIndex: 1000,
        backgroundColor: 'white',
        border: '1px solid #ccc',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        maxHeight: '200px',
        overflowY: 'auto'
      }}
    >
      {matchedEmojis.map((emoji, index) => (
        <div
          key={emoji.name}
          onClick={() => onSelect(emoji.emoji)}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '5px 10px',
            cursor: 'pointer',
            backgroundColor: index === selectedIndex ? '#f0f0f0' : 'white'
          }}
        >
          <span style={{ marginRight: '10px' }}>{emoji.emoji}</span>
          <span>{emoji.name}</span>
        </div>
      ))}
    </div>
  );
};