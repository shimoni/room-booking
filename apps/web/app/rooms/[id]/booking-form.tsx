'use client';

import { createBooking } from '@/server/bookings.server';
import { Button } from '@repo/shadcn/button';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/shadcn/card';
import { Input } from '@repo/shadcn/input';
import { Label } from '@repo/shadcn/label';
import { useAction } from 'next-safe-action/hooks';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface BookingFormProps {
  roomId: number;
  pricePerNight: number;
}

export default function BookingForm({
  roomId,
  pricePerNight,
}: BookingFormProps) {
  const router = useRouter();
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const { execute, isExecuting } = useAction(createBooking, {
    onSuccess: () => {
      setIsSuccess(true);
    },
    onError: ({ error: actionError }) => {
      setError(actionError.serverError || 'Failed to create booking');
    },
  });

  const calculateTotalPrice = () => {
    if (!checkIn || !checkOut) return 0;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const nights = Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
    );
    return nights > 0 ? nights * pricePerNight : 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkIn || !checkOut) {
      setError('Please select check-in and check-out dates');
      return;
    }

    setError(null);
    execute({
      roomId,
      checkIn,
      checkOut,
      guests,
    });
  };

  const totalPrice = calculateTotalPrice();
  const nights = totalPrice > 0 ? Math.ceil(totalPrice / pricePerNight) : 0;

  // Show success message after booking
  if (isSuccess) {
    return (
      <Card className="sticky top-4">
        <CardHeader>
          <CardTitle className="text-green-600">
            🎉 Booking Confirmed!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg space-y-2">
            <p className="text-sm text-green-800 dark:text-green-200">
              Your booking has been successfully confirmed!
            </p>
            <p className="text-sm text-green-700 dark:text-green-300">
              We&apos;ve sent a confirmation to your email.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <p className="text-sm text-muted-foreground text-center">
              Planning another vacation?
            </p>
            <div className="flex flex-col gap-2">
              <Button asChild className="w-full">
                <Link href="/rooms/search">Search More Rooms</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="/">Go to Home</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="sticky top-4">
      <CardHeader>
        <CardTitle>Book This Room</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-destructive/10 text-destructive text-sm rounded-md">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="checkIn">Check-in</Label>
            <Input
              id="checkIn"
              type="date"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              required
              disabled={isExecuting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="checkOut">Check-out</Label>
            <Input
              id="checkOut"
              type="date"
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              min={checkIn || new Date().toISOString().split('T')[0]}
              required
              disabled={isExecuting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="guests">Guests</Label>
            <Input
              id="guests"
              type="number"
              value={guests}
              onChange={(e) => setGuests(parseInt(e.target.value) || 1)}
              min={1}
              required
              disabled={isExecuting}
            />
          </div>

          {totalPrice > 0 && (
            <div className="pt-4 border-t space-y-2">
              <div className="flex justify-between text-sm">
                <span>
                  ${pricePerNight} x {nights} nights
                </span>
                <span>${totalPrice}</span>
              </div>
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>${totalPrice}</span>
              </div>
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isExecuting || totalPrice <= 0}
          >
            {isExecuting ? 'Booking...' : 'Book Now'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
