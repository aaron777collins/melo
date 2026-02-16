import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';

const SUPPORT_CATEGORIES = [
  { value: 'technical', label: 'Technical Support' },
  { value: 'billing', label: 'Billing & Subscription' },
  { value: 'feature-request', label: 'Feature Request' },
  { value: 'bug-report', label: 'Bug Report' }
];

export const ContactForm: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    category: '',
    message: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.email || !formData.category || !formData.message) {
      toast({
        title: 'Validation Error',
        description: 'Please fill out all fields.',
        variant: 'destructive'
      });
      return;
    }

    // TODO: Implement actual support ticket submission
    // This would typically involve sending data to a backend service
    toast({
      title: 'Support Request Submitted',
      description: 'We will get back to you via email soon.',
      variant: 'default'
    });

    // Reset form
    setFormData({ email: '', category: '', message: '' });
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="contact-form max-w-xl mx-auto">
      <h2 className="text-2xl font-semibold mb-6">Contact Support</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block mb-2">Email Address</label>
          <Input 
            type="email" 
            id="email" 
            name="email"
            placeholder="you@example.com"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label htmlFor="category" className="block mb-2">Support Category</label>
          <Select 
            name="category"
            value={formData.category}
            onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a support category" />
            </SelectTrigger>
            <SelectContent>
              {SUPPORT_CATEGORIES.map(category => (
                <SelectItem key={category.value} value={category.value}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label htmlFor="message" className="block mb-2">Your Message</label>
          <Textarea 
            id="message" 
            name="message"
            placeholder="Describe your issue or request in detail"
            value={formData.message}
            onChange={handleChange}
            required
            rows={6}
          />
        </div>

        <Button type="submit" className="w-full">
          Submit Support Request
        </Button>
      </form>
    </div>
  );
};