'use client';

import LocationAutocomplete from '@/components/location-autocomplete';
import { Button } from '@repo/shadcn/button';
import { Card, CardContent } from '@repo/shadcn/card';
import { Input } from '@repo/shadcn/input';
import { Label } from '@repo/shadcn/label';
import { useRouter } from 'next/navigation';
import { FormEvent } from 'react';

interface SearchFormProps {
  defaultValues?: {
    location?: string;
    checkIn?: string;
    checkOut?: string;
    capacity?: string;
  };
  variant?: 'home' | 'search';
}

export default function SearchForm({
  defaultValues = {},
  variant = 'home',
}: SearchFormProps) {
  const router = useRouter();

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Build search params
    const formData = new FormData(e.currentTarget);
    const params = new URLSearchParams();

    formData.forEach((value, key) => {
      if (value && value.toString().trim()) {
        params.append(key, value.toString());
      }
    });

    router.push(`/rooms/search?${params.toString()}`);
  };

  const handleClear = () => {
    router.push('/rooms/search');
  };

  return (
    <Card className={variant === 'home' ? 'mt-8' : ''}>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location">Location (Optional)</Label>
              <LocationAutocomplete defaultValue={defaultValues.location} />
              {variant === 'home' && (
                <p className="text-xs text-muted-foreground">
                  Leave empty to search all locations
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="checkIn">
                Check-in {variant === 'search' && '(Optional)'}
              </Label>
              <Input
                id="checkIn"
                name="checkIn"
                type="date"
                defaultValue={defaultValues.checkIn}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="checkOut">
                Check-out {variant === 'search' && '(Optional)'}
              </Label>
              <Input
                id="checkOut"
                name="checkOut"
                type="date"
                defaultValue={defaultValues.checkOut}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="capacity">Guests (Optional)</Label>
              <Input
                id="capacity"
                name="capacity"
                type="number"
                min="1"
                placeholder="Any capacity"
                defaultValue={defaultValues.capacity}
              />
            </div>
          </div>

          <div className="flex gap-4">
            <Button
              type="submit"
              size={variant === 'home' ? 'lg' : 'default'}
              className={variant === 'home' ? 'w-full md:w-auto' : ''}
            >
              {variant === 'home' ? 'Search Rooms' : 'Search'}
            </Button>
            {variant === 'search' && (
              <Button type="button" variant="outline" onClick={handleClear}>
                Clear
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
