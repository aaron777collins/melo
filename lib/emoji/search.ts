// Emoji search utility for HAOS

// Import a comprehensive emoji dataset
import emojis from './emoji-data.json';

export interface EmojiEntry {
  name: string;
  emoji: string;
  keywords: string[];
}

export function searchEmojis(query: string, limit: number = 10): EmojiEntry[] {
  // Trim the query and remove the colon
  const cleanQuery = query.toLowerCase().replace(/^:/, '');
  
  if (!cleanQuery) return [];

  // Performance-optimized search
  const matchedEmojis = emojis.filter(emoji => 
    emoji.name.toLowerCase().includes(cleanQuery) || 
    emoji.keywords.some(keyword => keyword.includes(cleanQuery))
  ).slice(0, limit);

  return matchedEmojis;
}

export function replaceEmojiShortcode(text: string): string {
  return text.replace(/:(\w+):/g, (match, emojiName) => {
    const found = emojis.find(e => e.name.toLowerCase() === emojiName.toLowerCase());
    return found ? found.emoji : match;
  });
}