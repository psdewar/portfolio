export type StreamingPlatform =
  | "spotify"
  | "appleMusic"
  | "itunes"
  | "deezer"
  | "iheartradio"
  | "amazonMusic"
  | "tidal"
  | "youtubeMusic";

export const STREAMING_PLATFORM_LABELS: Record<StreamingPlatform, string> = {
  spotify: "Spotify",
  appleMusic: "Apple Music",
  itunes: "iTunes",
  deezer: "Deezer",
  iheartradio: "iHeartRadio",
  amazonMusic: "Amazon Music",
  tidal: "Tidal",
  youtubeMusic: "YouTube Music",
};

export interface StreamingLink {
  platform: StreamingPlatform;
  url: string;
}

export interface TrackData {
  id: string;
  title: string;
  artist: string;
  audioUrl: string;
  thumbnail: string;
  downloadUrl?: string;
  streamUrl?: string;
  streamingLinks?: StreamingLink[];
  duration?: number;
  releaseDate?: string;
  isrc?: string;
  upc?: string;
  label?: string;
  // Omit defaults to "hosted". "stream-only" hides the play button and surfaces
  // streaming links as the action. Add "preview-only" later for partial-clip flows.
  source?: TrackSource;
}

export type TrackSource = "hosted" | "stream-only";

// Your track data with audio URLs
// Note: You'll need to add actual MP3 files to /public/audio/ or use external URLs
export const TRACK_DATA: TrackData[] = [
  // Patron-exclusive tracks (Welcome Pack)
  {
    id: "so-good",
    title: "So Good",
    artist: "Peyt Spencer",
    audioUrl: "/api/audio/so-good",
    thumbnail: "/images/covers/so-good.jpg",
    duration: 181,
  },
  {
    id: "crg-freestyle",
    title: "Can't Rush Greatness Freestyle",
    artist: "Peyt Spencer",
    audioUrl: "/api/audio/crg-freestyle",
    thumbnail: "/images/covers/crg-freestyle.jpg",
    duration: 94,
  },
  // Public tracks
  {
    id: "patience",
    title: "Patience",
    artist: "Peyt Spencer",
    audioUrl: "/api/audio/patience",
    thumbnail:
      "https://distrokid.imgix.net/http%3A%2F%2Fgather.fandalism.com%2F817413--E7719B6C-A78A-4FA3-A3856E05A0DECA92--0--5534194--Patience.jpg?fm=jpg&q=75&w=800&s=80a8ec48e54fa6a4272145fbe4f8cc8d",
    streamUrl: "https://distrokid.com/hyperfollow/peytspencer/patience",
    streamingLinks: [
      { platform: "spotify", url: "https://open.spotify.com/album/7zFUC50o8sO0Fb6qDcVpnj" },
      { platform: "appleMusic", url: "https://music.apple.com/us/album/patience-single/1817746831?uo=4" },
      { platform: "itunes", url: "https://music.apple.com/us/album/patience-single/1817746831?uo=4&app=itunes&at=1001lry3&ct=dashboard" },
      { platform: "deezer", url: "https://www.deezer.com/album/764886711" },
      { platform: "iheartradio", url: "https://www.iheart.com/artist/id-32057783/albums/id-331349761" },
    ],
    duration: 141,
    releaseDate: "2025-09-05",
    isrc: "QZTAU2580674",
    upc: "199523655283",
    label: "Lyrist Records",
  },
  {
    id: "mula-freestyle",
    title: "Mula Freestyle",
    artist: "Peyt Spencer",
    audioUrl: "/api/audio/mula-freestyle",
    thumbnail: "/images/covers/mula.jpg",
    duration: 61,
  },
  {
    id: "safe",
    title: "Safe",
    artist: "Peyt Spencer",
    audioUrl: "/api/audio/safe",
    thumbnail:
      "https://distrokid.imgix.net/http%3A%2F%2Fgather.fandalism.com%2F817413--95FB4456-AFFC-4BBA-B35454F57AFEACD6--0--2155951--Safe.jpg?fm=jpg&q=75&w=800&s=963f71818a966ef34ce6695be91dafae",
    streamUrl: "https://distrokid.com/hyperfollow/peytspencer/safe",
    streamingLinks: [
      { platform: "spotify", url: "https://open.spotify.com/album/12i1odBPYClYYYl6VQvv8E" },
      { platform: "appleMusic", url: "https://music.apple.com/us/album/safe-single/1829361028?uo=4" },
      { platform: "itunes", url: "https://music.apple.com/us/album/safe-single/1829361028?uo=4&app=itunes&at=1001lry3&ct=dashboard" },
      { platform: "deezer", url: "https://www.deezer.com/album/794686291" },
      { platform: "iheartradio", url: "https://www.iheart.com/artist/id-32057783/albums/id-341888994" },
    ],
    duration: 137,
    releaseDate: "2025-08-08",
    isrc: "QZWFN2526887",
    upc: "199510190070",
    label: "Lyrist Records",
  },
  {
    id: "right-one",
    title: "Right One",
    artist: "Peyt Spencer",
    audioUrl: "/api/audio/right-one",
    thumbnail:
      "https://distrokid.imgix.net/http%3A%2F%2Fgather.fandalism.com%2F817413--2E4562A5-4A94-417F-B8E79FC4C167F81C--0--7059895--RightOne.jpg?fm=jpg&q=75&w=800&s=91a17d2eba0ab33e7e66cbb9ea443643",
    streamUrl: "https://distrokid.com/hyperfollow/peytspencer/right-one",
    streamingLinks: [
      { platform: "spotify", url: "https://open.spotify.com/album/55chufOJ0PSlb9Qql9OCCj" },
      { platform: "appleMusic", url: "https://music.apple.com/us/album/right-one-single/1820535333?uo=4" },
      { platform: "itunes", url: "https://music.apple.com/us/album/right-one-single/1820535333?uo=4&app=itunes&at=1001lry3&ct=dashboard" },
      { platform: "deezer", url: "https://www.deezer.com/album/771896871" },
      { platform: "iheartradio", url: "https://www.iheart.com/artist/id-32057783/albums/id-333633582" },
    ],
    duration: 135,
    releaseDate: "2025-06-20",
    isrc: "QZTB42525064",
    upc: "199520351218",
    label: "Lyrist Records",
  },
  {
    id: "where-i-wanna-be",
    title: "Where I Wanna Be",
    artist: "Peyt Spencer",
    audioUrl: "/api/audio/where-i-wanna-be",
    thumbnail:
      "https://distrokid.imgix.net/http%3A%2F%2Fgather.fandalism.com%2F817413--A0B1CB84-B25F-4D2D-9C327C33C11F567E--0--2456000--COVER5.jpg?fm=jpg&q=75&w=800&s=6a5ae0521975c2961d5d92519de8c03d",
    streamUrl: "https://distrokid.com/hyperfollow/peytspencer/where-i-wanna-be",
    streamingLinks: [
      { platform: "spotify", url: "https://open.spotify.com/album/49zBppj0FEqd2N3hjQixvL" },
      { platform: "appleMusic", url: "https://music.apple.com/us/album/where-i-wanna-be-single/1777401369?uo=4" },
      { platform: "itunes", url: "https://music.apple.com/us/album/where-i-wanna-be-single/1777401369?uo=4&app=itunes&at=1001lry3&ct=dashboard" },
      { platform: "deezer", url: "https://www.deezer.com/album/664501871" },
      { platform: "iheartradio", url: "https://www.iheart.com/artist/id-32057783/albums/id-296768734" },
    ],
    duration: 173,
    releaseDate: "2024-11-08",
    isrc: "QZWFW2494826",
    upc: "198879560043",
    label: "Lyrist Records",
  },
  {
    id: "critical-race-theory",
    title: "Critical Race Theory",
    artist: "Peyt Spencer",
    source: "stream-only",
    audioUrl: "/api/audio/critical-race-theory",
    thumbnail:
      "https://distrokid.imgix.net/http%3A%2F%2Fgather.fandalism.com%2F817413--B18841A8-9A82-4802-AFDCD18E90A862B2--1599661443477--CRT2HD.jpg?fm=jpg&q=75&w=800&s=7fff4afae1ff89a3377a51d11677beb1",
    streamUrl: "https://distrokid.com/hyperfollow/peytspencer/critical-race-theory",
    streamingLinks: [
      { platform: "spotify", url: "https://open.spotify.com/album/6TGbIu246Yc6heVHo7xImX" },
      { platform: "appleMusic", url: "https://music.apple.com/us/album/critical-race-theory-single/1531634847?uo=4" },
      { platform: "itunes", url: "https://music.apple.com/us/album/critical-race-theory-single/1531634847?uo=4&app=itunes&at=1001lry3&ct=dashboard" },
      { platform: "deezer", url: "https://www.deezer.com/album/173116772" },
      { platform: "iheartradio", url: "https://www.iheart.com/artist/id-32057783/albums/id-111204117" },
    ],
    releaseDate: "2020-09-11",
    label: "Lyrist Records",
  },
  {
    id: "better-days",
    title: "Better Days",
    artist: "Peyt Spencer",
    source: "stream-only",
    audioUrl: "/api/audio/better-days",
    thumbnail:
      "https://distrokid.imgix.net/http%3A%2F%2Fgather.fandalism.com%2F817413--EF18880B-ADEA-42AB-AE111E4C3BFF353C--1576131163403--BetterDays.png?fm=jpg&q=75&w=800&s=281230a8f09faa3af7001b15d0e172c1",
    streamUrl: "https://distrokid.com/hyperfollow/peytspencer/better-days",
    streamingLinks: [
      { platform: "spotify", url: "https://open.spotify.com/album/38oEwZwJFlma0R4GqytOVK" },
      { platform: "appleMusic", url: "https://music.apple.com/us/album/better-days-single/1491665067?uo=4" },
      { platform: "itunes", url: "https://music.apple.com/us/album/better-days-single/1491665067?uo=4&app=itunes&at=1001lry3&ct=dashboard" },
      { platform: "deezer", url: "https://www.deezer.com/album/123194872" },
    ],
    releaseDate: "2019-12-12",
    label: "Lyrist Records",
  },
  {
    id: "bahai",
    title: "Baha'i",
    artist: "Peyt Spencer",
    source: "stream-only",
    audioUrl: "/api/audio/bahai",
    thumbnail:
      "https://distrokid.imgix.net/http%3A%2F%2Fgather.fandalism.com%2F817413--560B3DA9-4F3D-4874-97F8E29A9D568D05--1521580586925--bahai.jpg?fm=jpg&q=75&w=800&s=babfe73fe179c6bcb2215fd14c4ddfac",
    streamUrl: "https://distrokid.com/hyperfollow/peytspencer/cWLQ",
    streamingLinks: [
      { platform: "spotify", url: "https://open.spotify.com/album/7JppYT9GPUZPNo2TSWawKX" },
      { platform: "appleMusic", url: "https://music.apple.com/us/album/bahai-single/1361838144?uo=4" },
      { platform: "itunes", url: "https://itunes.apple.com/us/album/bah%C3%A1%C3%AD-single/1361838144?uo=4&app=itunes&at=1001lry3&ct=dashboard" },
      { platform: "deezer", url: "https://www.deezer.com/album/59464672" },
      { platform: "iheartradio", url: "https://www.iheart.com/artist/id-32057783/albums/id-55029217" },
    ],
    releaseDate: "2018-03-20",
    label: "Lyrist Records",
  },
];
