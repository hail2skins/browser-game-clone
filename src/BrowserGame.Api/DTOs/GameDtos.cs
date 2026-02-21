namespace api.DTOs;

public record RecruitUnitsRequest(string UnitType, int Count);

public record AttackVillageRequest(Guid SourceVillageId, Guid TargetVillageId, string UnitType, int UnitCount);
