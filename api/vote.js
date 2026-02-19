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
  const voterKey = name.trim().toLowerCase();
  const voterName = name.trim();

  // Upsert vote
  await sql`
    INSERT INTO votes (voter_name, voter_key, route, voted_at, updated_at)
    VALUES (${voterName}, ${voterKey}, ${route}, NOW(), NOW())
    ON CONFLICT (voter_key) DO UPDATE SET
      route = ${route},
      voter_name = ${voterName},
      updated_at = NOW()
  `;

  // Get tally + voters
  const tally = await sql`
    SELECT route, COUNT(*)::int as count FROM votes GROUP BY route
  `;
  const allVotes = await sql`
    SELECT voter_name, route FROM votes ORDER BY voted_at
  `;

  const tallyMap = {};
  for (const row of tally) {
    tallyMap[row.route] = row.count;
  }

  const voters = {};
  for (const v of allVotes) {
    if (!voters[v.route]) voters[v.route] = [];
    voters[v.route].push(v.voter_name);
  }

  return res.status(200).json({
    success: true,
    tally: tallyMap,
    voters,
    voter: voterName,
  });
}
