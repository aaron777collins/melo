import React, { useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Switch } from '@/components/ui/switch';
import { Info } from 'lucide-react';

interface HomeserverToggleProps {
  configuredHomeserver: string;
  onHomeserverChange: (homeserver: string) => void;
  disabled?: boolean;
}

export function HomeserverToggle({
  configuredHomeserver, 
  onHomeserverChange, 
  disabled = false
}: HomeserverToggleProps) {
  // By default, use the configured homeserver
  const [isMatrixOrgSelected, setIsMatrixOrgSelected] = useState(false);

  const toggleHomeserver = (checked: boolean) => {
    setIsMatrixOrgSelected(checked);
    const selectedHomeserver = checked ? 'https://matrix.org' : configuredHomeserver;
    onHomeserverChange(selectedHomeserver);
  };

  // Get display names for homeservers
  const getHomeserverDisplayName = (url: string) => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <Switch
        id="homeserver-toggle"
        checked={isMatrixOrgSelected}
        onCheckedChange={toggleHomeserver}
        disabled={disabled}
        data-testid="homeserver-toggle"
      />
      <label 
        htmlFor="homeserver-toggle" 
        className="text-sm font-medium text-zinc-300 flex items-center gap-2"
      >
        Switch to Matrix.org
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-4 w-4 text-zinc-500 hover:text-zinc-300" />
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[250px] bg-zinc-800 text-zinc-300 border-zinc-700 shadow-lg">
              <p>
                By default, you'll register on {getHomeserverDisplayName(configuredHomeserver)}. 
                Switching to Matrix.org provides a public, community-run homeserver. 
                Note: Matrix.org may have different policies and registration requirements.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </label>
    </div>
  );
}