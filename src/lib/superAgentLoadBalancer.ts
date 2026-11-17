import { supabase } from '@/lib/supabase';

export async function getLeastLoadedSuperAgentId(): Promise<string | null> {
  try {
    // 1. Fetch all super agents safely
    const { data: superAgents, error: saError } = await supabase
      .from('super_agents')
      .select('id');

    if (saError) {
      console.error('Super agent fetch error:', saError.message);
      return null;
    }

    if (!superAgents || superAgents.length === 0) {
      console.warn('No super agents found in database.');
      return null;
    }

    let leastLoadedId = superAgents[0].id;
    let minLoad = Infinity;

    // 2. Evaluate load for each agent concurrently or safely in a loop
    for (const agent of superAgents) {
      try {
        const { count, error: countError } = await supabase
          .from('transaction_requests')
          .select('*', { count: 'exact', head: true })
          .eq('super_agent_id', agent.id)
          .eq('status', 'pending');

        if (countError) {
          console.warn(`Could not fetch load for agent ${agent.id}:`, countError.message);
          continue;
        }

        const currentLoad = count || 0;
        if (currentLoad < minLoad) {
          minLoad = currentLoad;
          leastLoadedId = agent.id;
        }
      } catch (innerErr) {
        console.error(`Error evaluating agent ${agent.id}:`, innerErr);
      }
    }

    return leastLoadedId;
  } catch (err) {
    console.error('Unexpected fatal error in getLeastLoadedSuperAgentId:', err);
    return null;
  }
}