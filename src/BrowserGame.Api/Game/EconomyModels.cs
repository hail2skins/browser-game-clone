namespace api.Game;

public sealed record ResourceCost(int Wood, int Clay, int Iron);

public sealed record ProductionRates(int WoodPerHour, int ClayPerHour, int IronPerHour);
