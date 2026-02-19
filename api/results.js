import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sql = neon(process.env.DATABASE_URL);
  const showDetails = req.query.key === 'hellas2026';

  // Get tally
  const tally = await sql`
    SELECT route, COUNT(*)::int as count FROM votes GROUP BY route
  `;

  const tallyMap = {};
  for (const row of tally) {
    tallyMap[row.route] = row.count;
  }

  // Get voters
  const allVotes = await sql`
    SELECT voter_name, route FROM votes ORDER BY voted_at
  `;

  const voters = {};
  for (const v of allVotes) {
    if (!voters[v.route]) voters[v.route] = [];
    voters[v.route].push(v.voter_name);
  }

  const response = { tally: tallyMap, voters, total: allVotes.length };

  if (showDetails) {
    response.votes = Object.fromEntries(
      allVotes.map(v => [v.voter_name.toLowerCase(), v.route])
    );
  }

  return res.status(200).json(response);
}
