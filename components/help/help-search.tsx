import React from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface HelpSearchProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
}

export const HelpSearch: React.FC<HelpSearchProps> = ({
  value, 
  onChange, 
  placeholder = "Search help..."
}) => {
  return (
    <div className="relative">
      <Search 
        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" 
        size={20} 
      />
      <Input 
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="pl-10 py-2 text-base"
      />
    </div>
  );
};