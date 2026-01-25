export interface TrackData {
  id: string;
  title: string;
  artist: string;
  audioUrl: string;
  thumbnail: string;
  downloadUrl?: string;
  streamUrl?: string;
  duration?: number;
  releaseDate?: string;
  isrc?: string;
  upc?: string;
  label?: string;
}

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
    duration: 180,
  },
  {
    id: "crg-freestyle",
    title: "Can't Rush Greatness Freestyle",
    artist: "Peyt Spencer",
    audioUrl: "/api/audio/crg-freestyle",
    thumbnail: "/images/covers/crg-freestyle.jpg",
    duration: 150,
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
    duration: 180,
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
    duration: 150,
  },
  {
    id: "safe",
    title: "Safe",
    artist: "Peyt Spencer",
    audioUrl: "/api/audio/safe",
    thumbnail:
      "https://distrokid.imgix.net/http%3A%2F%2Fgather.fandalism.com%2F817413--95FB4456-AFFC-4BBA-B35454F57AFEACD6--0--2155951--Safe.jpg?fm=jpg&q=75&w=800&s=963f71818a966ef34ce6695be91dafae",
    streamUrl: "https://distrokid.com/hyperfollow/peytspencer/safe",
    duration: 195,
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
    duration: 210,
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
    duration: 188,
    releaseDate: "2024-11-08",
    isrc: "QZWFW2494826",
    upc: "198879560043",
    label: "Lyrist Records",
  },
];
