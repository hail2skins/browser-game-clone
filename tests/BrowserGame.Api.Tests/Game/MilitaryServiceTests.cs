using api.Game;
using api.Models;

namespace BrowserGame.Api.Tests.Game;

public class MilitaryServiceTests
{
    [Fact]
    public void GetMovementArrival_UsesDistanceAndUnitSpeed()
    {
        var sut = new GameWorldService();
        var departedAt = new DateTime(2026, 2, 21, 12, 0, 0, DateTimeKind.Utc);
        var source = new Village { X = 10, Y = 10 };
        var target = new Village { X = 13, Y = 14 };

        var arrival = sut.GetMovementArrival(departedAt, source, target, UnitType.Spearman);

        Assert.Equal(departedAt.AddMinutes(26), arrival);
    }

    [Fact]
    public void TryRecruitUnits_WhenAffordable_ConsumesResourcesAndAddsTroops()
    {
        var sut = new GameWorldService();
        var village = new Village
        {
            Wood = 300,
            Clay = 300,
            Iron = 300,
            Spearmen = 0,
            Swordsmen = 0
        };

        var ok = sut.TryRecruitUnits(village, UnitType.Spearman, count: 5);

        Assert.True(ok);
        Assert.Equal(5, village.Spearmen);
        Assert.True(village.Wood < 300);
        Assert.True(village.Clay < 300);
        Assert.True(village.Iron < 300);
    }

    [Fact]
    public void ResolveCombat_AttackerCanWinAndKeepsSurvivors()
    {
        var sut = new GameWorldService();

        var result = sut.ResolveCombat(
            new Army(UnitType.Spearman, 30),
            new Army(UnitType.Swordsman, 10));

        Assert.True(result.AttackerWon);
        Assert.True(result.AttackerSurvivors > 0);
        Assert.Equal(0, result.DefenderSurvivors);
    }
}
