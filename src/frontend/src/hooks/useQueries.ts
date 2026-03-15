import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Match } from "../backend.d";
import { useActor } from "./useActor";

export function useGetAllMatches() {
  const { actor, isFetching } = useActor();
  return useQuery<Match[]>({
    queryKey: ["matches"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllMatches();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSaveMatch() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      team1Name: string;
      team1Score: number;
      team2Name: string;
      team2Score: number;
      overs: number;
      balls: number;
    }) => {
      if (!actor) return;
      await actor.saveMatch(
        params.team1Name,
        BigInt(params.team1Score),
        params.team2Name,
        BigInt(params.team2Score),
        BigInt(params.overs),
        BigInt(params.balls),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matches"] });
    },
  });
}
