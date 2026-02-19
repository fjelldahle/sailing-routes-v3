import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sql = neon(process.env.DATABASE_URL);

  // Get tally
  const tally = await sql`
    SELECT route_id, COUNT(*)::int as count FROM votes GROUP BY route_id
  `;

  const tallyMap = {};
  for (const row of tally) {
    tallyMap[row.route_id] = row.count;
  }

  // Get voters
  const allVotes = await sql`
    SELECT name, route_id FROM votes ORDER BY voted_at
  `;

  const voters = {};
  for (const v of allVotes) {
    if (!voters[v.route_id]) voters[v.route_id] = [];
    voters[v.route_id].push(v.name);
  }

  return res.status(200).json({
    tally: tallyMap,
    voters,
    total: allVotes.length,
  });
}
