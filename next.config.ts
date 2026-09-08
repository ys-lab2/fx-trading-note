import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const nextConfig: NextConfig = {
  // LAN上の別端末（スマホ実機・自宅PCなど）からdevサーバーへアクセスして動作確認するために許可
  // IPはDHCPで変わりうるため、実機のIPが変わったらここも合わせて更新すること
  allowedDevOrigins: ["192.168.2.40", "192.168.11.20"],
};

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

export default withSerwist(nextConfig);
