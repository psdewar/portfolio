export interface TrackData {
  id: string;
  title: string;
  artist: string;
  audioUrl: string;
  thumbnail: string;
  downloadUrl?: string;
  streamUrl?: string;
  duration?: number;
}

// Your track data with audio URLs
// Note: You'll need to add actual MP3 files to /public/audio/ or use external URLs
export const TRACK_DATA: TrackData[] = [
  {
    id: "patience",
    title: "Patience",
    artist: "Peyt Spencer",
    audioUrl: "/api/audio/patience",
    thumbnail:
      "https://distrokid.imgix.net/http%3A%2F%2Fgather.fandalism.com%2F817413--E7719B6C-A78A-4FA3-A3856E05A0DECA92--0--5534194--Patience.jpg?fm=jpg&q=75&w=800&s=80a8ec48e54fa6a4272145fbe4f8cc8d",
    streamUrl: "https://distrokid.com/hyperfollow/peytspencer/patience",
    duration: 180, // 3 minutes
  },
  {
    id: "mula-freestyle",
    title: "Mula Freestyle",
    artist: "Peyt Spencer",
    audioUrl: "/api/audio/mula-freestyle",
    thumbnail: "/images/mula-dinner-cover.jpg",
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
  },
  {
    id: "critical-race-theory",
    title: "Critical Race Theory",
    artist: "Peyt Spencer",
    audioUrl: "/api/audio/critical-race-theory",
    thumbnail:
      "https://distrokid.imgix.net/http%3A%2F%2Fgather.fandalism.com%2F817413--B18841A8-9A82-4802-AFDCD18E90A862B2--1599661443477--CRT2HD.jpg?fm=jpg&q=75&w=800&s=7fff4afae1ff89a3377a51d11677beb1",
    streamUrl: "https://distrokid.com/hyperfollow/peytspencer/critical-race-theory",
    duration: 165,
  },
  {
    id: "better-days",
    title: "Better Days",
    artist: "Peyt Spencer",
    audioUrl: "/api/audio/better-days",
    thumbnail:
      "https://distrokid.imgix.net/http%3A%2F%2Fgather.fandalism.com%2F817413--EF18880B-ADEA-42AB-AE111E4C3BFF353C--1576131163403--BetterDays.png?fm=jpg&q=75&w=800&s=281230a8f09faa3af7001b15d0e172c1",
    streamUrl: "https://distrokid.com/hyperfollow/peytspencer/better-days",
    duration: 201,
  },
];
