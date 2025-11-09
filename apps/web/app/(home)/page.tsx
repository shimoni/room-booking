import LocationAutocomplete from '@/components/location-autocomplete';
import LogoIcon from '@/components/logo-icon';
import Session from '@/components/session';
import { Button } from '@repo/shadcn/button';
import { Card, CardContent } from '@repo/shadcn/card';
import { Input } from '@repo/shadcn/input';
import { Label } from '@repo/shadcn/label';
import { ModeSwitcher } from '@repo/shadcn/mode-switcher';
import Link from 'next/link';

const Page = async () => {
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

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 md:py-20">
        <div className="max-w-4xl w-full text-center space-y-6">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            Find Your Perfect Room
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Discover and book amazing rooms around the world
          </p>

          <Card className="mt-8">
            <CardContent className="p-6">
              <form action="/rooms/search" method="GET" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="location">Location (Optional)</Label>
                    <LocationAutocomplete />
                    <p className="text-xs text-muted-foreground">
                      Leave empty to search all locations
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="checkIn">Check-in (Optional)</Label>
                    <Input id="checkIn" name="checkIn" type="date" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="checkOut">Check-out (Optional)</Label>
                    <Input id="checkOut" name="checkOut" type="date" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="capacity">Guests (Optional)</Label>
                    <Input
                      id="capacity"
                      name="capacity"
                      type="number"
                      min="1"
                      placeholder="Any capacity"
                    />
                  </div>
                </div>

                <Button type="submit" size="lg" className="w-full md:w-auto">
                  Search Rooms
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default Page;
