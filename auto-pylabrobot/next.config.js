/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

module.exports = {
  ...nextConfig,
  webpack: (config) => {
    config.module.rules.push({
      test: /\.txt$/,
      use: 'raw-loader',
    });
    return config;
  },
};
