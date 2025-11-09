import { auth } from '@/auth';
import BackNavigation from '@/components/back-navigation';
import LogoIcon from '@/components/logo-icon';
import Session from '@/components/session';
import { getRoom } from '@/server/rooms.server';
import { Button } from '@repo/shadcn/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/shadcn/card';
import { ModeSwitcher } from '@repo/shadcn/mode-switcher';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import BookingForm from './booking-form';

interface RoomPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function RoomPage({ params }: RoomPageProps) {
  const { id } = await params;
  const roomId = parseInt(id);

  if (isNaN(roomId)) {
    notFound();
  }

  const [session, room] = await Promise.all([auth(), getRoom(roomId)]);

  if (!room) {
    notFound();
  }

  return (
    <section className="min-h-dvh flex flex-col">
      <nav className="w-full flex justify-between items-center py-5 px-4 md:px-8 border-b">
        <Link href="/" className="flex items-center gap-2">
          <LogoIcon width={30} height={30} />
          <span className="font-semibold text-lg">Room Booking</span>
        </Link>
        <div className="flex items-center gap-4">
          <ModeSwitcher />
          <Session />
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <BackNavigation />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
          {/* Room Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Images */}
            {room.images && room.images.length > 0 && (
              <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                <img
                  src={room.images[0]}
                  alt={room.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Title and Location */}
            <div>
              <h1 className="text-3xl font-bold mb-2">{room.title}</h1>
              <p className="text-lg text-muted-foreground">
                {room.location.city}, {room.location.country}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {room.location.address}
              </p>
            </div>

            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle>About this room</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {room.description || 'No description available'}
                </p>
              </CardContent>
            </Card>

            {/* Amenities */}
            {room.amenities && room.amenities.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Amenities</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    {room.amenities.map((amenity, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <span className="text-sm">{amenity}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Room Info */}
            <Card>
              <CardHeader>
                <CardTitle>Room Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Capacity</span>
                  <span className="font-medium">{room.capacity} guests</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Price per night</span>
                  <span className="font-medium text-lg">${room.price}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Booking Form */}
          <div className="lg:col-span-1">
            {session ? (
              <BookingForm roomId={room.id} pricePerNight={room.price} />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Sign in to book</CardTitle>
                  <CardDescription>
                    You need to be signed in to make a booking
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild className="w-full">
                    <Link href="/auth/sign-in">Sign In</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
