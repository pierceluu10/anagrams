/** Swagrams — tabular score list (optional / legacy) */

type Player = { id: string; display_name: string; score: number; is_ready: boolean; connected: boolean };

export function Scoreboard({ players }: { players: Player[] }) {
  return (
    <table className="score-table">
      <tbody>
        {players.map((player) => (
          <tr key={player.id}>
            <td>{player.display_name}</td>
            <td>{player.score} pts</td>
            <td className="subtle">{player.connected ? (player.is_ready ? "Ready" : "Waiting") : "Offline"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
