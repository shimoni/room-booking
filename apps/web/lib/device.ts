import { headers } from 'next/headers';
import { UAParser } from 'ua-parser-js';

type DeviceInfo = {
  device_type: string | undefined;
  device_os: string | undefined;
  device_name: string | undefined;
  browser: string | undefined;
  ip: string;
  location: string;
  userAgent: string | null;
};

/**
 * Fetches the IP address and approximate location using the ipinfo.io API.
 *
 * @returns An object containing `ip` and `location` (city/region).
 */
export const getLocationFromIp = async (): Promise<{
  ip: string;
  location: string;
}> => {
  const res = await fetch('https://ipinfo.io/json', { cache: 'no-store' });
  if (!res.ok) return { ip: 'unknown', location: 'unknown' };
  const data = await res.json();
  return {
    ip: data.ip,
    location: `${data.city}/${data.region}`,
  };
};

/**
 * Parses device and browser information from the User-Agent header,
 * and enriches it with IP and location data.
 *
 * @returns A `DeviceInfo` object containing device type, OS, name,
 * browser, IP address, location, and the full user-agent string.
 */
export const getDeviceInfo = async (): Promise<DeviceInfo> => {
  const header = await headers();
  const userAgent = header.get('user-agent') || '';
  const parser = new UAParser(userAgent);

  // Add timeout and error handling for external API call
  let ip = 'unknown';
  let location = 'unknown';

  try {
    const result = await Promise.race([
      getLocationFromIp(),
      new Promise<{ ip: string; location: string }>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 3000),
      ),
    ]);
    ip = result.ip;
    location = result.location;
  } catch (error) {
    console.warn('Failed to fetch IP/location info:', error);
    // Continue with default values
  }

  return {
    device_type: parser.getDevice().type,
    device_os: parser.getOS().name,
    device_name: parser.getDevice().model,
    browser: parser.getBrowser().name,
    ip,
    location,
    userAgent,
  };
};
