// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Lets other devices on your Wi-Fi (like your iPhone) use the dev server
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*"],
};

module.exports = nextConfig;
