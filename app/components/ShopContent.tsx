"use client";
import Image from "next/image";
import Link from "next/link";
import { ArrowIcon } from "../ArrowIcon";

export function ShopContent() {
  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="font-bebas text-4xl sm:text-5xl text-gray-900 dark:text-white mb-8">
          Shop
        </h1>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Shirt Card */}
          <div className="bg-neutral-100 dark:bg-neutral-900 rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800">
            <div className="relative aspect-square">
              <Image
                src="/images/merch/exhibit-psd-merch.JPG"
                alt="Exhibit PSD Shirt"
                fill
                className="object-cover"
              />
              <div className="absolute top-4 right-4 px-3 py-1.5 bg-orange-500 text-white text-sm font-medium rounded-full">
                At Shows Only
              </div>
            </div>
            <div className="p-6">
              <h2 className="font-bebas text-2xl text-gray-900 dark:text-white mb-1">
                Exhibit PSD Shirt
              </h2>
              <p className="text-neutral-600 dark:text-neutral-400 text-sm mb-4">
                My first design, a decade in the making. Available at live shows.
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                $30
              </p>
              <Link
                href="/live"
                className="inline-flex items-center gap-2 text-orange-500 hover:text-orange-400 transition-colors text-sm font-medium"
              >
                See upcoming shows
                <ArrowIcon />
              </Link>
            </div>
          </div>

          {/* Music Pack Card */}
          <div className="bg-gradient-to-br from-orange-500/10 to-pink-500/10 dark:from-orange-500/20 dark:to-pink-500/20 rounded-2xl overflow-hidden border border-orange-200 dark:border-orange-900/50">
            <div className="relative aspect-square bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center">
              <div className="text-center text-white px-6">
                <div className="font-bebas text-6xl leading-none mb-2">6 SONGS</div>
                <div className="text-lg opacity-90">+ Lyricbook PDF</div>
              </div>
            </div>
            <div className="p-6">
              <h2 className="font-bebas text-2xl text-gray-900 dark:text-white mb-1">
                Singles & 16s Pack
              </h2>
              <p className="text-neutral-600 dark:text-neutral-400 text-sm mb-4">
                Digital download with mp3s and lyricbook. Free with any patron tier.
              </p>
              <div className="flex items-center gap-2 mb-4">
                <span className="line-through text-neutral-500 text-lg">$10</span>
                <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-pink-500">
                  FREE
                </span>
                <span className="text-sm text-neutral-500">for patrons</span>
              </div>
              <Link
                href="/patron"
                className="w-full py-3 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-400 hover:to-pink-400 text-white rounded-xl font-medium text-center transition-colors flex items-center justify-center gap-2"
              >
                Become my patron
                <ArrowIcon />
              </Link>
            </div>
          </div>
        </div>

        {/* Info section */}
        <div className="mt-12 p-6 bg-neutral-100 dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800">
          <h3 className="font-bebas text-xl text-gray-900 dark:text-white mb-2">
            Why Patron-Only?
          </h3>
          <p className="text-neutral-600 dark:text-neutral-400 text-sm leading-relaxed">
            Every patron gets the complete music pack immediately after signing up, plus exclusive access to new releases,
            community events, and more. It's my way of saying thank you for supporting independent music.
          </p>
        </div>
      </div>
    </div>
  );
}
