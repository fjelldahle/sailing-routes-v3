import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, route } = req.body || {};

  if (!name || typeof name !== 'string' || name.trim().length < 1) {
    return res.status(400).json({ error: 'Navn er påkrevd' });
  }

  if (!route || typeof route !== 'string') {
    return res.status(400).json({ error: 'Ugyldig rute' });
  }

  const sql = neon(process.env.DATABASE_URL);
  const voterName = name.trim();

  // Upsert vote (unique on name)
  await sql`
    INSERT INTO votes (name, route_id, voted_at)
    VALUES (${voterName}, ${route}, NOW())
    ON CONFLICT (name) DO UPDATE SET
      route_id = ${route},
      voted_at = NOW()
  `;

  // Get tally + voters
  const tally = await sql`
    SELECT route_id, COUNT(*)::int as count FROM votes GROUP BY route_id
  `;
  const allVotes = await sql`
    SELECT name, route_id FROM votes ORDER BY voted_at
  `;

  const tallyMap = {};
  for (const row of tally) {
    tallyMap[row.route_id] = row.count;
  }

  const voters = {};
  for (const v of allVotes) {
    if (!voters[v.route_id]) voters[v.route_id] = [];
    voters[v.route_id].push(v.name);
  }

  return res.status(200).json({
    success: true,
    tally: tallyMap,
    voters,
    voter: voterName,
  });
}
