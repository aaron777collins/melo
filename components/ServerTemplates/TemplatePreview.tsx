/**
 * Template Preview Component
 * 
 * Displays a preview of a server template showing the channel structure
 * and layout that will be created when the template is applied.
 */

"use client";

import React from "react";
import { Hash, Volume2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import type { 
  ServerTemplate,
  TemplatePreviewProps,
  CategoryDefinition,
  ChannelDefinition 
} from "@/lib/matrix/types/templates";

// =============================================================================
// Helper Components
// =============================================================================

interface ChannelItemProps {
  channel: ChannelDefinition;
  categoryName: string;
}

function ChannelItem({ channel, categoryName }: ChannelItemProps) {
  const getChannelIcon = () => {
    switch (channel.type) {
      case "voice":
        return <Volume2 className="w-4 h-4 text-muted-foreground" />;
      case "announcement":
        return (
          <div className="w-4 h-4 flex items-center justify-center">
            <div className="w-2 h-2 bg-yellow-500 rounded-full" title="Announcement Channel" />
          </div>
        );
      case "text":
      default:
        return <Hash className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <div 
      className="flex items-center gap-2 text-sm py-1 px-2 rounded hover:bg-accent/50 transition-colors"
      data-testid={`channel-${channel.name}`}
    >
      {getChannelIcon()}
      <span className="font-mono text-foreground">{channel.name}</span>
      {channel.encrypted && (
        <div 
          className="w-3 h-3 bg-green-500 rounded-full flex-shrink-0" 
          title="End-to-end encrypted"
        />
      )}
      {channel.topic && (
        <span className="text-xs text-muted-foreground ml-auto truncate max-w-[120px]">
          {channel.topic}
        </span>
      )}
    </div>
  );
}

interface CategorySectionProps {
  category: CategoryDefinition;
}

function CategorySection({ category }: CategorySectionProps) {
  return (
    <div className="space-y-2" data-testid={`category-${category.name}`}>
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <span className="select-none">{category.name}</span>
        <div className="h-px bg-border flex-1" />
        <span className="text-xs bg-muted px-2 py-1 rounded">
          {category.channels.length} channel{category.channels.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="space-y-1 ml-4">
        {category.channels
          .sort((a, b) => a.order - b.order)
          .map((channel, channelIndex) => (
            <ChannelItem
              key={channelIndex}
              channel={channel}
              categoryName={category.name}
            />
          ))}
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function TemplatePreview({ 
  template, 
  className, 
  detailed = false 
}: TemplatePreviewProps) {
  const totalChannels = template.structure.categories.reduce(
    (total, category) => total + category.channels.length,
    0
  );

  const voiceChannels = template.structure.categories.reduce(
    (total, category) => total + category.channels.filter(c => c.type === "voice").length,
    0
  );

  const textChannels = totalChannels - voiceChannels;

  return (
    <Card className={cn("h-fit", className)} data-testid="template-preview">
      <CardHeader>
        <CardTitle className="flex items-center gap-2" data-testid="preview-title">
          <span className="text-lg">{template.icon}</span>
          {template.name} Preview
        </CardTitle>
        <CardDescription>
          Channel structure for this template
        </CardDescription>
        
        {detailed && (
          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
            <div className="flex items-center gap-1">
              <Hash className="w-3 h-3" />
              <span>{textChannels} text</span>
            </div>
            {voiceChannels > 0 && (
              <div className="flex items-center gap-1">
                <Volume2 className="w-3 h-3" />
                <span>{voiceChannels} voice</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded-full" />
              <span>{template.structure.server.encrypted ? 'Encrypted' : 'Public'}</span>
            </div>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4 max-h-96 overflow-y-auto">
        {template.structure.categories
          .sort((a, b) => a.order - b.order)
          .map((category, categoryIndex) => (
            <CategorySection
              key={categoryIndex}
              category={category}
            />
          ))}
          
        {template.structure.categories.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <div className="text-2xl mb-2">📋</div>
            <p className="text-sm">No channels configured</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Compact Preview Variant
// =============================================================================

export function CompactTemplatePreview({ template, className }: TemplatePreviewProps) {
  const totalChannels = template.structure.categories.reduce(
    (total, category) => total + category.channels.length,
    0
  );

  const categories = template.structure.categories.length;

  return (
    <div 
      className={cn("p-3 bg-muted/50 rounded-lg space-y-2", className)}
      data-testid="compact-template-preview"
    >
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm">{template.name}</span>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{categories} categories</span>
          <span>•</span>
          <span>{totalChannels} channels</span>
        </div>
      </div>
      
      <div className="space-y-1">
        {template.structure.categories
          .sort((a, b) => a.order - b.order)
          .slice(0, 3) // Show only first 3 categories in compact view
          .map((category, index) => (
            <div key={index} className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-medium">{category.name}</span>
              <span className="text-xs">({category.channels.length})</span>
            </div>
          ))}
        
        {template.structure.categories.length > 3 && (
          <div className="text-xs text-muted-foreground">
            +{template.structure.categories.length - 3} more categories
          </div>
        )}
      </div>
    </div>
  );
}

export default TemplatePreview;