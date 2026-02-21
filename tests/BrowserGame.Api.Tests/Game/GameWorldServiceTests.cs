using api.Game;
using api.Models;

namespace BrowserGame.Api.Tests.Game;

public class GameWorldServiceTests
{
    [Fact]
    public void GenerateMap_WithSameSeed_ReturnsDeterministicTiles()
    {
        var sut = new GameWorldService();

        var first = sut.GenerateMap(seed: 42, width: 12, height: 8);
        var second = sut.GenerateMap(seed: 42, width: 12, height: 8);

        Assert.Equal(first.Count, second.Count);
        Assert.Equal(first[17].Terrain, second[17].Terrain);
        Assert.Equal(first[64].Terrain, second[64].Terrain);
    }

    [Fact]
    public void AssignStartingVillage_RespectsMinimumDistance()
    {
        var sut = new GameWorldService();
        var existing = new List<Village>
        {
            new() { X = 10, Y = 10 },
            new() { X = 35, Y = 35 }
        };

        var location = sut.AssignStartingVillageLocation(existing, seed: 5, width: 50, height: 50, minimumDistance: 10);

        Assert.True(Distance(location, (10, 10)) >= 10);
        Assert.True(Distance(location, (35, 35)) >= 10);
    }

    [Fact]
    public void TickResources_AccumulatesAndRespectsWarehouseCap()
    {
        var sut = new GameWorldService();
        var now = new DateTime(2026, 2, 21, 12, 0, 0, DateTimeKind.Utc);

        var village = new Village
        {
            Wood = 990,
            Clay = 990,
            Iron = 990,
            TimberCampLevel = 3,
            ClayPitLevel = 3,
            IronMineLevel = 3,
            WarehouseLevel = 1,
            LastResourceTickAt = now.AddHours(-2)
        };

        sut.TickResources(village, now);

        Assert.Equal(1000, village.Wood);
        Assert.Equal(1000, village.Clay);
        Assert.Equal(1000, village.Iron);
        Assert.Equal(now, village.LastResourceTickAt);
    }

    [Fact]
    public void UpgradeBuilding_WhenAffordable_ConsumesResourcesAndIncreasesLevel()
    {
        var sut = new GameWorldService();
        var now = new DateTime(2026, 2, 21, 12, 0, 0, DateTimeKind.Utc);

        var village = new Village
        {
            Wood = 500,
            Clay = 500,
            Iron = 500,
            TimberCampLevel = 1,
            ClayPitLevel = 1,
            IronMineLevel = 1,
            MainBuildingLevel = 1,
            WarehouseLevel = 1,
            LastResourceTickAt = now
        };

        var upgraded = sut.TryUpgradeBuilding(village, BuildingType.TimberCamp, now);

        Assert.True(upgraded);
        Assert.Equal(2, village.TimberCampLevel);
        Assert.True(village.Wood < 500);
        Assert.True(village.Clay < 500);
        Assert.True(village.Iron < 500);
    }

    [Fact]
    public void UpgradeBuilding_WhenUnaffordable_ReturnsFalse()
    {
        var sut = new GameWorldService();
        var now = new DateTime(2026, 2, 21, 12, 0, 0, DateTimeKind.Utc);

        var village = new Village
        {
            Wood = 0,
            Clay = 0,
            Iron = 0,
            TimberCampLevel = 1,
            LastResourceTickAt = now
        };

        var upgraded = sut.TryUpgradeBuilding(village, BuildingType.TimberCamp, now);

        Assert.False(upgraded);
        Assert.Equal(1, village.TimberCampLevel);
    }

    [Fact]
    public void QueueBuildingUpgrade_WhenAffordable_CreatesTimedQueueEntry()
    {
        var sut = new GameWorldService();
        var now = new DateTime(2026, 2, 21, 12, 0, 0, DateTimeKind.Utc);
        var village = new Village
        {
            Wood = 1000,
            Clay = 1000,
            Iron = 1000,
            TimberCampLevel = 1
        };

        var queued = sut.TryQueueBuildingUpgrade(village, BuildingType.TimberCamp, now, queueDepth: 0, out var completesAt);

        Assert.True(queued);
        Assert.True(completesAt > now);
        Assert.True(village.Wood < 1000);
        Assert.True(village.Clay < 1000);
        Assert.True(village.Iron < 1000);
    }

    [Fact]
    public void QueueBuildingUpgrade_WithQueueDepth_IncreasesCompletionTime()
    {
        var sut = new GameWorldService();
        var now = new DateTime(2026, 2, 21, 12, 0, 0, DateTimeKind.Utc);
        var village = new Village
        {
            Wood = 5000,
            Clay = 5000,
            Iron = 5000,
            TimberCampLevel = 1
        };

        var firstQueued = sut.TryQueueBuildingUpgrade(village, BuildingType.TimberCamp, now, queueDepth: 0, out var firstCompletesAt);
        var secondQueued = sut.TryQueueBuildingUpgrade(village, BuildingType.ClayPit, now, queueDepth: 1, out var secondCompletesAt);

        Assert.True(firstQueued);
        Assert.True(secondQueued);
        Assert.True(secondCompletesAt > firstCompletesAt);
    }

    [Fact]
    public void CompleteQueuedBuildingUpgrade_IncrementsBuildingLevel()
    {
        var sut = new GameWorldService();
        var village = new Village
        {
            TimberCampLevel = 1
        };

        sut.CompleteQueuedBuildingUpgrade(village, BuildingType.TimberCamp);

        Assert.Equal(2, village.TimberCampLevel);
    }

    [Fact]
    public void GetUpgradeCost_ReturnsScaledCostForNextLevel()
    {
        var sut = new GameWorldService();
        var village = new Village
        {
            TimberCampLevel = 3
        };

        var cost = sut.GetUpgradeCost(village, BuildingType.TimberCamp);

        Assert.True(cost.Wood > 80);
        Assert.True(cost.Clay > 70);
        Assert.True(cost.Iron > 60);
    }

    [Fact]
    public void GetProductionPerHour_ReturnsCurrentRatesByResourceBuilding()
    {
        var sut = new GameWorldService();
        var village = new Village
        {
            TimberCampLevel = 2,
            ClayPitLevel = 4,
            IronMineLevel = 1
        };

        var rates = sut.GetProductionPerHour(village);

        Assert.Equal(75, rates.WoodPerHour);
        Assert.Equal(115, rates.ClayPerHour);
        Assert.Equal(55, rates.IronPerHour);
    }

    [Fact]
    public void GetWarehouseCapacity_ReturnsCapacityForCurrentLevel()
    {
        var sut = new GameWorldService();
        var village = new Village
        {
            WarehouseLevel = 3
        };

        var capacity = sut.GetWarehouseCapacity(village);

        Assert.Equal(2200, capacity);
    }

    private static double Distance((int X, int Y) first, (int X, int Y) second)
    {
        var dx = first.X - second.X;
        var dy = first.Y - second.Y;
        return Math.Sqrt((dx * dx) + (dy * dy));
    }
}
