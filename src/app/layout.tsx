import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { AppGraphProvider } from '@/contexts/AppGraphContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { FocusProvider } from '@/contexts/FocusContext'

import "./globals.css"

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
})
const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
})

export const metadata: Metadata = {
	title: "Zlitni Tree",
	description: "See whether there is another you in Zlitni's family!",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<body className={`${geistSans.variable} ${geistMono.variable}`}>
				<ThemeProvider>
					<AppGraphProvider>
						<FocusProvider>
							{children}
						</FocusProvider>
					</AppGraphProvider>
				</ThemeProvider>
			</body>
		</html>
	)
}