export interface Room {
  id: string;
  players: number;
  maxPlayers: number;
  category: string;
  owner: string;
  avatar: string;
  isPremium?: boolean;
}

export const rooms: Room[] = [
  {
    id: "777",
    players: 5,
    maxPlayers: 5,
    category: "Memes",
    owner: "JohnDoe337",
    avatar: "/avatars/frog.svg",
    isPremium: true,
  },
  {
    id: "242",
    players: 2,
    maxPlayers: 2,
    category: "Celebrities",
    owner: "KiberKotleta228",
    avatar: "/avatars/kiberkotleta228.svg",
  },
  {
    id: "001",
    players: 3,
    maxPlayers: 7,
    category: "History",
    owner: "CrossGEN",
    avatar: "/avatars/crossgen.svg",
    isPremium: true,
  },
  {
    id: "933",
    players: 1,
    maxPlayers: 6,
    category: "Gaming",
    owner: "CyberFox",
    avatar: "/avatars/frog.svg",
  },
];