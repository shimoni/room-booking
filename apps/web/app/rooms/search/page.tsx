import LogoIcon from '@/components/logo-icon';
import SearchForm from '@/components/search-form';
import Session from '@/components/session';
import { searchRooms } from '@/server/rooms.server';
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
import { Suspense } from 'react';

interface SearchPageProps {
  searchParams: Promise<{
    location?: string;
    checkIn?: string;
    checkOut?: string;
    capacity?: string;
    minPrice?: string;
    maxPrice?: string;
    cursor?: string;
  }>;
}

async function SearchResults({
  params,
}: {
  params: SearchPageProps['searchParams'];
}) {
  const searchParams = await params;
  const results = await searchRooms({
    location: searchParams.location,
    checkIn: searchParams.checkIn,
    checkOut: searchParams.checkOut,
    capacity: searchParams.capacity
      ? parseInt(searchParams.capacity)
      : undefined,
    minPrice: searchParams.minPrice
      ? parseInt(searchParams.minPrice)
      : undefined,
    maxPrice: searchParams.maxPrice
      ? parseInt(searchParams.maxPrice)
      : undefined,
    cursor: searchParams.cursor ? parseInt(searchParams.cursor) : undefined,
  });

  if (results.rooms.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-muted-foreground">
          No rooms found matching your criteria
        </p>
        <Button asChild className="mt-4">
          <Link href="/">Try a different search</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {results.rooms.map((room) => (
          <Card
            key={room.id}
            className="overflow-hidden hover:shadow-lg transition-shadow"
          >
            <div className="aspect-video bg-muted relative">
              {room.images && room.images.length > 0 ? (
                <img
                  src={room.images[0]}
                  alt={room.title}
                  className="object-cover w-full h-full"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-muted-foreground">No image</span>
                </div>
              )}
            </div>
            <CardHeader>
              <CardTitle className="line-clamp-1">{room.title}</CardTitle>
              <CardDescription className="line-clamp-2">
                {room.description || 'No description'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {room.location.city}, {room.location.country}
                </p>
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-bold">${room.price}</span>
                  <span className="text-sm text-muted-foreground">/ night</span>
                </div>
                <p className="text-sm">Capacity: {room.capacity} guests</p>
                <Button asChild className="w-full mt-4">
                  <Link href={`/rooms/${room.id}`}>View Details</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {results.pagination.hasMore && (
        <div className="flex justify-center mt-8">
          <Button asChild variant="outline">
            <Link
              href={`/rooms/search?${new URLSearchParams({
                ...searchParams,
                cursor: results.pagination.nextCursor?.toString() || '',
              }).toString()}`}
            >
              Load More
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;

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
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">Search Rooms</h1>

          {/* Search Filters */}
          <SearchForm
            variant="search"
            defaultValues={{
              location: params.location,
              checkIn: params.checkIn,
              checkOut: params.checkOut,
              capacity: params.capacity,
            }}
          />
        </div>

        <Suspense
          fallback={<div className="text-center py-12">Loading results...</div>}
        >
          <SearchResults params={searchParams} />
        </Suspense>
      </div>
    </section>
  );
}
