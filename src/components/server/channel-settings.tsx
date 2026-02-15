import React, { useState } from 'react';
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Settings, Shield } from 'lucide-react';
import { SLOWMODE_DURATION_OPTIONS } from '@/src/types/channel';
import { ChannelPermissions } from '@/src/components/server/channel-permissions';

const channelSettingsSchema = z.object({
  slowmodeDuration: z.number().min(0).max(900),
});

type ChannelSettingsFormValues = z.infer<typeof channelSettingsSchema>;

interface ChannelSettingsProps {
  channelId: string;
  currentUserId: string;
  initialSlowmodeDuration?: number;
  onSlowmodeUpdate: (duration: number) => Promise<void>;
}

export function ChannelSettings({ 
  channelId,
  currentUserId,
  initialSlowmodeDuration = 0, 
  onSlowmodeUpdate 
}: ChannelSettingsProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  const form = useForm<ChannelSettingsFormValues>({
    resolver: zodResolver(channelSettingsSchema),
    defaultValues: {
      slowmodeDuration: initialSlowmodeDuration,
    },
  });

  const handleSubmit = async (values: ChannelSettingsFormValues) => {
    setIsUpdating(true);
    try {
      await onSlowmodeUpdate(values.slowmodeDuration);
      form.reset(values);
    } catch (error) {
      form.setError('slowmodeDuration', {
        type: 'manual',
        message: 'Failed to update slowmode. Please try again.',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Permissions
          </TabsTrigger>
        </TabsList>

        {/* General Settings Tab */}
        <TabsContent value="general">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="slowmodeDuration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Channel Slowmode</FormLabel>
                    <FormDescription>
                      Limit how frequently users can send messages in this channel.
                    </FormDescription>
                    <Select
                      onValueChange={(value) => field.onChange(Number(value))}
                      value={field.value.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select slowmode duration" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SLOWMODE_DURATION_OPTIONS.map((option) => (
                          <SelectItem 
                            key={option.value} 
                            value={option.value.toString()}
                          >
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button 
                type="submit" 
                disabled={!form.formState.isDirty || isUpdating}
              >
                {isUpdating ? 'Updating...' : 'Save Changes'}
              </Button>
            </form>
          </Form>
        </TabsContent>

        {/* Permissions Tab */}
        <TabsContent value="permissions">
          <ChannelPermissions 
            channelId={channelId}
            currentUserId={currentUserId}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}