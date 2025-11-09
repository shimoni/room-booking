import LogoIcon from '@/components/logo-icon';
import SearchForm from '@/components/search-form';
import Session from '@/components/session';
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

          <SearchForm variant="home" />
        </div>
      </div>
    </section>
  );
};

export default Page;
