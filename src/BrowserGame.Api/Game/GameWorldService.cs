using api.Models;

namespace api.Game;

public class GameWorldService
{
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
