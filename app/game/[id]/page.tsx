import { GAMES } from "@/lib/game-registry"
import GamePageClient from "./game-page-client"

export function generateStaticParams() {
  return GAMES.map((g) => ({
    id: g.id,
  }))
}

export default async function GamePage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  return <GamePageClient gameId={id} />
}
