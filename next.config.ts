/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config:any) => {
    config.externals.push({
      'three/examples/jsm/controls/DeviceOrientationControls': 'null',
      'three/examples/js/libs/stats.min': 'null',
    });
    return config;
  },
}

module.exports = nextConfig;
