namespace api.Game;

public sealed record CombatResult(bool AttackerWon, int AttackerSurvivors, int DefenderSurvivors);
