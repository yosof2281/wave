// lib/fonts.js
import { Instrument_Serif, Manrope } from "next/font/google";

export const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], display: "swap" });
export const sans = Manrope({ subsets: ["latin"], display: "swap" });
