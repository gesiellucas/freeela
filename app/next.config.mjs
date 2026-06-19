/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@event-calendar/core',
    '@event-calendar/day-grid',
    '@event-calendar/time-grid',
    '@event-calendar/resource-time-grid',
    '@event-calendar/interaction'
  ]
};

export default nextConfig;

