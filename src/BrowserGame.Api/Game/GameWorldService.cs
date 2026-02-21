using api.Models;

namespace api.Game;

public class GameWorldService
{
    public DateTime GetMovementArrival(DateTime departedAtUtc, Village source, Village target, UnitType unitType)
    {
        var distance = Distance((source.X, source.Y), (target.X, target.Y));
        var secondsPerTile = unitType switch
        {
            UnitType.Spearman => 312,
            UnitType.Swordsman => 360,
            _ => 360
        };

        var travelSeconds = (int)Math.Ceiling(distance * secondsPerTile);
        return departedAtUtc.AddSeconds(travelSeconds);
    }

    public bool TryRecruitUnits(Village village, UnitType unitType, int count)
    {
        if (count <= 0)
        {
            return false;
        }

        var (woodCost, clayCost, ironCost) = RecruitmentCost(unitType);
        var totalWood = woodCost * count;
        var totalClay = clayCost * count;
        var totalIron = ironCost * count;

        if (village.Wood < totalWood || village.Clay < totalClay || village.Iron < totalIron)
        {
            return false;
        }

        village.Wood -= totalWood;
        village.Clay -= totalClay;
        village.Iron -= totalIron;

        switch (unitType)
        {
            case UnitType.Spearman:
                village.Spearmen += count;
                break;
            case UnitType.Swordsman:
                village.Swordsmen += count;
                break;
            default:
                return false;
        }

        return true;
    }

    public CombatResult ResolveCombat(Army attackingArmy, Army defendingArmy)
    {
        if (attackingArmy.Count <= 0)
        {
            return new CombatResult(false, 0, defendingArmy.Count);
        }

        if (defendingArmy.Count <= 0)
        {
            return new CombatResult(true, attackingArmy.Count, 0);
        }

        var attackerPower = attackingArmy.Count * Attack(attackingArmy.UnitType);
        var defenderPower = defendingArmy.Count * Defense(defendingArmy.UnitType);

        if (attackerPower > defenderPower)
        {
            var attackerLossRatio = Math.Clamp(defenderPower / attackerPower, 0.05, 0.95);
            var attackerSurvivors = Math.Max(0, attackingArmy.Count - (int)Math.Round(attackingArmy.Count * attackerLossRatio));
            return new CombatResult(true, attackerSurvivors, 0);
        }

        var defenderLossRatio = Math.Clamp(attackerPower / defenderPower, 0.05, 0.95);
        var defenderSurvivors = Math.Max(0, defendingArmy.Count - (int)Math.Round(defendingArmy.Count * defenderLossRatio));
        return new CombatResult(false, 0, defenderSurvivors);
    }

    public IReadOnlyList<MapTile> GenerateMap(int seed, int width, int height)
    {
        var tiles = new List<MapTile>(width * height);

        for (var y = 0; y < height; y++)
        {
            for (var x = 0; x < width; x++)
            {
                var roll = Hash(seed, x, y) % 100;
                var terrain = roll switch
                {
                    < 55 => TerrainType.Plains,
                    < 78 => TerrainType.Forest,
                    < 94 => TerrainType.Hills,
                    _ => TerrainType.Water
                };

                tiles.Add(new MapTile(x, y, terrain));
            }
        }

        return tiles;
    }

    public (int X, int Y) AssignStartingVillageLocation(
        IReadOnlyCollection<Village> existingVillages,
        int seed,
        int width,
        int height,
        int minimumDistance)
    {
        for (var attempt = 0; attempt < 4_000; attempt++)
        {
            var x = Math.Abs(Hash(seed, attempt, width)) % width;
            var y = Math.Abs(Hash(seed, attempt, height)) % height;

            if (existingVillages.All(v => Distance((x, y), (v.X, v.Y)) >= minimumDistance))
            {
                return (x, y);
            }
        }

        return (width / 2, height / 2);
    }

    public void TickResources(Village village, DateTime nowUtc)
    {
        if (village.LastResourceTickAt > nowUtc)
        {
            village.LastResourceTickAt = nowUtc;
            return;
        }

        var elapsedSeconds = (nowUtc - village.LastResourceTickAt).TotalSeconds;
        if (elapsedSeconds < 1)
        {
            village.LastResourceTickAt = nowUtc;
            return;
        }

        var capacity = WarehouseCapacity(village.WarehouseLevel);
        village.Wood = Math.Min(capacity, village.Wood + Produce(village.TimberCampLevel, elapsedSeconds));
        village.Clay = Math.Min(capacity, village.Clay + Produce(village.ClayPitLevel, elapsedSeconds));
        village.Iron = Math.Min(capacity, village.Iron + Produce(village.IronMineLevel, elapsedSeconds));
        village.LastResourceTickAt = nowUtc;
    }

    public bool TryUpgradeBuilding(Village village, BuildingType buildingType, DateTime nowUtc)
    {
        TickResources(village, nowUtc);

        var currentLevel = GetLevel(village, buildingType);
        var nextLevel = currentLevel + 1;

        var woodCost = Cost(baseValue: 80, nextLevel);
        var clayCost = Cost(baseValue: 70, nextLevel);
        var ironCost = Cost(baseValue: 60, nextLevel);

        if (village.Wood < woodCost || village.Clay < clayCost || village.Iron < ironCost)
        {
            return false;
        }

        village.Wood -= woodCost;
        village.Clay -= clayCost;
        village.Iron -= ironCost;

        SetLevel(village, buildingType, nextLevel);
        return true;
    }

    public bool TryQueueBuildingUpgrade(
        Village village,
        BuildingType buildingType,
        DateTime nowUtc,
        int queueDepth,
        out DateTime completesAtUtc)
    {
        completesAtUtc = nowUtc;
        TickResources(village, nowUtc);

        var currentLevel = GetLevel(village, buildingType);
        var nextLevel = currentLevel + 1;

        var woodCost = Cost(baseValue: 80, nextLevel);
        var clayCost = Cost(baseValue: 70, nextLevel);
        var ironCost = Cost(baseValue: 60, nextLevel);

        if (village.Wood < woodCost || village.Clay < clayCost || village.Iron < ironCost)
        {
            return false;
        }

        village.Wood -= woodCost;
        village.Clay -= clayCost;
        village.Iron -= ironCost;

        var baseMinutes = 2 + (nextLevel * 2);
        var queuePenaltyMinutes = Math.Max(0, queueDepth) * 2;
        completesAtUtc = nowUtc.AddMinutes(baseMinutes + queuePenaltyMinutes);
        return true;
    }

    public void CompleteQueuedBuildingUpgrade(Village village, BuildingType buildingType)
    {
        var level = GetLevel(village, buildingType);
        SetLevel(village, buildingType, level + 1);
    }

    private static int Produce(int level, double elapsedSeconds)
    {
        var perHour = 35 + (level * 20);
        return (int)Math.Floor((perHour / 3600d) * elapsedSeconds);
    }

    private static int WarehouseCapacity(int level)
    {
        return 1_000 + ((level - 1) * 600);
    }

    private static int GetLevel(Village village, BuildingType buildingType)
    {
        return buildingType switch
        {
            BuildingType.MainBuilding => village.MainBuildingLevel,
            BuildingType.TimberCamp => village.TimberCampLevel,
            BuildingType.ClayPit => village.ClayPitLevel,
            BuildingType.IronMine => village.IronMineLevel,
            BuildingType.Warehouse => village.WarehouseLevel,
            _ => throw new ArgumentOutOfRangeException(nameof(buildingType), buildingType, "Unsupported building type")
        };
    }

    private static void SetLevel(Village village, BuildingType buildingType, int level)
    {
        switch (buildingType)
        {
            case BuildingType.MainBuilding:
                village.MainBuildingLevel = level;
                break;
            case BuildingType.TimberCamp:
                village.TimberCampLevel = level;
                break;
            case BuildingType.ClayPit:
                village.ClayPitLevel = level;
                break;
            case BuildingType.IronMine:
                village.IronMineLevel = level;
                break;
            case BuildingType.Warehouse:
                village.WarehouseLevel = level;
                break;
            default:
                throw new ArgumentOutOfRangeException(nameof(buildingType), buildingType, "Unsupported building type");
        }
    }

    private static int Cost(int baseValue, int level)
    {
        return (int)Math.Ceiling(baseValue * Math.Pow(1.25, level - 1));
    }

    private static int Attack(UnitType unitType)
    {
        return unitType switch
        {
            UnitType.Spearman => 20,
            UnitType.Swordsman => 25,
            _ => 10
        };
    }

    private static int Defense(UnitType unitType)
    {
        return unitType switch
        {
            UnitType.Spearman => 15,
            UnitType.Swordsman => 50,
            _ => 15
        };
    }

    private static (int Wood, int Clay, int Iron) RecruitmentCost(UnitType unitType)
    {
        return unitType switch
        {
            UnitType.Spearman => (50, 30, 10),
            UnitType.Swordsman => (30, 30, 70),
            _ => (50, 30, 10)
        };
    }

    private static int Hash(int seed, int x, int y)
    {
        unchecked
        {
            var value = seed;
            value = (value * 397) ^ x;
            value = (value * 397) ^ y;
            return value;
        }
    }

    private static double Distance((int X, int Y) first, (int X, int Y) second)
    {
        var dx = first.X - second.X;
        var dy = first.Y - second.Y;
        return Math.Sqrt((dx * dx) + (dy * dy));
    }
}
